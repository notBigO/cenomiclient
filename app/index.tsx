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
  Image,
} from "react-native";
import { useState, useEffect, useRef } from "react"; // Added useEffect import
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { MotiView } from "moti";
import { Audio } from "expo-av";
import Voice from "@react-native-voice/voice";

const { width } = Dimensions.get("window");

// Markdown renderer component
const MarkdownText = ({ text, style }) => {
  const parts = text
    .split(/(\*\*[^\*]+\*\*|\*[^\*]+\*)/g)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <Text key={index} style={[style, { fontFamily: "Poppins-Bold" }]}>
            {part.slice(2, -2)}
          </Text>
        );
      } else if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <Text key={index} style={[style, { fontStyle: "italic" }]}>
            {part.slice(1, -1)}
          </Text>
        );
      }
      return (
        <Text key={index} style={style}>
          {part}
        </Text>
      );
    });
  return <Text style={style}>{parts}</Text>;
};

// Typing Indicator Component
const TypingIndicator = ({ currentTheme }) => (
  <View style={{ flexDirection: "row", padding: 8 }}>
    <MotiView
      from={{ scale: 0.8, opacity: 0.4 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "timing", duration: 400, loop: true, delay: 0 }}
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: currentTheme.text,
        marginHorizontal: 2,
      }}
    />
    <MotiView
      from={{ scale: 0.8, opacity: 0.4 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "timing", duration: 400, loop: true, delay: 100 }}
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: currentTheme.text,
        marginHorizontal: 2,
      }}
    />
    <MotiView
      from={{ scale: 0.8, opacity: 0.4 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "timing", duration: 400, loop: true, delay: 200 }}
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: currentTheme.text,
        marginHorizontal: 2,
      }}
    />
  </View>
);

// Animated Message Component with TTS Play Button
const AnimatedMessage = ({ msg, index, currentTheme, language, playTTS }) => {
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
        flexDirection: "row",
      }}
    >
      {!msg.isUser && (
        <TouchableOpacity
          onPress={() => playTTS(msg.text)}
          style={{ marginRight: 8, padding: 8 }}
        >
          <Ionicons name="volume-high" size={20} color={currentTheme.text} />
        </TouchableOpacity>
      )}
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
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello, I'm Cenomi AI! 👋", isUser: false },
    { id: 2, text: "How can I help you today?", isUser: false },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [language, setLanguage] = useState("en");
  const [conversationId, setConversationId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isTenant, setIsTenant] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [malls, setMalls] = useState([]);
  const [selectedMall, setSelectedMall] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMallSelector, setShowMallSelector] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [autoPlayTTS, setAutoPlayTTS] = useState(false);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const scrollViewRef = useRef(null);
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
  });

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
      inputBg: "#F5F5F7",
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

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem("user_data");
      if (userData) {
        const { user_id, is_tenant } = JSON.parse(userData);
        setUserId(user_id);
        setIsTenant(is_tenant);
      }
      const convId = await AsyncStorage.getItem("conversation_id");
      if (convId) setConversationId(convId);
      const mallId = await AsyncStorage.getItem("selected_mall");
      if (mallId) setSelectedMall(mallId);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const fetchMalls = async () => {
    try {
      const response = await fetch("http://192.168.1.29:8000/malls");
      const data = await response.json();
      setMalls(data);
      if (!selectedMall && data.length > 0) {
        setSelectedMall(data[0].mall_id);
        await AsyncStorage.setItem("selected_mall", data[0].mall_id);
      }
    } catch (error) {
      console.error("Error fetching malls:", error);
    }
  };

  // Initialize user data and malls on component mount
  useEffect(() => {
    loadUserData();
    fetchMalls();
  }, []);

  // Setup Voice recognition listeners
  useEffect(() => {
    // Initialize voice recognition
    Voice.onSpeechStart = () => {
      console.log("Speech started");
    };
    Voice.onSpeechRecognized = () => {
      console.log("Speech recognized");
    };
    Voice.onSpeechEnd = () => {
      console.log("Speech ended");
      setIsRecognizing(false);
    };
    Voice.onSpeechError = (error) => {
      console.error("Speech error:", error);
      setIsRecognizing(false);
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: "Sorry, I couldn't understand your voice input. Please ensure your microphone is working and try again.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        100
      );
    };
    Voice.onSpeechResults = (event) => {
      if (event.value && event.value.length > 0) {
        const transcribedText = event.value[0];
        console.log("Speech results:", transcribedText);
        setMessage(transcribedText);
        handleSend(transcribedText);
      }
    };

    // Cleanup listeners on unmount
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const handleMallChange = async (mallId) => {
    setSelectedMall(mallId);
    setShowMallSelector(false);
    await AsyncStorage.setItem("selected_mall", mallId);
  };

  const toggleLanguage = async () => {
    const newLanguage = language === "en" ? "ar" : "en";
    setLanguage(newLanguage);
    await AsyncStorage.setItem("language", newLanguage);
  };

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await AsyncStorage.setItem("darkMode", newMode.toString());
  };

  const toggleAutoPlayTTS = async () => {
    const newValue = !autoPlayTTS;
    setAutoPlayTTS(newValue);
    await AsyncStorage.setItem("autoPlayTTS", newValue.toString());
  };

  const startRecording = async () => {
    try {
      // Request microphone permission
      if (permissionResponse.status !== "granted") {
        const response = await requestPermission();
        if (response.status !== "granted") {
          alert("Microphone permission is required for voice input.");
          return;
        }
      }

      // On Android, we need to check for RECORD_AUDIO permission too
      if (Platform.OS === "android") {
        try {
          const granted = await Voice.isRecognizing();
          if (granted) {
            // Already recording, stop it first
            await Voice.stop();
          }
        } catch (error) {
          console.error("Failed to check voice recognition status:", error);
        }
      }

      setIsRecognizing(true);
      await Voice.start(language === "ar" ? "ar-SA" : "en-US");
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsRecognizing(false);
      alert("Failed to start speech recognition. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!isRecognizing) return;

    try {
      await Voice.stop();
      setIsRecognizing(false);
    } catch (error) {
      console.error("Speech recognition stop error:", error);
    }
  };

  const playTTS = async (text) => {
    if (!text) return;
    try {
      const response = await fetch("http://192.168.1.29:8000/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `TTS request failed: ${errorData.detail || response.statusText}`
        );
      }
      const data = await response.json();
      if (!data.audio_base64) {
        throw new Error("No audio_base64 data received from TTS endpoint.");
      }
      const audioBase64 = data.audio_base64;
      if (!/^[A-Za-z0-9+/=]+$/.test(audioBase64)) {
        throw new Error("Invalid base64 string received.");
      }
      const sound = new Audio.Sound();
      try {
        await sound.loadAsync({ uri: `data:audio/mpeg;base64,${audioBase64}` });
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            const loadedStatus = status;
            if (loadedStatus.didJustFinish) {
              sound.unloadAsync().catch(() => {});
            }
          } else {
            sound.unloadAsync().catch(() => {});
          }
        });
      } catch (error) {
        sound.unloadAsync().catch(() => {});
        throw error;
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: "Sorry, I couldn't play the audio response. Please try again.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        100
      );
    }
  };

  const handleSend = async (textOverride = null) => {
    const inputText =
      textOverride || (typeof message === "string" ? message.trim() : "");
    if (!inputText || !selectedMall) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsTyping(true);

    try {
      const backendUrl =
        activeTab === "chat"
          ? "http://192.168.1.29:8000/chat"
          : "http://192.168.1.29:8000/tenant/update";
      const requestBody = {
        text: userMessage.text,
        user_id: userId || undefined,
        conversation_id: conversationId,
        language: language,
        mall_id: parseInt(selectedMall),
        include_tts: autoPlayTTS,
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
        text: data.message || "No response received.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, botResponse]);
      setConversationId(data.conversation_id);
      await AsyncStorage.setItem("conversation_id", data.conversation_id);

      if (autoPlayTTS && data.audio_base64) {
        try {
          const sound = new Audio.Sound();
          await sound.loadAsync({
            uri: `data:audio/mpeg;base64,${data.audio_base64}`,
          });
          await sound.playAsync();
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded) {
              const loadedStatus = status;
              if (loadedStatus.didJustFinish) {
                sound.unloadAsync().catch(() => {});
              }
            } else {
              sound.unloadAsync().catch(() => {});
            }
          });
        } catch (error) {
          console.error("Auto-play TTS Error:", error);
          setMessages((prev) => [
            ...prev,
            {
              id: prev.length + 1,
              text: "Sorry, I couldn't play the audio response automatically.",
              isUser: false,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Chat Error:", error);
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
    setConversationId(null);
    await AsyncStorage.removeItem("conversation_id");
  };

  const newSession = async () => {
    await AsyncStorage.removeItem("conversation_id");
    setConversationId(null);
    setMessages([
      { id: 1, text: "Hello, I'm Cenomi AI! 👋", isUser: false },
      { id: 2, text: "How can I help you today?", isUser: false },
    ]);
  };

  const quickPrompts = {
    en: {
      chat: [
        "What's the nearest mall?",
        "Show me dining options",
        "Any events this weekend?",
        "Find a clothing store",
      ],
      tenant: [
        "Update store hours",
        "Change contact info",
        "Add a promotion",
        "Update store description",
      ],
    },
    ar: {
      chat: [
        "ما هو أقرب مركز تجاري؟",
        "أرني خيارات الطعام",
        "هل هناك فعاليات هذا الأسبوع؟",
        "ابحث عن متجر ملابس",
      ],
      tenant: [
        "تحديث ساعات العمل",
        "تغيير معلومات الاتصال",
        "إضافة عرض ترويجي",
        "تحديث وصف المتجر",
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
    const mall = malls.find((m) => m.mall_id.toString() === selectedMall);
    return mall
      ? mall.name_en
      : language === "en"
      ? "Select a mall"
      : "اختر مركزًا تجاريًا";
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
                style={{ width: 100, height: 30, resizeMode: "contain" }}
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
                  setConversationId(null);
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

          {/* Mall Selection */}
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
                  key={mall.mall_id}
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
                justifyContent: "center",
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: currentTheme.border,
                backgroundColor: currentTheme.background,
              }}
            >
              <TouchableOpacity
                onPress={() => setActiveTab("chat")}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  backgroundColor:
                    activeTab === "chat"
                      ? currentTheme.tabActive
                      : currentTheme.tabInactive,
                  borderRadius: 20,
                  marginHorizontal: 5,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: activeTab === "chat" ? "#FFFFFF" : currentTheme.text,
                    fontFamily: "Poppins-Medium",
                    fontSize: 14,
                  }}
                >
                  {language === "en" ? "Chat" : "الدردشة"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab("tenant")}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  backgroundColor:
                    activeTab === "tenant"
                      ? currentTheme.tabActive
                      : currentTheme.tabInactive,
                  borderRadius: 20,
                  marginHorizontal: 5,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color:
                      activeTab === "tenant" ? "#FFFFFF" : currentTheme.text,
                    fontFamily: "Poppins-Medium",
                    fontSize: 14,
                  }}
                >
                  {language === "en" ? "Store Updates" : "تحديثات المتجر"}
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
                      key={`prompt-${index}`}
                      onPress={() => handleSend(prompt)}
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
                playTTS={playTTS}
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

          {/* Input Area with STT and TTS Controls */}
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
              <TouchableOpacity
                onPress={isRecognizing ? stopRecording : startRecording}
                style={{
                  padding: 12,
                  backgroundColor: isRecognizing
                    ? currentTheme.primary
                    : "transparent",
                  borderRadius: isRecognizing ? 20 : 0,
                }}
              >
                <Ionicons
                  name={isRecognizing ? "stop" : "mic"}
                  size={20}
                  color={
                    isRecognizing
                      ? currentTheme.userMessageText
                      : currentTheme.text
                  }
                />
              </TouchableOpacity>
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 15,
                  color: currentTheme.text,
                  fontFamily: "Poppins-Regular",
                  textAlign: language === "ar" ? "right" : "left",
                  maxHeight: 100,
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
                onChangeText={(text) => setMessage(text || "")}
                onSubmitEditing={() => handleSend()}
                returnKeyType="send"
                multiline
              />
              <TouchableOpacity
                onPress={() => handleSend()}
                disabled={!message?.trim() || !selectedMall || isTyping}
                style={{
                  backgroundColor:
                    message?.trim() && selectedMall
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
                alignItems: "center",
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
                onPress={toggleAutoPlayTTS}
                style={{
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  backgroundColor: autoPlayTTS
                    ? currentTheme.primary
                    : currentTheme.secondary,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{
                    color: autoPlayTTS ? "#FFFFFF" : currentTheme.text,
                    fontFamily: "Poppins-Medium",
                  }}
                >
                  {language === "en" ? "Auto-Play TTS" : "تشغيل تلقائي TTS"}
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
