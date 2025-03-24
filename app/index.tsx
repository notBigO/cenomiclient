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
  Image,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

// Markdown renderer component
const MarkdownText = ({ text, style }) => {
  // Parse the text for markdown formatting
  const parts = [];
  let lastIndex = 0;
  let key = 0;

  // Find all bold text (**text**)
  const boldRegex = /\*\*(.*?)\*\*/g;
  let boldMatch;
  while ((boldMatch = boldRegex.exec(text)) !== null) {
    // Add text before the match
    if (boldMatch.index > lastIndex) {
      parts.push(
        <Text key={key++} style={style}>
          {text.substring(lastIndex, boldMatch.index)}
        </Text>
      );
    }
    // Add the bold text
    parts.push(
      <Text key={key++} style={[style, { fontWeight: "bold" }]}>
        {boldMatch[1]}
      </Text>
    );
    lastIndex = boldMatch.index + boldMatch[0].length;
  }

  // Find all italic text (*text*)
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
    // Add text before the match
    if (italicMatch.index > lastIndex) {
      italicParts.push(
        <Text key={italicKey++} style={style}>
          {processedText.substring(lastIndex, italicMatch.index)}
        </Text>
      );
    }
    // Add the italic text
    italicParts.push(
      <Text key={italicKey++} style={[style, { fontStyle: "italic" }]}>
        {italicMatch[1]}
      </Text>
    );
    lastIndex = italicMatch.index + italicMatch[0].length;
  }

  // Add any remaining text
  if (lastIndex < processedText.length) {
    italicParts.push(
      <Text key={italicKey++} style={style}>
        {processedText.substring(lastIndex)}
      </Text>
    );
  }

  // If we processed bold text, we need to insert the italic processing results
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

  // If we only processed italic text
  if (italicParts.length > 0) {
    return <Text>{italicParts}</Text>;
  }

  // If no formatting, return the original text
  return <Text style={style}>{text}</Text>;
};

export default function HomeScreen() {
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
  const scrollViewRef = useRef(null);
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showMallPicker, setShowMallPicker] = useState(false);

  // Load Urbanist font
  const [fontsLoaded] = useFonts({
    "Urbanist-Regular": require("../assets/fonts/Urbanist-Regular.ttf"),
    "Urbanist-Medium": require("../assets/fonts/Urbanist-Medium.ttf"),
    "Urbanist-SemiBold": require("../assets/fonts/Urbanist-SemiBold.ttf"),
    "Urbanist-Bold": require("../assets/fonts/Urbanist-Bold.ttf"),
  });

  // Define all functions first, before using them in useEffect
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
      const response = await fetch("http://192.168.1.17:8000/malls");
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

  // Now use the functions in useEffect
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    loadUserData();
    fetchMalls();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const handleMallChange = async (mallId) => {
    setSelectedMall(mallId);
    await AsyncStorage.setItem("selected_mall_id", mallId);
    setShowMallPicker(false);
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
          ? "http://192.168.1.17:8000/chat"
          : "http://192.168.1.17:8000/tenant/update";
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

  const selectedMallName =
    malls.find((m) => m.mall_id === selectedMall)?.name_en || "Select Mall";

  return (
    <LinearGradient colors={["#f0f8ff", "#f5f7fa"]} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            {/* Header */}
            <View className="px-5 py-4 flex-row items-center justify-between border-b border-gray-100">
              <View className="flex-row items-center">
                <Image
                  source={require("../assets/logo.png")}
                  style={{ width: 120, height: 32, resizeMode: "contain" }}
                />
              </View>
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={toggleLanguage}
                  className="px-3 py-1 bg-gray-100 rounded-full mr-3"
                >
                  <Text
                    style={{ fontFamily: "Urbanist-Medium" }}
                    className="text-gray-600"
                  >
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
                  className="px-4 py-2 bg-gray-100 rounded-full"
                >
                  <Text
                    style={{ fontFamily: "Urbanist-Medium" }}
                    className="text-gray-600"
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

            {/* Mall Selector */}
            <View className="px-5 py-2">
              <TouchableOpacity
                onPress={() => setShowMallPicker(!showMallPicker)}
                className="flex-row items-center justify-between bg-white rounded-xl p-3 shadow-sm"
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color="#6366f1"
                    className="mr-2"
                  />
                  <Text
                    style={{ fontFamily: "Urbanist-Medium" }}
                    className="text-gray-700"
                  >
                    {selectedMallName}
                  </Text>
                </View>
                <Ionicons
                  name={showMallPicker ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#6366f1"
                />
              </TouchableOpacity>

              {showMallPicker && (
                <View className="bg-white rounded-xl mt-2 shadow-sm overflow-hidden">
                  <ScrollView style={{ maxHeight: 150 }}>
                    {malls.map((mall) => (
                      <TouchableOpacity
                        key={mall.mall_id}
                        onPress={() => handleMallChange(mall.mall_id)}
                        className={`p-3 border-b border-gray-100 ${
                          selectedMall === mall.mall_id ? "bg-gray-50" : ""
                        }`}
                      >
                        <Text
                          style={{ fontFamily: "Urbanist-Medium" }}
                          className={`${
                            selectedMall === mall.mall_id
                              ? "text-blue-500"
                              : "text-gray-700"
                          }`}
                        >
                          {mall.name_en}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Tabs (for tenants) */}
            {isTenant && (
              <View className="px-5 py-2">
                <View className="flex-row bg-gray-100 rounded-full p-1">
                  <TouchableOpacity
                    onPress={() => setActiveTab("chat")}
                    className={`flex-1 py-2 ${
                      activeTab === "chat"
                        ? "bg-gradient-to-r from-blue-500 to-purple-500"
                        : "bg-transparent"
                    } rounded-full`}
                  >
                    <Text
                      style={{ fontFamily: "Urbanist-Medium" }}
                      className={`text-center ${
                        activeTab === "chat" ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {language === "en" ? "Chat" : "دردشة"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setActiveTab("update")}
                    className={`flex-1 py-2 ${
                      activeTab === "update"
                        ? "bg-gradient-to-r from-blue-500 to-purple-500"
                        : "bg-transparent"
                    } rounded-full`}
                  >
                    <Text
                      style={{ fontFamily: "Urbanist-Medium" }}
                      className={`text-center ${
                        activeTab === "update" ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {language === "en" ? "Update" : "تحديث"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Messages */}
            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              className="flex-1 px-4 pt-5"
              contentContainerStyle={{ paddingBottom: 20 }}
              onContentSizeChange={() =>
                scrollViewRef.current?.scrollToEnd({ animated: false })
              }
            >
              {messages.length === 2 && (
                <View className="mt-2 mb-6">
                  <Text
                    style={{ fontFamily: "Urbanist-Medium" }}
                    className="text-gray-500 mb-3 ml-1"
                  >
                    {language === "en" ? "Try asking about:" : "جرب السؤال عن:"}
                  </Text>
                  <View className="flex-row flex-wrap">
                    {quickPrompts[language][activeTab].map((prompt, index) => (
                      <TouchableOpacity
                        key={index}
                        className="bg-white rounded-full px-4 py-2 mr-2 mb-2 shadow-sm"
                        onPress={() => setMessage(prompt)}
                      >
                        <Text
                          style={{ fontFamily: "Urbanist-Regular" }}
                          className="text-gray-700"
                        >
                          {prompt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {messages.map((msg) => (
                <View
                  key={msg.id}
                  className={`mb-4 flex-row ${
                    msg.isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <View
                    style={{
                      maxWidth: width * 0.75,
                      borderTopLeftRadius: msg.isUser ? 18 : 4,
                      borderTopRightRadius: msg.isUser ? 4 : 18,
                      borderBottomLeftRadius: 18,
                      borderBottomRightRadius: 18,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginBottom: 2,
                      backgroundColor: msg.isUser
                        ? "#6366f1"
                        : msg.text.includes("only store owners") ||
                          msg.text.includes("Invalid tenant")
                        ? "#ffebee"
                        : "#ffffff",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 1,
                      elevation: 1,
                    }}
                  >
                    {msg.isUser ? (
                      <Text
                        style={{
                          fontFamily: "Urbanist-Medium",
                          textAlign: language === "ar" ? "right" : "left",
                          color: "#ffffff",
                          fontSize: 15,
                        }}
                      >
                        {msg.text}
                      </Text>
                    ) : (
                      <MarkdownText
                        text={msg.text}
                        style={{
                          fontFamily: "Urbanist-Regular",
                          color:
                            msg.text.includes("only store owners") ||
                            msg.text.includes("Invalid tenant")
                              ? "#d32f2f"
                              : "rgb(31, 41, 55)",
                          textAlign: language === "ar" ? "right" : "left",
                          fontSize: 15,
                        }}
                      />
                    )}
                    <View className="flex-row justify-end items-center mt-1">
                      <Text
                        style={{
                          fontFamily: "Urbanist-Regular",
                          fontSize: 10,
                          color: msg.isUser
                            ? "rgba(255, 255, 255, 0.7)"
                            : "rgba(0, 0, 0, 0.4)",
                          marginRight: 2,
                        }}
                      >
                        {msg.timestamp}
                      </Text>
                      {msg.isUser && (
                        <Ionicons
                          name="checkmark-done"
                          size={12}
                          color="rgba(255, 255, 255, 0.7)"
                        />
                      )}
                    </View>
                  </View>
                </View>
              ))}

              {isTyping && (
                <View className="mb-4 flex-row justify-start">
                  <View
                    style={{
                      backgroundColor: "#ffffff",
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 18,
                      borderBottomLeftRadius: 18,
                      borderBottomRightRadius: 18,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 1,
                      elevation: 1,
                    }}
                  >
                    <View className="flex-row items-center">
                      <View
                        className="w-2 h-2 bg-blue-400 rounded-full mx-0.5"
                        style={{ opacity: 0.7 }}
                      />
                      <View
                        className="w-2 h-2 bg-purple-400 rounded-full mx-0.5"
                        style={{ opacity: 0.7 }}
                      />
                      <View
                        className="w-2 h-2 bg-blue-400 rounded-full mx-0.5"
                        style={{ opacity: 0.7 }}
                      />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input Area */}
            <View className="px-4 pt-2 pb-4 bg-white border-t border-gray-100">
              <View className="flex-row items-center bg-gray-50 rounded-full overflow-hidden border border-gray-100 px-2">
                <TextInput
                  className="flex-1 py-3 px-4 text-gray-800"
                  style={{
                    fontFamily: "Urbanist-Regular",
                    maxHeight: 100,
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
                  value={message}
                  onChangeText={setMessage}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  multiline
                  maxHeight={100}
                />
                <LinearGradient
                  colors={
                    message.trim() && selectedMall
                      ? ["#6366f1", "#8b5cf6"]
                      : ["#d1d5db", "#9ca3af"]
                  }
                  className="rounded-full p-3 mx-1"
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <TouchableOpacity
                    onPress={handleSend}
                    disabled={!message.trim() || !selectedMall || isTyping}
                  >
                    <Ionicons
                      name="paper-plane-outline"
                      size={20}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </LinearGradient>
              </View>

              <View className="flex-row justify-between mt-3">
                <TouchableOpacity
                  onPress={clearChat}
                  className="px-4 py-2 bg-gray-50 rounded-full border border-gray-100"
                >
                  <Text
                    style={{ fontFamily: "Urbanist-Medium" }}
                    className="text-gray-600"
                  >
                    {language === "en" ? "Clear Chat" : "مسح الدردشة"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={newSession}
                  className="px-4 py-2 bg-gray-50 rounded-full border border-gray-100"
                >
                  <Text
                    style={{ fontFamily: "Urbanist-Medium" }}
                    className="text-gray-600"
                  >
                    {language === "en" ? "New Session" : "جلسة جديدة"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text
                style={{ fontFamily: "Urbanist-Regular" }}
                className="text-xs text-gray-400 text-center mt-2"
              >
                {language === "en"
                  ? "Cenomi AI assists with inquiries and updates"
                  : "سينومي AI يساعد في الاستفسارات والتحديثات"}
              </Text>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
