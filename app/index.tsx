import { View, Text, TextInput, Button } from "react-native";
import { useState } from "react";
import { Link } from "expo-router";

export default function HomeScreen() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");

  const handleSend = () => {
    setResponse(`You said: ${message}`);
    setMessage("");
  };

  return (
    <View className="flex-1 bg-gray-100 p-4">
      <Text className="text-2xl font-bold text-orange-500 mb-4">
        Cenomi Chatbot
      </Text>
      <TextInput
        className="border border-gray-300 rounded p-2 mb-4 text-black"
        placeholder="Type your message..."
        value={message}
        onChangeText={setMessage}
      />
      <Button title="Send" onPress={handleSend} color="#f97316" />
      <Text className="mt-4 text-gray-700">{response}</Text>
      <Link href="/login" className="mt-4 text-blue-500">
        Tenant Login
      </Link>
    </View>
  );
}
