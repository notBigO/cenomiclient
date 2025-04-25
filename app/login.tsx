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
  Dimensions,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import axios from "axios";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("en");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();
  const passwordRef = useRef(null);

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
  });

  // Theme definitions matching index.tsx
  const themes = {
    light: {
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
    },
    dark: {
      background: "#1A1A2E",
      text: "#E0E0E6",
      primary: "#8A65FF",
      secondary: "#252542",
      messageBg: "#252542",
      userMessageBg: "#8A65FF",
      userMessageText: "#FFFFFF",
      border: "#303050",
      placeholder: "#8888A0",
      errorBg: "#3F2E40",
      headerBg: "#1A1A2E",
    },
  };

  const currentTheme = isDarkMode ? themes.dark : themes.light;

  // Load initial settings
  useEffect(() => {
    AsyncStorage.getItem("darkMode").then((value) => {
      setIsDarkMode(value === "true");
    });
    AsyncStorage.getItem("language").then((value) => {
      if (value) setLanguage(value);
    });
  }, []);

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await AsyncStorage.setItem("darkMode", newMode.toString());
  };

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
          : "يرجى إدخال البريد الإلكتروني وكلمة المرور"
      );
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await axios.post("http://192.168.0.23:8000/login", {
        email,
        password,
      });
      const { user_id } = response.data;
      await AsyncStorage.setItem("user_id", user_id);
      router.push("/");
    } catch (error) {
      setError(
        language === "en" ? "Invalid credentials" : "بيانات اعتماد غير صالحة"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: currentTheme.background,
        }}
      >
        <Text
          style={{ color: currentTheme.text, fontFamily: "Poppins-Regular" }}
        >
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.background }}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={currentTheme.headerBg}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 800 }}
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
              backgroundColor: currentTheme.headerBg,
              elevation: 4,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDarkMode ? 0.3 : 0.1,
              shadowRadius: 4,
              borderBottomColor: currentTheme.border,
              borderBottomWidth: 1,
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 8 }}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={currentTheme.text}
              />
            </TouchableOpacity>
            <Image
              source={require("../assets/logo.png")}
              style={{
                width: 100,
                height: 30,
                resizeMode: "contain",
              }}
            />
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={toggleDarkMode}
                style={{
                  marginRight: 12,
                  padding: 8,
                  backgroundColor: currentTheme.secondary,
                  borderRadius: 20,
                }}
              >
                <Ionicons
                  name={isDarkMode ? "sunny" : "moon"}
                  size={18}
                  color={currentTheme.text}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleLanguage}>
                <Text
                  style={{
                    color: currentTheme.text,
                    fontFamily: "Poppins-Medium",
                    fontSize: 14,
                  }}
                >
                  {language === "en" ? "عربي" : "EN"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Form */}
          <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", delay: 300 }}
              style={{ alignItems: "center", marginBottom: 30 }}
            >
              <LinearGradient
                colors={[currentTheme.primary, currentTheme.secondary]}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <Ionicons
                  name="person"
                  size={40}
                  color={currentTheme.userMessageText}
                />
              </LinearGradient>
              <Text
                style={{
                  fontSize: 28,
                  fontFamily: "Poppins-Bold",
                  color: currentTheme.text,
                }}
              >
                {language === "en" ? "Sign In" : "تسجيل الدخول"}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Poppins-Regular",
                  color: currentTheme.placeholder,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                {language === "en"
                  ? "Login to access your Cenomi AI account"
                  : "تسجيل الدخول للوصول إلى حساب سينومي AI الخاص بك"}
              </Text>
            </MotiView>

            <View style={{ marginBottom: 20, spaceY: 16 }}>
              {/* Email Input */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    color: currentTheme.text,
                    fontSize: 14,
                    marginBottom: 6,
                  }}
                >
                  {language === "en" ? "Email" : "البريد الإلكتروني"}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: currentTheme.messageBg,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: currentTheme.border,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={currentTheme.placeholder}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      color: currentTheme.text,
                      fontFamily: "Poppins-Regular",
                      fontSize: 15,
                      textAlign: language === "ar" ? "right" : "left",
                    }}
                    placeholder={
                      language === "en"
                        ? "Enter your email"
                        : "أدخل بريدك الإلكتروني"
                    }
                    placeholderTextColor={currentTheme.placeholder}
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

              {/* Password Input */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    color: currentTheme.text,
                    fontSize: 14,
                    marginBottom: 6,
                  }}
                >
                  {language === "en" ? "Password" : "كلمة المرور"}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: currentTheme.messageBg,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: currentTheme.border,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={currentTheme.placeholder}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    ref={passwordRef}
                    style={{
                      flex: 1,
                      color: currentTheme.text,
                      fontFamily: "Poppins-Regular",
                      fontSize: 15,
                      textAlign: language === "ar" ? "right" : "left",
                    }}
                    placeholder={
                      language === "en"
                        ? "Enter your password"
                        : "أدخل كلمة المرور"
                    }
                    placeholderTextColor={currentTheme.placeholder}
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
                    style={{ padding: 4 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={currentTheme.placeholder}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Error Message */}
              {error ? (
                <Text
                  style={{
                    color: currentTheme.errorBg.includes("FF")
                      ? "#E74C3C"
                      : "#E0E0E6",
                    fontFamily: "Poppins-Regular",
                    fontSize: 13,
                    marginBottom: 10,
                    textAlign: language === "ar" ? "right" : "left",
                  }}
                >
                  {error}
                </Text>
              ) : null}

              {/* Forgot Password */}
              {/* <TouchableOpacity
                onPress={() => console.log("Forgot password")}
                style={{ alignSelf: "flex-end" }}
              >
                <Text
                  style={{
                    color: currentTheme.primary,
                    fontFamily: "Poppins-Medium",
                    fontSize: 13,
                  }}
                >
                  {language === "en" ? "Forgot Password?" : "نسيت كلمة المرور؟"}
                </Text>
              </TouchableOpacity> */}
            </View>

            {/* Sign In Button */}
            {/* <TouchableOpacity
              onPress={handleLogin}
              disabled={!email || !password || isLoading}
              style={{
                backgroundColor:
                  !email || !password || isLoading
                    ? currentTheme.secondary
                    : currentTheme.primary,
                borderRadius: 25,
                paddingVertical: 14,
                alignItems: "center",
                elevation: 2,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
              }}
            >
              {isLoading ? (
                <Ionicons
                  name="refresh"
                  size={20}
                  color={currentTheme.userMessageText}
                  style={{ transform: [{ rotate: "360deg" }] }}
                />
              ) : (
                <Text
                  style={{
                    color: currentTheme.userMessageText,
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 16,
                  }}
                >
                  {language === "en" ? "Sign In" : "تسجيل الدخول"}
                </Text>
              )}
            </TouchableOpacity> */}

            {/* Register Link */}
            {/* <View
              style={{
                marginTop: 20,
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: currentTheme.placeholder,
                  fontFamily: "Poppins-Regular",
                  fontSize: 14,
                }}
              >
                {language === "en"
                  ? "Don't have an account? "
                  : "ليس لديك حساب؟ "}
              </Text>
              <TouchableOpacity onPress={() => console.log("Register")}>
                <Text
                  style={{
                    color: currentTheme.primary,
                    fontFamily: "Poppins-Medium",
                    fontSize: 14,
                  }}
                >
                  {language === "en" ? "Register Now" : "سجل الآن"}
                </Text>
              </TouchableOpacity>
            </View> */}
          </View>
        </MotiView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
