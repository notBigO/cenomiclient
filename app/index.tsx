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
} from "react-native";
import { useState, useRef } from "react";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello, I'm Cenomi AI!", isUser: false },
    { id: 2, text: "How can I help you? 😊", isUser: false },
  ]);
  const scrollViewRef = useRef();
  const router = useRouter();

  const handleSend = () => {
    if (message.trim() === "") return;

    const userMessage = {
      id: messages.length + 1,
      text: message,
      isUser: true,
    };
    setMessages([...messages, userMessage]);

    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        text: "Hello! Im still under development",
        isUser: false,
      };
      setMessages((prev) => [...prev, botResponse]);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 1000);

    setMessage("");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-row items-center justify-between px-4 py-5 border-b border-gray-200">
          <View className="flex-row items-center">
            <Text className="text-lg font-semibold text-gray-800">
              Cenomi AI
            </Text>
          </View>
          <Link href={"/login"}>Tenant Login</Link>
        </View>

        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 pt-7"
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              className={`mb-4 max-w-4/5 ${
                msg.isUser ? "self-end ml-auto" : "self-start"
              }`}
            >
              <View
                className={`rounded-2xl px-4 py-3 ${
                  msg.isUser
                    ? "bg-gray-800 rounded-tr-none"
                    : "bg-gray-100 rounded-tl-none"
                }`}
              >
                <Text
                  className={`${msg.isUser ? "text-white" : "text-gray-800"}`}
                >
                  {msg.text}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View className="px-4 py-2 border-t border-gray-200 bg-white">
          <View className="flex-row items-center bg-gray-100 rounded-full overflow-hidden">
            <TextInput
              className="flex-1 py-2 px-4 text-gray-800"
              placeholder="I'd love to know more"
              value={message}
              onChangeText={setMessage}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={handleSend}
              className="bg-white rounded-full p-2 mx-1"
              disabled={!message.trim()}
            >
              <Ionicons
                name="paper-plane-outline"
                size={22}
                color={message.trim() ? "#000" : "#ccc"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
