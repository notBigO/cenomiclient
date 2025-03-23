import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const passwordRef = useRef(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await axios.post("http://192.168.1.10:8000/login", {
        email: username,
        password,
      });
      const { user_id, role, store_id } = response.data;
      await AsyncStorage.setItem("user_id", user_id);
      await AsyncStorage.setItem("role", role);
      if (store_id) await AsyncStorage.setItem("store_id", store_id.toString());
      router.push("/");
    } catch (error) {
      setError("Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-row items-center justify-between px-5 py-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-gray-800">Cenomi AI</Text>
          <View style={{ width: 24 }} />
        </View>

        <Animated.View
          className="flex-1 justify-center px-8"
          style={{ opacity: fadeAnim }}
        >
          <View className="items-center mb-10">
            <View className="w-20 h-20 rounded-full bg-black items-center justify-center mb-6 shadow-md">
              <Ionicons name="person" size={40} color="#fff" />
            </View>
            <Text className="text-3xl font-bold text-gray-800">Sign In</Text>
            <Text className="text-gray-500 mt-2 text-center">
              Login as a customer or tenant to access your account
            </Text>
          </View>

          <View className="mb-6 space-y-4">
            <View className="space-y-2">
              <Text className="text-gray-600 text-sm font-medium ml-1">
                Username / Email
              </Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color="#777"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  className="flex-1 text-gray-800"
                  placeholder="Enter username or email"
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    setError("");
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
            </View>

            <View className="space-y-2">
              <Text className="text-gray-600 text-sm font-medium ml-1">
                Password
              </Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color="#777"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  ref={passwordRef}
                  className="flex-1 text-gray-800"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError("");
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="p-1"
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#777"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <Text className="text-red-500 text-sm ml-1">{error}</Text>
            ) : null}

            <TouchableOpacity
              className="self-end"
              onPress={() => console.log("Forgot password")}
            >
              <Text className="text-gray-600 text-sm">Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            className={`${
              !username || !password ? "bg-gray-300" : "bg-black"
            } py-4 rounded-xl items-center shadow-sm mt-2`}
            disabled={!username || !password || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-lg">Sign In</Text>
            )}
          </TouchableOpacity>

          <View className="mt-8 items-center">
            <Text className="text-gray-500">
              Don't have an account?{" "}
              <Text className="text-black font-semibold">Register Now</Text>
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
