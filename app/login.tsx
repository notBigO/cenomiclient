// app/login.tsx
import { View, Text, TextInput, Button } from "react-native";
import { useState } from "react";
import { Link } from "expo-router";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    console.log("Login:", { username, password });
  };

  return (
    <View className="flex-1 bg-gray-100 p-4">
      <Text className="text-2xl font-bold text-orange-500 mb-4">
        Tenant Login
      </Text>
      <TextInput
        className="border border-gray-300 rounded p-2 mb-4 text-black"
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        className="border border-gray-300 rounded p-2 mb-4 text-black"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} color="#f97316" />
      <Link href="/" className="mt-4 text-blue-500">
        Back to Chat
      </Link>
    </View>
  );
}
