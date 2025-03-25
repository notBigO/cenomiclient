import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  Image, // Added for logo
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView, MotiText } from "moti";

const { width, height } = Dimensions.get("window");

// Markdown renderer component with unique keys
const MarkdownText = ({ text, style }) => {
  const parts = [];
  let lastIndex = 0;

  const boldRegex = /\*\*(.*?)\*\*/g;
  let boldMatch;
  while ((boldMatch = boldRegex.exec(text)) !== null) {
    if (boldMatch.index > lastIndex) {
      parts.push(
        <Text key={`plain-${boldMatch.index}`} style={style}>
          {text.substring(lastIndex, boldMatch.index)}
        </Text>
      );
    }
    parts.push(
      <Text
        key={`bold-${boldMatch.index}`}
        style={[style, { fontWeight: "bold" }]}
      >
        {boldMatch[1]}
      </Text>
    );
    lastIndex = boldMatch.index + boldMatch[0].length;
  }

  let processedText = text;
  if (parts.length > 0) {
    processedText = text.substring(lastIndex);
    lastIndex = 0;
  }

  const italicRegex = /\*(.*?)\*/g;
  let italicMatch;
  const italicParts = [];

  while ((italicMatch = italicRegex.exec(processedText)) !== null) {
    if (italicMatch.index > lastIndex) {
      italicParts.push(
        <Text key={`plain-italic-${italicMatch.index}`} style={style}>
          {processedText.substring(lastIndex, italicMatch.index)}
        </Text>
      );
    }
    italicParts.push(
      <Text
        key={`italic-${italicMatch.index}`}
        style={[style, { fontStyle: "italic" }]}
      >
        {italicMatch[1]}
      </Text>
    );
    lastIndex = italicMatch.index + italicMatch[0].length;
  }

  if (lastIndex < processedText.length) {
    italicParts.push(
      <Text key={`plain-end-${lastIndex}`} style={style}>
        {processedText.substring(lastIndex)}
      </Text>
    );
  }

  if (parts.length > 0) {
    if (italicParts.length > 0) {
      parts.push(...italicParts);
    } else {
      parts.push(
        <Text key={`remaining-${lastIndex}`} style={style}>
          {processedText}
        </Text>
      );
    }
    return <Text>{parts}</Text>;
  }

  if (italicParts.length > 0) {
    return <Text>{italicParts}</Text>;
  }

  return <Text style={style}>{text}</Text>;
};

// Typing Indicator Component (Using MotiView instead of Animated)
const TypingIndicator = ({ currentTheme }) => (
  <MotiView
    style={{
      flexDirection: "row",
      alignItems: "center",
      padding: 8,
    }}
  >
    {[0, 1, 2].map((index) => (
      <MotiView
        key={`dot-${index}`} // Unique key for each dot
        from={{ opacity: 0.3, translateY: 0 }}
        animate={{ opacity: 1, translateY: -4 }}
        transition={{
          type: "timing",
          duration: 300,
          loop: true,
          delay: index * 200,
        }}
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: currentTheme.text,
          marginHorizontal: 3,
        }}
      />
    ))}
  </MotiView>
);

// Animated Message Component
const AnimatedMessage = ({ msg, index, currentTheme, language }) => {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 300, delay: index * 50 }}
      style={{
        marginBottom: 15,
        alignItems: msg.isUser ? "flex-end" : "flex-start",
        maxWidth: "85%",
        alignSelf: msg.isUser ? "flex-end" : "flex-start",
      }}
    >
      <View
        style={{
          backgroundColor: msg.isUser
            ? currentTheme.userMessageBg
            : msg.text.includes("only store owners") ||
              msg.text.includes("Invalid tenant")
            ? currentTheme.errorBg
            : currentTheme.messageBg,
          borderRadius: 20,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderTopLeftRadius: msg.isUser ? 20 : 6,
          borderTopRightRadius: msg.isUser ? 6 : 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 1,
        }}
      >
        {msg.isUser ? (
          <Text
            style={{
              color: currentTheme.userMessageText,
              fontFamily: "Poppins-Regular",
              fontSize: 15,
              lineHeight: 22,
              textAlign: language === "ar" ? "right" : "left",
            }}
          >
            {msg.text}
          </Text>
        ) : (
          <MarkdownText
            text={msg.text}
            style={{
              color: currentTheme.text,
              fontFamily: "Poppins-Regular",
              fontSize: 15,
              lineHeight: 22,
              textAlign: language === "ar" ? "right" : "left",
            }}
          />
        )}
      </View>
      {msg.timestamp && (
        <Text
          style={{
            color: currentTheme.placeholder,
            fontSize: 11,
            marginTop: 4,
            marginHorizontal: 4,
            fontFamily: "Poppins-Regular",
          }}
        >
          {msg.timestamp}
        </Text>
      )}
    </MotiView>
  );
};

export default function HomeScreen() {
  // State and refs
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello, I'm Cenomi AI! 👋", isUser: false },
    { id: 2, text: "How can I help you today?", isUser: false },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [language, setLanguage] = useState("en");
  const [sessionId, setSessionId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isTenant, setIsTenant] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [malls, setMalls] = useState([]);
  const [selectedMall, setSelectedMall] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMallSelector, setShowMallSelector] = useState(false);
  const scrollViewRef = useRef(null);
  const router = useRouter();

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
  });

  // Theme definitions with more modern color palette
  const themes = {
    light: {
      background: "#FFFFFF",
      text: "#303342",
      primary: "#6C5CE7",
      secondary: "#F0F0F7",
      messageBg: "#F3F3FF",
      userMessageBg: "#6C5CE7",
      userMessageText: "#FFFFFF",
      border: "#EAEAEA",
      placeholder: "#A0A0B9",
      errorBg: "#FFEEF0",
      headerBg: "#FFFFFF",
      tabActive: "#6C5CE7",
      tabInactive: "#F0F0F7",
      inputBg: "#F5F5FA",
    },
    dark: {
      background: "#1A1A2E",
      text: "#E0E0E6",
      primary: "#8A65FF",
      secondary: "#252542",
      messageBg: "#252542",
      userMessageBg: "#8A65FF",
      userMessageText: "#FFFFFF",
      border: "#303050",
      placeholder: "#8888A0",
      errorBg: "#3F2E40",
      headerBg: "#1A1A2E",
      tabActive: "#8A65FF",
      tabInactive: "#252542",
      inputBg: "#252542",
    },
  };

  const currentTheme = isDarkMode ? themes.dark : themes.light;

  // Effects
  useEffect(() => {
    AsyncStorage.getItem("darkMode").then((value) => {
      setIsDarkMode(value === "true");
    });

    loadUserData();
    fetchMalls();
  }, []);

  useEffect(() => {
    if (isTyping) {
      // Animation is now handled by MotiView in TypingIndicator
    }
  }, [isTyping]);

  // Functional methods
  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await AsyncStorage.setItem("darkMode", newMode.toString());
  };

  const loadUserData = async () => {
    const storedLang = await AsyncStorage.getItem("language");
    const storedSessionId = await AsyncStorage.getItem("session_id");
    const storedUserId = await AsyncStorage.getItem("user_id");
    const storedMallId = await AsyncStorage.getItem("selected_mall_id");
    if (storedLang) setLanguage(storedLang);
    if (storedSessionId) setSessionId(storedSessionId);
    if (storedUserId) {
      setUserId(storedUserId);
      setIsTenant(storedUserId.startsWith("t_"));
    }
    if (storedMallId) setSelectedMall(storedMallId); // Stored as string
  };

  const fetchMalls = async () => {
    try {
      const response = await fetch("http://192.168.1.27:8000/malls");
      const data = await response.json();
      console.log(data);
      setMalls(data);
      if (data.length > 0 && !selectedMall) {
        setSelectedMall(data[0].mall_id.toString()); // Set as string
        await AsyncStorage.setItem(
          "selected_mall_id",
          data[0].mall_id.toString()
        );
      }
    } catch (error) {
      console.error("Error fetching malls:", error);
    }
  };

  const handleMallChange = async (mallId) => {
    const mallIdStr = mallId.toString(); // Ensure string
    setSelectedMall(mallIdStr);
    await AsyncStorage.setItem("selected_mall_id", mallIdStr);
    setShowMallSelector(false);
    clearChat();
  };

  const toggleLanguage = async () => {
    const newLang = language === "en" ? "ar" : "en";
    setLanguage(newLang);
    await AsyncStorage.setItem("language", newLang);
  };

  const handleSend = async () => {
    if (message.trim() === "" || !selectedMall) return;

    const userMessage = {
      id: messages.length + 1,
      text: message,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages([...messages, userMessage]);
    setMessage("");
    setIsTyping(true);

    try {
      const backendUrl =
        activeTab === "chat"
          ? "http://192.168.1.27:8000/chat"
          : "http://192.168.1.27:8000/tenant/update";
      const requestBody = {
        text: userMessage.text,
        user_id: userId || undefined,
        session_id: sessionId,
        language: language,
        mall_id: parseInt(selectedMall), // Convert to int for backend
      };

      const response = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Network response was not ok");
      }

      const data = await response.json();
      const botResponse = {
        id: messages.length + 2,
        text: data.message,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, botResponse]);
      setSessionId(data.session_id);
      await AsyncStorage.setItem("session_id", data.session_id);
    } catch (error) {
      const errorMessage = {
        id: messages.length + 2,
        text:
          error.message === "Only tenants can perform updates"
            ? "Sorry, only store owners can update details. Want to explore the mall instead?"
            : "Sorry, something went wrong. Please try again later.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        100
      );
    }
  };

  const clearChat = async () => {
    setMessages([
      { id: 1, text: "Hello, I'm Cenomi AI! 👋", isUser: false },
      { id: 2, text: "How can I help you today?", isUser: false },
    ]);
  };

  const newSession = async () => {
    setSessionId(null);
    await AsyncStorage.removeItem("session_id");
    clearChat();
  };

  const quickPrompts = {
    en: {
      chat: [
        "Where is Trendy Threads?",
        "What offers are available?",
        "Check my loyalty points",
      ],
      update: [
        "Add 20% off on shoes",
        "Update store location to Level 2",
        "Show my store details",
      ],
    },
    ar: {
      chat: [
        "أين تقع تريندي ثريدز؟",
        "ما هي العروض المتوفرة؟",
        "تحقق من نقاط ولائي",
      ],
      update: [
        "أضف خصم 20% على الأحذية",
        "تحديث موقع المتجر إلى الطابق الثاني",
        "عرض تفاصيل متجري",
      ],
    },
  };

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: currentTheme.background,
        }}
      >
        <Text
          style={{ color: currentTheme.text, fontFamily: "Poppins-Regular" }}
        >
          Loading...
        </Text>
      </View>
    );
  }

  const getCurrentMallName = () => {
    if (!selectedMall || malls.length === 0) return "Select Mall";
    const currentMall = malls.find(
      (mall) => mall.mall_id.toString() === selectedMall // String comparison
    );
    return currentMall ? currentMall.name_en : "Select Mall";
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.background }}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={currentTheme.headerBg}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 800 }}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 15,
              backgroundColor: currentTheme.headerBg,
              elevation: 4,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDarkMode ? 0.3 : 0.1,
              shadowRadius: 4,
              borderBottomColor: currentTheme.border,
              borderBottomWidth: 1,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={require("../assets/logo.png")}
                style={{
                  width: 100,
                  height: 30,
                  resizeMode: "contain",
                }}
              />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={toggleDarkMode}
                style={{
                  marginRight: 12,
                  padding: 8,
                  backgroundColor: currentTheme.secondary,
                  borderRadius: 20,
                }}
              >
                <Ionicons
                  name={isDarkMode ? "sunny" : "moon"}
                  size={18}
                  color={currentTheme.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleLanguage}
                style={{ marginRight: 12 }}
              >
                <Text
                  style={{
                    color: currentTheme.text,
                    fontFamily: "Poppins-Medium",
                    fontSize: 14,
                  }}
                >
                  {language === "en" ? "عربي" : "EN"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  await AsyncStorage.clear();
                  setUserId(null);
                  setIsTenant(false);
                  setSessionId(null);
                  setSelectedMall(null);
                  router.push("/login");
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: currentTheme.primary,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "Poppins-Medium",
                    fontSize: 14,
                  }}
                >
                  {language === "en"
                    ? userId
                      ? "Logout"
                      : "Login"
                    : userId
                    ? "تسجيل الخروج"
                    : "تسجيل الدخول"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Mall Selection Button */}
          <TouchableOpacity
            onPress={() => setShowMallSelector(!showMallSelector)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 15,
              borderBottomWidth: 1,
              borderBottomColor: currentTheme.border,
              backgroundColor: currentTheme.background,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="location-outline"
                size={18}
                color={currentTheme.primary}
                style={{ marginRight: 10 }}
              />
              <Text
                style={{
                  fontFamily: "Poppins-Medium",
                  color: currentTheme.text,
                  fontSize: 15,
                }}
              >
                {getCurrentMallName()}
              </Text>
            </View>
            <Ionicons
              name={showMallSelector ? "chevron-up" : "chevron-down"}
              size={18}
              color={currentTheme.text}
            />
          </TouchableOpacity>

          {/* Mall Selection Dropdown */}
          {showMallSelector && (
            <MotiView
              from={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ type: "timing", duration: 300 }}
              style={{
                backgroundColor: currentTheme.background,
                borderBottomWidth: 1,
                borderBottomColor: currentTheme.border,
                paddingHorizontal: 20,
                paddingBottom: 15,
              }}
            >
              {malls.map((mall) => (
                <TouchableOpacity
                  key={mall.mall_id} // Unique key from mall_id
                  onPress={() => handleMallChange(mall.mall_id)}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: currentTheme.border,
                    backgroundColor:
                      mall.mall_id.toString() === selectedMall
                        ? currentTheme.secondary
                        : "transparent",
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    marginTop: 8,
                  }}
                >
                  <Text
                    style={{
                      color:
                        mall.mall_id.toString() === selectedMall
                          ? currentTheme.primary
                          : currentTheme.text,
                      fontFamily:
                        mall.mall_id.toString() === selectedMall
                          ? "Poppins-Medium"
                          : "Poppins-Regular",
                      fontSize: 15,
                    }}
                  >
                    {mall.name_en}
                  </Text>
                </TouchableOpacity>
              ))}
            </MotiView>
          )}

          {/* Tabs for Tenants */}
          {isTenant && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
                paddingVertical: 15,
                paddingHorizontal: 20,
                backgroundColor: currentTheme.background,
                borderBottomWidth: 1,
                borderBottomColor: currentTheme.border,
              }}
            >
              <TouchableOpacity
                onPress={() => setActiveTab("chat")}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor:
                    activeTab === "chat"
                      ? currentTheme.tabActive
                      : currentTheme.tabInactive,
                  borderTopLeftRadius: 20,
                  borderBottomLeftRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                }}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={18}
                  color={activeTab === "chat" ? "#FFFFFF" : currentTheme.text}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    color: activeTab === "chat" ? "#FFFFFF" : currentTheme.text,
                    fontFamily: "Poppins-Medium",
                    fontSize: 15,
                  }}
                >
                  {language === "en" ? "Chat" : "دردشة"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab("update")}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor:
                    activeTab === "update"
                      ? currentTheme.tabActive
                      : currentTheme.tabInactive,
                  borderTopRightRadius: 20,
                  borderBottomRightRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                }}
              >
                <Feather
                  name="edit"
                  size={18}
                  color={activeTab === "update" ? "#FFFFFF" : currentTheme.text}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    color:
                      activeTab === "update" ? "#FFFFFF" : currentTheme.text,
                    fontFamily: "Poppins-Medium",
                    fontSize: 15,
                  }}
                >
                  {language === "en" ? "Update" : "تحديث"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Chat Area */}
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1, paddingHorizontal: 15, paddingTop: 15 }}
            contentContainerStyle={{ paddingBottom: 20 }}
            onContentSizeChange={() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }
          >
            {messages.length === 2 && (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", delay: 300 }}
                style={{ marginBottom: 25 }}
              >
                <Text
                  style={{
                    color: currentTheme.placeholder,
                    fontFamily: "Poppins-Medium",
                    marginBottom: 12,
                    fontSize: 15,
                  }}
                >
                  {language === "en" ? "Try asking about:" : "جرب السؤال عن:"}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {quickPrompts[language][activeTab].map((prompt, index) => (
                    <TouchableOpacity
                      key={`prompt-${index}`} // Unique key for prompts
                      onPress={() => setMessage(prompt)}
                      style={{
                        backgroundColor: currentTheme.secondary,
                        borderRadius: 20,
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        marginRight: 10,
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: currentTheme.border,
                      }}
                    >
                      <Text
                        style={{
                          color: currentTheme.text,
                          fontFamily: "Poppins-Regular",
                          fontSize: 14,
                        }}
                      >
                        {prompt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </MotiView>
            )}

            {messages.map((msg, index) => (
              <AnimatedMessage
                key={msg.id}
                msg={msg}
                index={index}
                currentTheme={currentTheme}
                language={language}
              />
            ))}

            {isTyping && (
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                style={{
                  marginBottom: 15,
                  alignItems: "flex-start",
                  maxWidth: width * 0.3,
                  backgroundColor: currentTheme.messageBg,
                  borderRadius: 20,
                  borderTopLeftRadius: 4,
                  padding: 4,
                }}
              >
                <TypingIndicator currentTheme={currentTheme} />
              </MotiView>
            )}
          </ScrollView>

          {/* Input Area */}
          <View
            style={{
              paddingHorizontal: 15,
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: currentTheme.border,
              backgroundColor: currentTheme.background,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: currentTheme.messageBg,
                borderRadius: 25,
                overflow: "hidden",
                elevation: 2,
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 15,
                  color: currentTheme.text,
                  fontFamily: "Poppins-Regular",
                  textAlign: language === "ar" ? "right" : "left",
                }}
                placeholder={
                  language === "en"
                    ? activeTab === "chat"
                      ? "Message Cenomi AI..."
                      : "Update your store..."
                    : activeTab === "chat"
                    ? "راسل سينومي AI..."
                    : "حدث متجرك..."
                }
                placeholderTextColor={currentTheme.placeholder}
                value={message}
                onChangeText={setMessage}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                multiline
                maxHeight={100}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!message.trim() || !selectedMall || isTyping}
                style={{
                  backgroundColor:
                    message.trim() && selectedMall
                      ? currentTheme.primary
                      : currentTheme.secondary,
                  borderRadius: 25,
                  padding: 12,
                  marginRight: 5,
                }}
              >
                <Ionicons
                  name="paper-plane-outline"
                  size={20}
                  color={currentTheme.userMessageText}
                />
              </TouchableOpacity>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 10,
              }}
            >
              <TouchableOpacity
                onPress={clearChat}
                style={{
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  backgroundColor: currentTheme.secondary,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{
                    color: currentTheme.text,
                    fontFamily: "Poppins-Medium",
                  }}
                >
                  {language === "en" ? "Clear Chat" : "مسح الدردشة"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={newSession}
                style={{
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  backgroundColor: currentTheme.secondary,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{
                    color: currentTheme.text,
                    fontFamily: "Poppins-Medium",
                  }}
                >
                  {language === "en" ? "New Session" : "جلسة جديدة"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text
              style={{
                color: currentTheme.placeholder,
                fontSize: 12,
                textAlign: "center",
                marginTop: 10,
                fontFamily: "Poppins-Regular",
              }}
            >
              {language === "en"
                ? "Cenomi AI assists with inquiries and updates"
                : "سينومي AI يساعد في الاستفسارات والتحديثات"}
            </Text>
          </View>
        </MotiView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
