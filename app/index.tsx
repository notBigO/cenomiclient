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
import { useState, useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello, I'm Cenomi AI! 👋", isUser: false },
    { id: 2, text: "How can I help you today?", isUser: false },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSend = async () => {
    if (message.trim() === "") return;

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
      const backendUrl = "http://192.168.1.17:8000/chat";
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: userMessage.text }),
      });
      console.log("response: ", response);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      console.log("Data: ", data);
      const parsedResponse = JSON.parse(data.response);
      const botResponse = {
        id: messages.length + 2,
        text: parsedResponse.message,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("Error:", error);
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
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const quickPrompts = [
    "Where is Trendy Threads?",
    "What offers are available?",
    "Check my loyalty points",
    "Update store hours",
  ];

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
              <Text className="text-xl font-bold text-gray-800">Cenomi AI</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/login")}
              className="px-4 py-2 bg-gray-100 rounded-full"
            >
              <Text className="font-medium">Login</Text>
            </TouchableOpacity>
          </View>

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
                  Try asking about:
                </Text>
                <View className="flex-row flex-wrap">
                  {quickPrompts.map((prompt, index) => (
                    <TouchableOpacity
                      key={index}
                      className="bg-gray-100 rounded-full px-4 py-2 mr-2 mb-2"
                      onPress={() => {
                        setMessage(prompt);
                      }}
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
                      : "bg-gray-100 rounded-tl-none"
                  }`}
                >
                  <Text
                    className={`${msg.isUser ? "text-white" : "text-gray-800"}`}
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
                  <Text className="text-gray-800 mr-1">Typing</Text>
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
                placeholder="Message Cenomi AI..."
                value={message}
                onChangeText={setMessage}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                multiline
                maxHeight={100}
                style={{ maxHeight: 100 }}
              />
              <TouchableOpacity
                onPress={handleSend}
                className={`${
                  message.trim() ? "bg-black" : "bg-gray-300"
                } rounded-full p-2.5 mx-1.5`}
                disabled={!message.trim() || isTyping}
              >
                <Ionicons name="paper-plane-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text className="text-xs text-gray-400 text-center mt-2">
              Cenomi AI assists customers and tenants with inquiries and updates
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
