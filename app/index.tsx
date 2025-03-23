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

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello, I'm Cenomi AI! 👋", isUser: false },
    { id: 2, text: "How can I help you today?", isUser: false },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [language, setLanguage] = useState("en");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isTenant, setIsTenant] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "update">("chat");
  const [malls, setMalls] = useState<{ mall_id: string; name_en: string }[]>(
    []
  ); // State for malls
  const [selectedMall, setSelectedMall] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    loadUserData();
    fetchMalls(); // Fetch malls on mount
  }, []);

  const loadUserData = async () => {
    const storedLang = await AsyncStorage.getItem("language");
    const storedSessionId = await AsyncStorage.getItem("session_id");
    const storedUserId = await AsyncStorage.getItem("user_id");
    const storedMallId = await AsyncStorage.getItem("selected_mall_id"); // Load persisted mall
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
        setSelectedMall(data[0].mall_id); // Default to first mall if none selected
        await AsyncStorage.setItem("selected_mall_id", data[0].mall_id); // Persist default
      }
    } catch (error) {
      console.error("Error fetching malls:", error);
    }
  };

  const handleMallChange = async (mallId: string) => {
    setSelectedMall(mallId);
    await AsyncStorage.setItem("selected_mall_id", mallId); // Persist selection
    clearChat(); // Optional: Clear chat when mall changes
  };

  const toggleLanguage = async () => {
    const newLang = language === "en" ? "ar" : "en";
    setLanguage(newLang);
    await AsyncStorage.setItem("language", newLang);
  };

  const handleSend = async () => {
    if (message.trim() === "" || !selectedMall) return; // Ensure a mall is selected

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

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-black items-center justify-center mr-2">
                <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
              </View>
              <Text className="text-xl font-bold text-gray-800">
                {language === "en" ? "Cenomi AI" : "سينومي AI"}
              </Text>
            </View>
            <View className="flex-row items-center">
              <TouchableOpacity onPress={toggleLanguage} className="mr-4">
                <Text className="text-gray-600 font-medium">
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
                <Text className="font-medium">
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

          {/* Mall Selection Dropdown */}
          <View className="px-5 py-2">
            <Text className="text-gray-600 font-medium mb-1">
              {language === "en" ? "Select Mall" : "اختر المول"}
            </Text>
            <Picker
              selectedValue={selectedMall}
              onValueChange={handleMallChange}
              style={{ height: 50, width: "100%" }}
            >
              {malls.map((mall) => (
                <Picker.Item
                  key={mall.mall_id}
                  label={mall.name_en}
                  value={mall.mall_id}
                />
              ))}
            </Picker>
          </View>

          {isTenant && (
            <View className="flex-row justify-around py-2 bg-gray-50 border-b border-gray-100">
              <TouchableOpacity
                onPress={() => setActiveTab("chat")}
                className={`flex-1 py-2 ${
                  activeTab === "chat" ? "bg-black" : "bg-gray-200"
                } rounded-l-full`}
              >
                <Text
                  className={`text-center font-medium ${
                    activeTab === "chat" ? "text-white" : "text-gray-800"
                  }`}
                >
                  {language === "en" ? "Chat" : "دردشة"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab("update")}
                className={`flex-1 py-2 ${
                  activeTab === "update" ? "bg-black" : "bg-gray-200"
                } rounded-r-full`}
              >
                <Text
                  className={`text-center font-medium ${
                    activeTab === "update" ? "text-white" : "text-gray-800"
                  }`}
                >
                  {language === "en" ? "Update" : "تحديث"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

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
                <Text className="text-gray-500 mb-3 ml-1">
                  {language === "en" ? "Try asking about:" : "جرب السؤال عن:"}
                </Text>
                <View className="flex-row flex-wrap">
                  {quickPrompts[language][activeTab].map((prompt, index) => (
                    <TouchableOpacity
                      key={index}
                      className="bg-gray-100 rounded-full px-4 py-2 mr-2 mb-2"
                      onPress={() => setMessage(prompt)}
                    >
                      <Text className="text-gray-800">{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {messages.map((msg) => (
              <View
                key={msg.id}
                className={`mb-4 ${
                  msg.isUser ? "items-end ml-auto" : "items-start"
                }`}
                style={{ maxWidth: width * 0.8 }}
              >
                <View
                  className={`rounded-2xl px-4 py-3 ${
                    msg.isUser
                      ? "bg-black rounded-tr-none"
                      : msg.text.includes("only store owners") ||
                        msg.text.includes("Invalid tenant")
                      ? "bg-red-100 rounded-tl-none"
                      : "bg-gray-100 rounded-tl-none"
                  }`}
                >
                  <Text
                    className={`${msg.isUser ? "text-white" : "text-gray-800"}`}
                    style={{ textAlign: language === "ar" ? "right" : "left" }}
                  >
                    {msg.text}
                  </Text>
                </View>
                {msg.timestamp && (
                  <Text className="text-xs text-gray-400 mt-1 mx-1">
                    {msg.timestamp}
                  </Text>
                )}
              </View>
            ))}

            {isTyping && (
              <View
                className="mb-4 items-start"
                style={{ maxWidth: width * 0.8 }}
              >
                <View className="rounded-2xl px-4 py-3 bg-gray-100 rounded-tl-none flex-row">
                  <Text className="text-gray-800 mr-1">
                    {language === "en" ? "Typing" : "يكتب"}
                  </Text>
                  <View className="flex-row items-center">
                    <View className="w-1.5 h-1.5 bg-gray-400 rounded-full mx-0.5 animate-bounce"></View>
                    <View
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full mx-0.5 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></View>
                    <View
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full mx-0.5 animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          <View className="px-4 pt-2 pb-4 border-t border-gray-100 bg-white">
            <View className="flex-row items-center bg-gray-100 rounded-full overflow-hidden">
              <TextInput
                className="flex-1 py-3 px-4 text-gray-800"
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
                style={{
                  maxHeight: 100,
                  textAlign: language === "ar" ? "right" : "left",
                }}
              />
              <TouchableOpacity
                onPress={handleSend}
                className={`${
                  message.trim() && selectedMall ? "bg-black" : "bg-gray-300"
                } rounded-full p-2.5 mx-1.5`}
                disabled={!message.trim() || !selectedMall || isTyping}
              >
                <Ionicons name="paper-plane-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <View className="flex-row justify-between mt-2">
              <TouchableOpacity
                onPress={clearChat}
                className="px-4 py-1 bg-gray-200 rounded-full"
              >
                <Text className="text-gray-800">
                  {language === "en" ? "Clear Chat" : "مسح الدردشة"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={newSession}
                className="px-4 py-1 bg-gray-200 rounded-full"
              >
                <Text className="text-gray-800">
                  {language === "en" ? "New Session" : "جلسة جديدة"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text className="text-xs text-gray-400 text-center mt-2">
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
