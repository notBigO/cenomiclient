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
  Animated,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";

const { width, height } = Dimensions.get("window");

// Markdown renderer component (unchanged)
const MarkdownText = ({ text, style }) => {
  const parts = [];
  let lastIndex = 0;
  let key = 0;

  const boldRegex = /\*\*(.*?)\*\*/g;
  let boldMatch;
  while ((boldMatch = boldRegex.exec(text)) !== null) {
    if (boldMatch.index > lastIndex) {
      parts.push(
        <Text key={key++} style={style}>
          {text.substring(lastIndex, boldMatch.index)}
        </Text>
      );
    }
    parts.push(
      <Text key={key++} style={[style, { fontWeight: "bold" }]}>
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
  let italicKey = 0;

  while ((italicMatch = italicRegex.exec(processedText)) !== null) {
    if (italicMatch.index > lastIndex) {
      italicParts.push(
        <Text key={italicKey++} style={style}>
          {processedText.substring(lastIndex, italicMatch.index)}
        </Text>
      );
    }
    italicParts.push(
      <Text key={italicKey++} style={[style, { fontStyle: "italic" }]}>
        {italicMatch[1]}
      </Text>
    );
    lastIndex = italicMatch.index + italicMatch[0].length;
  }

  if (lastIndex < processedText.length) {
    italicParts.push(
      <Text key={italicKey++} style={style}>
        {processedText.substring(lastIndex)}
      </Text>
    );
  }

  if (parts.length > 0) {
    if (italicParts.length > 0) {
      parts.push(...italicParts);
    } else {
      parts.push(
        <Text key={key++} style={style}>
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

// Typing Indicator Component
const TypingIndicator = ({ dot1, dot2, dot3, currentTheme }) => (
  <View style={{ flexDirection: "row", alignItems: "center" }}>
    {[dot1, dot2, dot3].map((dot, index) => (
      <Animated.View
        key={index}
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: currentTheme.text,
          marginHorizontal: 2,
          opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
          transform: [
            { translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
          ],
        }}
      />
    ))}
  </View>
);

// Animated Message Component
const AnimatedMessage = ({ msg, index, currentTheme, language }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [index, anim]);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        marginBottom: 15,
        alignItems: msg.isUser ? "flex-end" : "flex-start",
        maxWidth: width * 0.75,
      }}
    >
      <View
        style={{
          backgroundColor: msg.isUser
            ? currentTheme.userMessageBg
            : msg.text.includes("only store owners") || msg.text.includes("Invalid tenant")
            ? currentTheme.errorBg
            : currentTheme.messageBg,
          borderRadius: 20,
          padding: 12,
          borderTopLeftRadius: msg.isUser ? 20 : 0,
          borderTopRightRadius: msg.isUser ? 0 : 20,
        }}
      >
        {msg.isUser ? (
          <Text
            style={{
              color: currentTheme.userMessageText,
              fontFamily: "Poppins-Regular",
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
              textAlign: language === "ar" ? "right" : "left",
            }}
          />
        )}
      </View>
      {msg.timestamp && (
        <Text style={{ color: currentTheme.placeholder, fontSize: 10, marginTop: 5, fontFamily: "Poppins-Regular" }}>
          {msg.timestamp}
        </Text>
      )}
    </Animated.View>
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
  const scrollViewRef = useRef(null);
  const router = useRouter();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
  });

  // Theme definitions
  const themes = {
    light: {
      background: "#FFFFFF",
      text: "#333333",
      primary: "#8A2BE2",
      secondary: "#E6E6FA",
      messageBg: "#F3E5F5",
      userMessageBg: "#8A2BE2",
      userMessageText: "#FFFFFF",
      border: "#E0E0E0",
      placeholder: "#9E9E9E",
      errorBg: "#FFEBEE",
    },
    dark: {
      background: "#121212",
      text: "#E0E0E0",
      primary: "#BB86FC",
      secondary: "#302030",
      messageBg: "#2D1F3D",
      userMessageBg: "#BB86FC",
      userMessageText: "#121212",
      border: "#3D3D3D",
      placeholder: "#9E9E9E",
      errorBg: "#432222",
    },
  };

  const currentTheme = isDarkMode ? themes.dark : themes.light;

  // Effects
  useEffect(() => {
    AsyncStorage.getItem("darkMode").then((value) => {
      setIsDarkMode(value === "true");
    });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    loadUserData();
    fetchMalls();
  }, []);

  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.stagger(200, [
          Animated.sequence([
            Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dot1, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dot2, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dot3, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }
  }, [isTyping, dot1, dot2, dot3]);

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
    if (storedMallId) setSelectedMall(storedMallId);
  };

  const fetchMalls = async () => {
    try {
      const response = await fetch("http://192.168.1.29:8000/malls");
      const data = await response.json();
      setMalls(data);
      if (data.length > 0 && !selectedMall) {
        setSelectedMall(data[0].mall_id);
        await AsyncStorage.setItem("selected_mall_id", data[0].mall_id);
      }
    } catch (error) {
      console.error("Error fetching malls:", error);
    }
  };

  const handleMallChange = async (mallId) => {
    setSelectedMall(mallId);
    await AsyncStorage.setItem("selected_mall_id", mallId);
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
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([...messages, userMessage]);
    setMessage("");
    setIsTyping(true);

    try {
      const backendUrl =
        activeTab === "chat" ? "http://192.168.1.29:8000/chat" : "http://192.168.1.29:8000/tenant/update";
      const requestBody = {
        text: userMessage.text,
        user_id: userId || undefined,
        session_id: sessionId,
        language: language,
        mall_id: parseInt(selectedMall),
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
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
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
      chat: ["Where is Trendy Threads?", "What offers are available?", "Check my loyalty points"],
      update: ["Add 20% off on shoes", "Update store location to Level 2", "Show my store details"],
    },
    ar: {
      chat: ["أين تقع تريندي ثريدز؟", "ما هي العروض المتوفرة؟", "تحقق من نقاط ولائي"],
      update: ["أضف خصم 20% على الأحذية", "تحديث موقع المتجر إلى الطابق الثاني", "عرض تفاصيل متجري"],
    },
  };

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: currentTheme.background }}>
        <Text style={{ color: currentTheme.text, fontFamily: "Poppins-Regular" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.background }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], flex: 1 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 15,
              borderBottomWidth: 1,
              borderBottomColor: currentTheme.border,
              backgroundColor: currentTheme.background,
              elevation: 4,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDarkMode ? 0.3 : 0.1,
              shadowRadius: 4,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: currentTheme.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="chatbubble-ellipses" size={20} color={currentTheme.userMessageText} />
              </View>
              <Text style={{ fontSize: 22, fontFamily: "Poppins-Bold", color: currentTheme.text }}>
                {language === "en" ? "Cenomi AI" : "سينومي AI"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={toggleDarkMode}
                style={{
                  marginRight: 15,
                  padding: 8,
                  backgroundColor: currentTheme.secondary,
                  borderRadius: 20,
                }}
              >
                <Ionicons name={isDarkMode ? "sunny" : "moon"} size={20} color={currentTheme.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleLanguage} style={{ marginRight: 15 }}>
                <Text style={{ color: currentTheme.text, fontFamily: "Poppins-Medium", fontSize: 16 }}>
                  {language === "en" ? "عربي" : "English"}
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
                  borderRadius: 24,
                }}
              >
                <Text style={{ color: currentTheme.userMessageText, fontFamily: "Poppins-Medium" }}>
                  {language === "en" ? (userId ? "Logout" : "Login") : userId ? "تسجيل الخروج" : "تسجيل الدخول"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Mall Selection */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: currentTheme.background }}>
            <Text style={{ color: currentTheme.text, fontFamily: "Poppins-Medium", marginBottom: 5 }}>
              {language === "en" ? "Select Mall" : "اختر المول"}
            </Text>
            <View style={{ borderWidth: 1, borderColor: currentTheme.border, borderRadius: 12, overflow: "hidden" }}>
              <Picker
                selectedValue={selectedMall}
                onValueChange={handleMallChange}
                style={{
                  height: 50,
                  width: "100%",
                  color: currentTheme.text,
                  backgroundColor: currentTheme.messageBg,
                }}
              >
                {malls.map((mall) => (
                  <Picker.Item key={mall.mall_id} label={mall.name_en} value={mall.mall_id} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Tabs for Tenants */}
          {isTenant && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
                paddingVertical: 10,
                backgroundColor: currentTheme.background,
                borderBottomWidth: 1,
                borderBottomColor: currentTheme.border,
              }}
            >
              <TouchableOpacity
                onPress={() => setActiveTab("chat")}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  backgroundColor: activeTab === "chat" ? currentTheme.primary : currentTheme.secondary,
                  borderTopLeftRadius: 20,
                  borderBottomLeftRadius: 20,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: activeTab === "chat" ? currentTheme.userMessageText : currentTheme.text,
                    fontFamily: "Poppins-Medium",
                  }}
                >
                  {language === "en" ? "Chat" : "دردشة"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab("update")}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  backgroundColor: activeTab === "update" ? currentTheme.primary : currentTheme.secondary,
                  borderTopRightRadius: 20,
                  borderBottomRightRadius: 20,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: activeTab === "update" ? currentTheme.userMessageText : currentTheme.text,
                    fontFamily: "Poppins-Medium",
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
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 2 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: currentTheme.placeholder, fontFamily: "Poppins-Regular", marginBottom: 10 }}>
                  {language === "en" ? "Try asking about:" : "جرب السؤال عن:"}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {quickPrompts[language][activeTab].map((prompt, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setMessage(prompt)}
                      style={{
                        backgroundColor: currentTheme.secondary,
                        borderRadius: 20,
                        paddingVertical: 8,
                        paddingHorizontal: 15,
                        marginRight: 10,
                        marginBottom: 10,
                      }}
                    >
                      <Text style={{ color: currentTheme.text, fontFamily: "Poppins-Regular" }}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
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
              <View style={{ marginBottom: 15, alignItems: "flex-start", maxWidth: width * 0.75 }}>
                <View
                  style={{
                    backgroundColor: currentTheme.messageBg,
                    borderRadius: 20,
                    padding: 12,
                    borderTopLeftRadius: 0,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <TypingIndicator dot1={dot1} dot2={dot2} dot3={dot3} currentTheme={currentTheme} />
                </View>
              </View>
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
                  backgroundColor: message.trim() && selectedMall ? currentTheme.primary : currentTheme.secondary,
                  borderRadius: 25,
                  padding: 12,
                  marginRight: 5,
                }}
              >
                <Ionicons name="paper-plane-outline" size={20} color={currentTheme.userMessageText} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
              <TouchableOpacity
                onPress={clearChat}
                style={{
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  backgroundColor: currentTheme.secondary,
                  borderRadius: 20,
                }}
              >
                <Text style={{ color: currentTheme.text, fontFamily: "Poppins-Medium" }}>
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
                <Text style={{ color: currentTheme.text, fontFamily: "Poppins-Medium" }}>
                  {language === "en" ? "New Session" : "ج filmmakerجديدة"}
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
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}