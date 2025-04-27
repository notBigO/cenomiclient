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
import { useState, useEffect, useRef } from "react";
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
const TypingIndicator = () => (
  <View style={{ flexDirection: "row", padding: 8 }}>
    <MotiView
      from={{ scale: 0.8, opacity: 0.4 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "timing", duration: 400, loop: true, delay: 0 }}
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#303342",
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
        backgroundColor: "#303342",
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
        backgroundColor: "#303342",
        marginHorizontal: 2,
      }}
    />
  </View>
);

// Animated Message Component (removed TTS Play Button)
const AnimatedMessage = ({ msg, index, language }) => {
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
      <MotiView
        from={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 15 }}
        style={{
          backgroundColor: msg.isUser
            ? "#6C5CE7"
            : msg.text.includes("only store owners") ||
              msg.text.includes("Invalid tenant")
            ? "#FFEEF0"
            : "#F3F3FF",
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
              color: "#FFFFFF",
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
              color: "#303342",
              fontFamily: "Poppins-Regular",
              fontSize: 15,
              lineHeight: 22,
              textAlign: language === "ar" ? "right" : "left",
            }}
          />
        )}
      </MotiView>
      {msg.timestamp && (
        <Text
          style={{
            color: "#A0A0B9",
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
  const [malls, setMalls] = useState([]);
  const [selectedMall, setSelectedMall] = useState(null);
  const [showMallSelector, setShowMallSelector] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [autoPlayTTS, setAutoPlayTTS] = useState(false);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const scrollViewRef = useRef(null);

  const [fontsLoaded] = useFonts({
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
  });

  const theme = {
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
  };

  const dimensions = Dimensions.get("window");
  const isSmallScreen = dimensions.width < 375;

  const loadUserData = async () => {
    try {
      const convId = await AsyncStorage.getItem("conversation_id");
      if (convId) setConversationId(convId);
      const mallId = await AsyncStorage.getItem("selected_mall");
      if (mallId) setSelectedMall(mallId);
      const savedLanguage = await AsyncStorage.getItem("language");
      if (savedLanguage) setLanguage(savedLanguage);
      const ttsAutoPlay = await AsyncStorage.getItem("autoPlayTTS");
      if (ttsAutoPlay) setAutoPlayTTS(ttsAutoPlay === "true");
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
          text: "Sorry, I couldn't understand your voice input. Please try again.",
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
        // Show transcribed text in input instead of auto-sending
        setMessage(transcribedText);
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
      const backendUrl = "http://192.168.1.29:8000/chat";
      const requestBody = {
        text: userMessage.text,
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
        }
      }
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMessage = {
        id: messages.length + 2,
        text: "Sorry, something went wrong. Please try again later.",
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

  const quickPrompts = {
    en: [
      "What's the nearest mall?",
      "Show me dining options",
      "Any events this weekend?",
      "Find a clothing store",
    ],
    ar: [
      "ما هو أقرب مركز تجاري؟",
      "أرني خيارات الطعام",
      "هل هناك فعاليات هذا الأسبوع؟",
      "ابحث عن متجر ملابس",
    ],
  };

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <Text style={{ color: theme.text, fontFamily: "Poppins-Regular" }}>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.headerBg} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500 }}
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
              backgroundColor: theme.headerBg,
              borderBottomColor: theme.border,
              borderBottomWidth: 1,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={require("../assets/logo.png")}
                style={{
                  width: dimensions.width * 0.25,
                  height: 30,
                  resizeMode: "contain",
                }}
              />
            </View>
            <TouchableOpacity
              onPress={toggleLanguage}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: theme.secondary,
                borderRadius: 16,
              }}
            >
              <Text
                style={{
                  color: theme.text,
                  fontFamily: "Poppins-Medium",
                  fontSize: isSmallScreen ? 12 : 14,
                }}
              >
                {language === "en" ? "عربي" : "EN"}
              </Text>
            </TouchableOpacity>
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
              borderBottomColor: theme.border,
              backgroundColor: theme.background,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                maxWidth: "85%",
              }}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color={theme.primary}
                style={{ marginRight: 10 }}
              />
              <Text
                style={{
                  fontFamily: "Poppins-Medium",
                  color: theme.text,
                  fontSize: isSmallScreen ? 13 : 15,
                  flexShrink: 1,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {getCurrentMallName()}
              </Text>
            </View>
            <Ionicons
              name={showMallSelector ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.text}
            />
          </TouchableOpacity>

          {showMallSelector && (
            <MotiView
              from={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ type: "spring", damping: 18 }}
              style={{
                backgroundColor: theme.background,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                paddingHorizontal: 20,
                paddingBottom: 15,
                maxHeight: dimensions.height * 0.3,
              }}
            >
              <ScrollView
                style={{ maxHeight: dimensions.height * 0.25 }}
                showsVerticalScrollIndicator={false}
              >
                {malls.map((mall) => (
                  <MotiView
                    key={mall.mall_id}
                    from={{ opacity: 0, translateX: -5 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{
                      type: "timing",
                      duration: 300,
                      delay: (50 * malls.indexOf(mall)) % malls.length,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => handleMallChange(mall.mall_id)}
                      style={{
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                        backgroundColor:
                          mall.mall_id.toString() === selectedMall
                            ? theme.secondary
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
                              ? theme.primary
                              : theme.text,
                          fontFamily:
                            mall.mall_id.toString() === selectedMall
                              ? "Poppins-Medium"
                              : "Poppins-Regular",
                          fontSize: isSmallScreen ? 13 : 15,
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {mall.name_en}
                      </Text>
                    </TouchableOpacity>
                  </MotiView>
                ))}
              </ScrollView>
            </MotiView>
          )}

          {/* Chat Area */}
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1, paddingHorizontal: 15, paddingTop: 15 }}
            contentContainerStyle={{ paddingBottom: 20 }}
            onContentSizeChange={() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 2 && (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", damping: 15, delay: 300 }}
                style={{ marginBottom: 25 }}
              >
                <Text
                  style={{
                    color: theme.placeholder,
                    fontFamily: "Poppins-Medium",
                    marginBottom: 12,
                    fontSize: isSmallScreen ? 13 : 15,
                  }}
                >
                  {language === "en" ? "Try asking about:" : "جرب السؤال عن:"}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 8 }}
                >
                  {quickPrompts[language].map((prompt, index) => (
                    <MotiView
                      key={`prompt-${index}`}
                      from={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: "spring",
                        damping: 15,
                        delay: 400 + index * 50,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => handleSend(prompt)}
                        style={{
                          backgroundColor: theme.secondary,
                          borderRadius: 20,
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          marginRight: 10,
                          borderWidth: 1,
                          borderColor: theme.border,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.text,
                            fontFamily: "Poppins-Regular",
                            fontSize: isSmallScreen ? 12 : 14,
                          }}
                        >
                          {prompt}
                        </Text>
                      </TouchableOpacity>
                    </MotiView>
                  ))}
                </ScrollView>
              </MotiView>
            )}

            {messages.map((msg, index) => (
              <AnimatedMessage
                key={msg.id}
                msg={msg}
                index={index}
                language={language}
              />
            ))}

            {isTyping && (
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "spring", damping: 15 }}
                style={{
                  marginBottom: 15,
                  alignItems: "flex-start",
                  maxWidth: dimensions.width * 0.25,
                  backgroundColor: theme.messageBg,
                  borderRadius: 20,
                  borderTopLeftRadius: 4,
                  padding: 4,
                }}
              >
                <TypingIndicator />
              </MotiView>
            )}
          </ScrollView>

          {/* Input Area with STT Controls */}
          <MotiView
            from={{ translateY: 50, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 18 }}
            style={{
              paddingHorizontal: 15,
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: theme.border,
              backgroundColor: theme.background,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: theme.inputBg,
                borderRadius: 25,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              <TouchableOpacity
                onPress={isRecognizing ? stopRecording : startRecording}
                style={{
                  padding: 12,
                  backgroundColor: isRecognizing
                    ? theme.primary
                    : "transparent",
                  borderRadius: isRecognizing ? 20 : 0,
                }}
              >
                <Ionicons
                  name={isRecognizing ? "stop" : "mic"}
                  size={20}
                  color={isRecognizing ? theme.userMessageText : theme.text}
                />
              </TouchableOpacity>
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 15,
                  color: theme.text,
                  fontFamily: "Poppins-Regular",
                  textAlign: language === "ar" ? "right" : "left",
                  maxHeight: 100,
                  fontSize: isSmallScreen ? 13 : 15,
                }}
                placeholder={
                  language === "en"
                    ? "Message Cenomi AI..."
                    : "راسل سينومي AI..."
                }
                placeholderTextColor={theme.placeholder}
                value={message}
                onChangeText={(text) => setMessage(text || "")}
                onSubmitEditing={() => handleSend()}
                returnKeyType="send"
                multiline
              />
              <TouchableOpacity
                onPress={toggleAutoPlayTTS}
                style={{
                  padding: 12,
                }}
              >
                <Ionicons
                  name={autoPlayTTS ? "volume-high" : "volume-mute"}
                  size={20}
                  color={autoPlayTTS ? theme.primary : theme.placeholder}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSend()}
                disabled={!message?.trim() || !selectedMall || isTyping}
                style={{
                  backgroundColor:
                    message?.trim() && selectedMall && !isTyping
                      ? theme.primary
                      : theme.secondary,
                  borderRadius: 25,
                  padding: 12,
                  marginRight: 5,
                }}
              >
                <Ionicons
                  name="paper-plane-outline"
                  size={20}
                  color={
                    message?.trim() && selectedMall && !isTyping
                      ? theme.userMessageText
                      : theme.placeholder
                  }
                />
              </TouchableOpacity>
            </View>

            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: "timing", duration: 500, delay: 500 }}
            >
              <TouchableOpacity
                onPress={clearChat}
                style={{
                  alignSelf: "center",
                  marginTop: 10,
                  paddingVertical: 5,
                  paddingHorizontal: 10,
                }}
              >
                <Text
                  style={{
                    color: theme.placeholder,
                    fontFamily: "Poppins-Medium",
                    fontSize: isSmallScreen ? 11 : 13,
                  }}
                >
                  {language === "en" ? "Clear conversation" : "مسح المحادثة"}
                </Text>
              </TouchableOpacity>
            </MotiView>
          </MotiView>
        </MotiView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
