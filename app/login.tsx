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
  Animated,
  Image,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("en");
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const passwordRef = useRef(null);

  // Load Urbanist font
  const [fontsLoaded] = useFonts({
    "Urbanist-Regular": require("../assets/fonts/Urbanist-Regular.ttf"),
    "Urbanist-Medium": require("../assets/fonts/Urbanist-Medium.ttf"),
    "Urbanist-SemiBold": require("../assets/fonts/Urbanist-SemiBold.ttf"),
    "Urbanist-Bold": require("../assets/fonts/Urbanist-Bold.ttf"),
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    const loadLanguage = async () => {
      const storedLang = await AsyncStorage.getItem("language");
      if (storedLang) setLanguage(storedLang);
    };

    loadLanguage();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const toggleLanguage = async () => {
    const newLang = language === "en" ? "ar" : "en";
    setLanguage(newLang);
    await AsyncStorage.setItem("language", newLang);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError(
        language === "en"
          ? "Please enter both email and password"
          : "الرجاء إدخال البريد الإلكتروني وكلمة المرور"
      );
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await axios.post("http://192.168.1.17:8000/login", {
        email,
        password,
      });
      const { user_id } = response.data;
      await AsyncStorage.setItem("user_id", user_id);
      router.push("/");
    } catch (error) {
      setError(
        language === "en" ? "Invalid credentials" : "بيانات الاعتماد غير صالحة"
      );
    } finally {
      setIsLoading(false);
    }
  };

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
              <TouchableOpacity onPress={() => router.back()} className="p-1">
                <Ionicons name="chevron-back" size={24} color="#6366f1" />
              </TouchableOpacity>

              <View className="flex-row items-center">
                <Image
                  source={require("../assets/logo.png")}
                  style={{ width: 120, height: 32, resizeMode: "contain" }}
                />
              </View>

              <TouchableOpacity
                onPress={toggleLanguage}
                className="px-3 py-1 bg-gray-100 rounded-full"
              >
                <Text
                  style={{ fontFamily: "Urbanist-Medium" }}
                  className="text-gray-600"
                >
                  {language === "en" ? "عربي" : "English"}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-1 justify-center px-8">
              <View className="items-center mb-10">
                <LinearGradient
                  colors={["#6366f1", "#8b5cf6"]}
                  className="w-20 h-20 rounded-full items-center justify-center mb-6"
                >
                  <Ionicons name="person" size={40} color="#fff" />
                </LinearGradient>
                <Text
                  style={{ fontFamily: "Urbanist-Bold" }}
                  className="text-3xl text-gray-800"
                >
                  {language === "en" ? "Sign In" : "تسجيل الدخول"}
                </Text>
                <Text
                  style={{ fontFamily: "Urbanist-Regular" }}
                  className="text-gray-500 mt-2 text-center"
                >
                  {language === "en"
                    ? "Login to access your Cenomi AI account"
                    : "تسجيل الدخول للوصول إلى حساب سينومي AI الخاص بك"}
                </Text>
              </View>

              <View className="mb-6 space-y-4">
                <View className="space-y-2">
                  <Text
                    style={{ fontFamily: "Urbanist-Medium" }}
                    className="text-gray-600 text-sm ml-1"
                  >
                    {language === "en" ? "Email" : "البريد الإلكتروني"}
                  </Text>
                  <View className="flex-row items-center bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color="#6366f1"
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      className="flex-1 text-gray-800"
                      style={{
                        fontFamily: "Urbanist-Regular",
                        textAlign: language === "ar" ? "right" : "left",
                      }}
                      placeholder={
                        language === "en"
                          ? "Enter your email"
                          : "أدخل بريدك الإلكتروني"
                      }
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
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
                  <Text
                    style={{ fontFamily: "Urbanist-Medium" }}
                    className="text-gray-600 text-sm ml-1"
                  >
                    {language === "en" ? "Password" : "كلمة المرور"}
                  </Text>
                  <View className="flex-row items-center bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color="#6366f1"
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      ref={passwordRef}
                      className="flex-1 text-gray-800"
                      style={{
                        fontFamily: "Urbanist-Regular",
                        textAlign: language === "ar" ? "right" : "left",
                      }}
                      placeholder={
                        language === "en"
                          ? "Enter your password"
                          : "أدخل كلمة المرور"
                      }
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
                        color="#6366f1"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {error ? (
                  <Text
                    style={{ fontFamily: "Urbanist-Regular" }}
                    className="text-red-500 text-sm ml-1"
                  >
                    {error}
                  </Text>
                ) : null}

                <TouchableOpacity
                  onPress={() => console.log("Forgot password")}
                  className="self-end"
                >
                  <Text
                    style={{ fontFamily: "Urbanist-Medium" }}
                    className="text-gray-600 text-sm"
                  >
                    {language === "en"
                      ? "Forgot Password?"
                      : "نسيت كلمة المرور؟"}
                  </Text>
                </TouchableOpacity>
              </View>

              <LinearGradient
                colors={
                  !email || !password || isLoading
                    ? ["#d1d5db", "#9ca3af"]
                    : ["#6366f1", "#8b5cf6"]
                }
                className="rounded-xl shadow-sm mt-2"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <TouchableOpacity
                  onPress={handleLogin}
                  className="py-4 rounded-xl items-center"
                  disabled={!email || !password || isLoading}
                >
                  {isLoading ? (
                    <View className="flex-row items-center">
                      <View
                        className="w-2 h-2 bg-white rounded-full mx-0.5"
                        style={{ opacity: 0.7 }}
                      />
                      <View
                        className="w-2 h-2 bg-white rounded-full mx-0.5"
                        style={{ opacity: 0.7 }}
                      />
                      <View
                        className="w-2 h-2 bg-white rounded-full mx-0.5"
                        style={{ opacity: 0.7 }}
                      />
                    </View>
                  ) : (
                    <Text
                      style={{ fontFamily: "Urbanist-SemiBold" }}
                      className="text-white text-lg"
                    >
                      {language === "en" ? "Sign In" : "تسجيل الدخول"}
                    </Text>
                  )}
                </TouchableOpacity>
              </LinearGradient>

              <View className="mt-8 items-center">
                <Text
                  style={{ fontFamily: "Urbanist-Regular" }}
                  className="text-gray-500"
                >
                  {language === "en"
                    ? "Don't have an account? "
                    : "ليس لديك حساب؟ "}
                  <Text
                    style={{ fontFamily: "Urbanist-SemiBold" }}
                    className="text-blue-500"
                  >
                    {language === "en" ? "Register Now" : "سجل الآن"}
                  </Text>
                </Text>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
