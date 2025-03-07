import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import { useState } from "react";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = () => {
    console.log("Login:", { username, password });
    router.push("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-row items-center justify-between px-4 py-5 border-b border-gray-200">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-800">Cenomi AI</Text>
          <View style={{ width: 24 }} />
        </View>

        <View className="flex-1 justify-center px-8">
          <View className="items-center mb-10">
            <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center mb-4">
              <Ionicons name="person" size={50} color="#777" />
            </View>
            <Text className="text-2xl font-bold text-gray-800">
              Tenant Login
            </Text>
            <Text className="text-gray-500 mt-2">
              Sign in to access your account
            </Text>
          </View>

          <View className="bg-gray-100 rounded-xl p-4 mb-6">
            <View className="flex-row items-center border-b border-gray-300 pb-2 mb-4">
              <Ionicons
                name="person-outline"
                size={20}
                color="#777"
                style={{ marginRight: 10 }}
              />
              <TextInput
                className="flex-1 text-gray-800"
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View className="flex-row items-center">
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#777"
                style={{ marginRight: 10 }}
              />
              <TextInput
                className="flex-1 text-gray-800"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#777"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            className="bg-black py-3 rounded-xl items-center"
            disabled={!username || !password}
          >
            <Text className="text-white font-semibold text-lg">Login</Text>
          </TouchableOpacity>

          <TouchableOpacity className="mt-4 items-center">
            <Text className="text-black">Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
