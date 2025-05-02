import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
} from "react";
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
  Dimensions,
  Image,
  Linking,
  Modal,
  ActivityIndicator,
  ViewStyle,
  StyleSheet,
  PanResponder,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { MotiView } from "moti";
import { Audio } from "expo-av";
import Reanimated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  PinchGestureHandler,
  TapGestureHandler,
  State,
} from "react-native-gesture-handler";
import API_CONFIG from "./config/api.js";
import SpeechRecognitionManager from "./helpers/SpeechRecognitionManager.js";
import { ThemeProvider, ThemeContext } from "./contexts/ThemeContext";
import Logo from "./components/Logo";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Custom hook to use the theme
const useTheme = () => useContext(ThemeContext);

// Markdown renderer component
const MarkdownText = ({ text, style }) => {
  const parts = text
    .split(/(\*\*[^\*]+\*\*|\*[^\*]+\*)/g)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <Text key={index} style={[style, { fontFamily: "Poppins-Bold" }]}>
            {part.slice(2, -2)}
          </Text>
        );
      } else if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <Text key={index} style={[style, { fontStyle: "italic" }]}>
            {part.slice(1, -1)}
          </Text>
        );
      }
      return (
        <Text key={index} style={style}>
          {part}
        </Text>
      );
    });
  return <Text style={style}>{parts}</Text>;
};

// Typing Indicator Component
const TypingIndicator = () => {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", padding: 10, alignItems: "center" }}>
      <MotiView
        from={{ opacity: 0.4, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: "timing",
          duration: 600,
          loop: true,
          repeatReverse: true,
          delay: 0,
        }}
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.text,
          marginHorizontal: 3,
        }}
      />
      <MotiView
        from={{ opacity: 0.4, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: "timing",
          duration: 600,
          loop: true,
          repeatReverse: true,
          delay: 200,
        }}
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.text,
          marginHorizontal: 3,
        }}
      />
      <MotiView
        from={{ opacity: 0.4, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: "timing",
          duration: 600,
          loop: true,
          repeatReverse: true,
          delay: 400,
        }}
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.text,
          marginHorizontal: 3,
        }}
      />
    </View>
  );
};

// Fix the type error by defining props interface
// Animated Message Component Props Interface
interface AnimatedMessageProps {
  msg: {
    id: number;
    text: string;
    isUser: boolean;
    timestamp?: string;
    images?: Array<{
      url: string;
      alt_text?: string;
    }>;
  };
  index: number;
  language: string;
  playingId: number | null;
  loadingTTS: boolean;
  onPlay: (text: string, id: number) => void;
  onStop: () => void;
}

// Modified AnimatedMessage component with proper typing
const AnimatedMessage: React.FC<AnimatedMessageProps> = ({
  msg,
  index,
  language,
  playingId,
  loadingTTS,
  onPlay,
  onStop,
}) => {
  const { theme } = useTheme();
  // State for tracking images loading and errors
  const [imageLoadError, setImageLoadError] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [messageLoadingTTS, setMessageLoadingTTS] = useState(false);

  // Function to handle play TTS with loading state
  const handlePlayTTS = async (text, id) => {
    setMessageLoadingTTS(true);
    try {
      console.log("AnimatedMessage: Starting TTS for message ID:", id);
      await onPlay(text, id);
    } catch (error) {
      console.error("AnimatedMessage: Error playing TTS:", error);
    } finally {
      console.log("AnimatedMessage: Finished TTS request for message ID:", id);
      setMessageLoadingTTS(false);
    }
  };

  // Determine if this specific message is in loading state
  const isThisMessageLoading =
    messageLoadingTTS || (loadingTTS && playingId === msg.id);
  const isThisMessagePlaying = playingId === msg.id;

  // Log the status of this message
  useEffect(() => {
    if (isThisMessageLoading) {
      console.log(`Message ${msg.id} is in loading state`);
    }
    if (isThisMessagePlaying) {
      console.log(`Message ${msg.id} is currently playing`);
    }
  }, [isThisMessageLoading, isThisMessagePlaying, msg.id]);

  // Function to handle image load errors
  const handleImageError = (imageIndex) => {
    console.error(`Failed to load image at index ${imageIndex}`);
    setImageLoadError((prev) => ({ ...prev, [imageIndex]: true }));
  };

  // Function to open image viewer modal
  const handleImagePress = (imageUrl) => {
    setSelectedImage(imageUrl);
    setModalVisible(true);
  };

  // Close the modal
  const handleCloseModal = () => {
    setModalVisible(false);
  };

  // Image Grid Layout function based on number of images
  const renderImageGrid = (images) => {
    if (!Array.isArray(images) || images.length === 0) return null;

    // Filter out placeholder images with domains like example.com
    const validImages = images.filter(
      (image) =>
        image &&
        image.url &&
        !image.url.includes("example.com") &&
        !image.url.startsWith("@")
    );

    // If no valid images remain after filtering, don't render anything
    if (validImages.length === 0) return null;

    // Function to determine grid layout based on image count
    const getGridStyle = (count: number, index: number): ViewStyle => {
      if (count === 1) {
        return {
          width: "100%",
          aspectRatio: 16 / 9,
          borderRadius: 12,
          marginBottom: 0,
        };
      } else if (count === 2) {
        return {
          width: "49%",
          aspectRatio: 1,
          borderRadius: 10,
        };
      } else if (count === 3) {
        if (index === 0) {
          return {
            width: "100%",
            aspectRatio: 16 / 9,
            borderRadius: 10,
            marginBottom: 4,
          };
        } else {
          return {
            width: "49%",
            aspectRatio: 1,
            borderRadius: 10,
          };
        }
      } else {
        // 4 or more images
        return {
          width: "49%",
          aspectRatio: 1,
          borderRadius: 10,
          marginBottom: index < 2 ? 4 : 0,
        };
      }
    };

    return (
      <View
        style={{
          marginTop: 12,
          marginBottom: 5,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          {/* Display up to 4 images, with a +X indicator if there are more */}
          {validImages.slice(0, 4).map((image, i) => {
            if (!image || !image.url) {
              return null;
            }

            const isLastVisible = i === 3 && validImages.length > 4;
            const remainingCount = validImages.length - 4;

            return (
              <TouchableOpacity
                key={i}
                style={{
                  ...getGridStyle(Math.min(validImages.length, 4), i),
                  position: "relative",
                  overflow: "hidden",
                  backgroundColor: "#f0f0f0",
                }}
                onPress={() => handleImagePress(image.url)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: image.url }}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  onError={() => handleImageError(i)}
                />

                {/* Overlay for showing remaining count */}
                {isLastVisible && (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontFamily: "Poppins-SemiBold",
                        fontSize: 20,
                      }}
                    >
                      +{remainingCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Show caption if any of the images has alt_text */}
        {validImages.some((img) => img?.alt_text) && (
          <Text
            style={{
              fontSize: 12,
              color: "#666",
              marginTop: 6,
              fontStyle: "italic",
            }}
          >
            {validImages[0]?.alt_text || ""}
          </Text>
        )}
      </View>
    );
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: "timing",
        duration: 250,
        delay: index > 10 ? 0 : index * 30,
      }}
      style={{
        marginBottom: 15,
        alignItems: msg.isUser ? "flex-end" : "flex-start",
        maxWidth: msg.isUser ? "85%" : "90%",
        alignSelf: msg.isUser ? "flex-end" : "flex-start",
      }}
    >
      <MotiView
        from={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        transition={{ type: "timing", duration: 200 }}
        style={{
          backgroundColor: msg.isUser
            ? theme.userMessageBg
            : msg.text.includes("only store owners") ||
              msg.text.includes("Invalid tenant")
            ? theme.errorBg
            : theme.messageBg,
          borderRadius: 20,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderTopLeftRadius: msg.isUser ? 20 : 6,
          borderTopRightRadius: msg.isUser ? 6 : 20,
          position: "relative",
        }}
      >
        {!msg.isUser && (
          <View
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              flexDirection: "row",
              zIndex: 10,
            }}
          >
            {isThisMessagePlaying ? (
              <TouchableOpacity
                onPress={() => onStop()}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 4,
                  backgroundColor: theme.isDark
                    ? "rgba(40,42,58,0.8)"
                    : "rgba(255,255,255,0.8)",
                  borderRadius: 12,
                }}
              >
                <Ionicons name="stop" size={16} color={theme.primary} />
              </TouchableOpacity>
            ) : isThisMessageLoading ? (
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 4,
                  backgroundColor: theme.isDark
                    ? "rgba(40,42,58,0.8)"
                    : "rgba(255,255,255,0.8)",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 24,
                  minHeight: 24,
                }}
              >
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => handlePlayTTS(msg.text, msg.id)}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 4,
                  backgroundColor: theme.isDark
                    ? "rgba(40,42,58,0.8)"
                    : "rgba(255,255,255,0.8)",
                  borderRadius: 12,
                  minWidth: 24,
                  minHeight: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="volume-medium"
                  size={16}
                  color={theme.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {msg.isUser ? (
          <Text
            style={{
              color: theme.userMessageText,
              fontFamily: "Poppins-Regular",
              fontSize: 15,
              lineHeight: 22,
              textAlign: language === "ar" ? "right" : "left",
            }}
          >
            {msg.text}
          </Text>
        ) : (
          <View style={{ paddingRight: 28 }}>
            <MarkdownText
              text={msg.text}
              style={{
                color: theme.text,
                fontFamily: "Poppins-Regular",
                fontSize: 15,
                lineHeight: 22,
                textAlign: language === "ar" ? "right" : "left",
              }}
            />

            {/* Display image grid */}
            {renderImageGrid(msg.images)}
          </View>
        )}
      </MotiView>

      {msg.timestamp && (
        <Text
          style={{
            color: theme.placeholder,
            fontSize: 11,
            marginTop: 4,
            marginHorizontal: 4,
            fontFamily: "Poppins-Regular",
            alignSelf: msg.isUser ? "flex-end" : "flex-start",
          }}
        >
          {msg.timestamp}
        </Text>
      )}

      {/* Image viewer modal */}
      <ImageViewerModal
        visible={modalVisible}
        imageUrl={selectedImage}
        onClose={handleCloseModal}
      />
    </MotiView>
  );
};

// Image Viewer Modal Props Interface
interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  imageUrl,
  onClose,
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zoomPercentage, setZoomPercentage] = useState("100%");

  // Reanimated shared values for gestures
  const scale = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Refs for gesture handlers
  const pinchRef = useRef(null);
  const doubleTapRef = useRef(null);

  // Constants for zoom
  const minZoom = 0.5;
  const maxZoom = 2;

  // Create styles with theme access
  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: theme.isDark
        ? "rgba(0, 0, 0, 0.95)"
        : "rgba(0, 0, 0, 0.9)",
      justifyContent: "center",
      alignItems: "center",
    },
    closeButton: {
      position: "absolute",
      top: Platform.OS === "ios" ? 50 : 30,
      right: 20,
      zIndex: 10,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      borderRadius: 20,
      padding: 10,
    },
    topEmptyArea: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "25%",
      width: "100%",
    },
    bottomEmptyArea: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "25%",
      width: "100%",
    },
    imageContainer: {
      width: "100%",
      height: "50%",
      justifyContent: "center",
      alignItems: "center",
    },
    touchContainer: {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    image: {
      width: screenWidth * 0.9,
      height: screenHeight * 0.4,
      maxWidth: screenWidth * 0.9,
      maxHeight: screenHeight * 0.4,
    },
    loader: {
      position: "absolute",
    },
    errorContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    errorText: {
      color: "white",
      marginTop: 10,
      fontFamily: "Poppins-Regular",
    },
    zoomControls: {
      position: "absolute",
      bottom: Platform.OS === "ios" ? 80 : 60,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      borderRadius: 20,
      padding: 5,
    },
    zoomButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 20,
    },
    zoomTextContainer: {
      minWidth: 60,
      alignItems: "center",
      justifyContent: "center",
    },
    zoomText: {
      color: "white",
      fontFamily: "Poppins-Regular",
      fontSize: 14,
    },
    instructions: {
      color: "white",
      position: "absolute",
      bottom: Platform.OS === "ios" ? 40 : 20,
      textAlign: "center",
      fontSize: 12,
      opacity: 0.7,
      fontFamily: "Poppins-Regular",
      width: "100%",
      paddingHorizontal: 20,
    },
  });

  // Function to update zoom percentage
  const updateZoomPercentage = (newScale) => {
    setZoomPercentage(`${Math.round(newScale * 100)}%`);
  };

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setLoading(true);
      setError(false);
      scale.value = 1;
      setZoomPercentage("100%");
    }
  }, [visible, imageUrl]);

  // Handle pinch gesture
  const pinchGestureEvent = useAnimatedGestureHandler({
    onActive: (event: any) => {
      // Use the pinch scale to adjust our scale value
      const newScale = Math.min(Math.max(event.scale, minZoom), maxZoom);
      scale.value = newScale;
      focalX.value = event.focalX || 0;
      focalY.value = event.focalY || 0;

      // We can't update UI state directly in the worklet
      // This will be handled by the + and - buttons instead
    },
    onEnd: () => {
      // Spring back if below minimum scale
      if (scale.value < minZoom) {
        scale.value = withTiming(minZoom, { duration: 200 });
      }
      // Spring back if above maximum scale
      else if (scale.value > maxZoom) {
        scale.value = withTiming(maxZoom, { duration: 200 });
      }
    },
  });

  // Handle double tap to zoom
  const onDoubleTapEvent = (event: any) => {
    if (event.nativeEvent && event.nativeEvent.state === State.ACTIVE) {
      if (scale.value > 1) {
        // Zoom out to normal
        scale.value = withTiming(1, { duration: 250 });
        updateZoomPercentage(1);
      } else {
        // Zoom in to 1.5x
        scale.value = withTiming(1.5, { duration: 250 });
        updateZoomPercentage(1.5);
      }
    }
  };

  // Animated style for the image
  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handleBackgroundPress = () => {
    onClose();
  };

  // Exit if no image URL
  if (!imageUrl) {
    return null;
  }

  return (
    <View>
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent={true}
      >
        <View style={styles.modalContainer}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          {/* Empty area that closes the modal when tapped */}
          <TouchableOpacity
            style={styles.topEmptyArea}
            activeOpacity={1}
            onPress={handleBackgroundPress}
          />

          {/* Image container with gesture handlers */}
          <View style={styles.imageContainer}>
            {loading && !error && (
              <ActivityIndicator
                style={styles.loader}
                size="large"
                color="#FFFFFF"
              />
            )}

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={32}
                  color="#FFFFFF"
                />
                <Text style={styles.errorText}>Failed to load image</Text>
              </View>
            ) : (
              <TapGestureHandler
                ref={doubleTapRef}
                numberOfTaps={2}
                onHandlerStateChange={onDoubleTapEvent}
              >
                <Reanimated.View style={styles.touchContainer}>
                  <PinchGestureHandler
                    ref={pinchRef}
                    onGestureEvent={pinchGestureEvent}
                  >
                    <Reanimated.View style={styles.touchContainer}>
                      <Reanimated.Image
                        source={{ uri: imageUrl }}
                        style={[styles.image, animatedImageStyle]}
                        onLoadStart={() => setLoading(true)}
                        onLoad={() => setLoading(false)}
                        onError={() => {
                          setLoading(false);
                          setError(true);
                        }}
                        resizeMode="contain"
                      />
                    </Reanimated.View>
                  </PinchGestureHandler>
                </Reanimated.View>
              </TapGestureHandler>
            )}
          </View>

          {/* Empty area at bottom that closes the modal when tapped */}
          <TouchableOpacity
            style={styles.bottomEmptyArea}
            activeOpacity={1}
            onPress={handleBackgroundPress}
          />

          {/* Zoom Controls */}
          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => {
                const newScale = Math.max(scale.value - 0.1, minZoom);
                scale.value = withTiming(newScale, { duration: 150 });
                updateZoomPercentage(newScale);
              }}
            >
              <Ionicons name="remove" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.zoomTextContainer}>
              <Text style={styles.zoomText}>{zoomPercentage}</Text>
            </View>

            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => {
                const newScale = Math.min(scale.value + 0.1, maxZoom);
                scale.value = withTiming(newScale, { duration: 150 });
                updateZoomPercentage(newScale);
              }}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Instructions text */}
          <Text style={styles.instructions}>
            Pinch to zoom • Double-tap to zoom • Tap outside to close
          </Text>
        </View>
      </Modal>
    </View>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <HomeScreen />
    </ThemeProvider>
  );
}

function HomeScreen() {
  const { theme, toggleTheme } = useTheme();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [language, setLanguage] = useState("en");
  const [conversationId, setConversationId] = useState(null);
  const [malls, setMalls] = useState([]);
  const [selectedMall, setSelectedMall] = useState(null);
  const [showMallSelector, setShowMallSelector] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [autoPlayTTS, setAutoPlayTTS] = useState(false);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const scrollViewRef = useRef(null);
  // Add a reference to the currently playing sound
  const activeSoundRef = useRef(null);
  // Track which message is currently playing
  const [playingMessageId, setPlayingMessageId] = useState(null);
  // Track global TTS loading state
  const [loadingTTS, setLoadingTTS] = useState(false);

  // Display test image component at the top for debugging
  const [showTestImage, setShowTestImage] = useState(false);

  // Toggle test image with a button press
  const toggleTestImage = () => {
    setShowTestImage(!showTestImage);
  };

  // Use a function to set welcome messages based on language
  const getWelcomeMessages = (lang) => {
    if (lang === "ar") {
      return [
        { id: 1, text: "مرحباً، أنا سينومي AI! 👋", isUser: false },
        { id: 2, text: "كيف يمكنني مساعدتك اليوم؟", isUser: false },
      ];
    } else {
      return [
        { id: 1, text: "Hello, I'm Cenomi AI! 👋", isUser: false },
        { id: 2, text: "How can I help you today?", isUser: false },
      ];
    }
  };

  // Set initial messages
  useEffect(() => {
    setMessages(getWelcomeMessages(language));
  }, [language]);

  const [fontsLoaded] = useFonts({
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
  });

  const dimensions = Dimensions.get("window");
  const isSmallScreen = dimensions.width < 375;

  const loadUserData = async () => {
    try {
      const convId = await AsyncStorage.getItem("conversation_id");
      if (convId) setConversationId(convId);
      const mallId = await AsyncStorage.getItem("selected_mall");
      if (mallId) setSelectedMall(mallId);
      const savedLanguage = await AsyncStorage.getItem("language");
      if (savedLanguage) setLanguage(savedLanguage);
      const ttsAutoPlay = await AsyncStorage.getItem("autoPlayTTS");
      if (ttsAutoPlay) setAutoPlayTTS(ttsAutoPlay === "true");
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const fetchMalls = async () => {
    try {
      console.log("Fetching malls from backend...");
      const data = await API_CONFIG.fetchWithLogging(
        API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.MALLS)
      );
      console.log("Malls data:", JSON.stringify(data));
      setMalls(data);
      if (!selectedMall && data.length > 0) {
        setSelectedMall(data[0].mall_id);
        await AsyncStorage.setItem("selected_mall", data[0].mall_id);
      }
    } catch (error) {
      console.error("Error fetching malls:", error);
    }
  };

  // Initialize user data and malls on component mount
  useEffect(() => {
    loadUserData();
    fetchMalls();
  }, []);

  // Setup Voice recognition listeners
  useEffect(() => {
    // Initialize voice recognition once on component mount
    const setupVoiceRecognition = async () => {
      console.log(
        "Setting up speech recognition with SpeechRecognitionManager"
      );

      // Initialize the manager
      await SpeechRecognitionManager.initialize();

      // Initial setup
      SpeechRecognitionManager.setCallbacks({
        onSpeechStart: () => {
          console.log("Main initial: Speech started");
          setIsRecognizing(true);
        },
        onSpeechEnd: () => {
          console.log("Main initial: Speech ended");
          setIsRecognizing(false);
        },
        onSpeechResults: (transcribedText) => {
          console.log("Main initial: Speech results:", transcribedText);
          setIsRecognizing(false);
          setMessage(transcribedText);
        },
        onSpeechError: (error) => {
          console.error("Main initial: Speech error:", error);
          setIsRecognizing(false);
        },
      });
    };

    setupVoiceRecognition();

    // Cleanup listeners on unmount
    return () => {
      console.log("Cleaning up SpeechRecognitionManager");
      SpeechRecognitionManager.destroy();
    };
  }, []);

  const handleMallChange = async (mallId) => {
    setSelectedMall(mallId);
    setShowMallSelector(false);
    await AsyncStorage.setItem("selected_mall", mallId);
  };

  const toggleLanguage = async () => {
    const newLanguage = language === "en" ? "ar" : "en";
    setLanguage(newLanguage);
    await AsyncStorage.setItem("language", newLanguage);
  };

  const toggleAutoPlayTTS = async () => {
    const newValue = !autoPlayTTS;
    setAutoPlayTTS(newValue);
    await AsyncStorage.setItem("autoPlayTTS", newValue.toString());
  };

  const startRecording = async () => {
    try {
      console.log(
        "Starting voice recording directly with CustomSpeechRecognition..."
      );

      // Import the direct implementation
      const CustomSpeechRecognition =
        require("./helpers/CustomSpeechRecognition").default;

      // Setup callbacks
      CustomSpeechRecognition.setCallbacks({
        onSpeechStart: () => {
          console.log("Main: Speech started");
          setIsRecognizing(true);
        },
        onSpeechEnd: () => {
          console.log("Main: Speech ended");
          setIsRecognizing(false);
        },
        onSpeechResults: (transcribedText) => {
          console.log("Main: Speech results:", transcribedText);
          setIsRecognizing(false);
          setMessage(transcribedText);
        },
        onSpeechError: (error) => {
          console.error("Main: Speech error:", error);
          setIsRecognizing(false);

          // Provide more user-friendly error message
          let errorMessage =
            language === "ar"
              ? "عذراً، لم أتمكن من فهم المدخلات الصوتية. يرجى المحاولة مرة أخرى."
              : "Sorry, I couldn't understand your voice input. Please try again.";

          if (
            error &&
            error.message &&
            error.message.includes("Google app not installed")
          ) {
            errorMessage =
              language === "ar"
                ? "يرجى التأكد من تثبيت تطبيق Google للاستفادة من ميزة التعرف على الكلام."
                : "Please make sure Google app is installed to use speech recognition.";
          }

          setMessages((prev) => [
            ...prev,
            {
              id: prev.length + 1,
              text: errorMessage,
              isUser: false,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ]);
          setTimeout(
            () => scrollViewRef.current?.scrollToEnd({ animated: true }),
            100
          );
        },
      });

      // Set UI state before starting
      setIsRecognizing(true);

      // Configure language for speech recognition
      // Arabic language code is 'ar-SA' for Saudi Arabia, adjust as needed
      const languageOption = language === "ar" ? "ar-SA" : "en-US";
      console.log(
        `Starting voice recognition with language: ${languageOption}`
      );

      // Start recognition
      try {
        await CustomSpeechRecognition.startListening(languageOption);
      } catch (recognitionError) {
        console.error("Recognition error:", recognitionError);
        setIsRecognizing(false);

        // Show more specific error to the user based on the error
        let errorMessage =
          language === "ar"
            ? "حدث خطأ عند محاولة استخدام التعرف على الكلام. يرجى التأكد من أن تطبيق Google مثبت ولديك اتصال بالإنترنت."
            : "There was an error trying to use speech recognition. Please make sure Google app is installed and you have internet connection.";

        if (
          recognitionError.message &&
          recognitionError.message.includes("permission")
        ) {
          errorMessage =
            language === "ar"
              ? "تم رفض إذن الميكروفون. يرجى السماح للتطبيق باستخدام الميكروفون في إعدادات الجهاز."
              : "Microphone permission denied. Please allow the app to use the microphone in device settings.";
        }

        setMessages((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            text: errorMessage,
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);

        setTimeout(
          () => scrollViewRef.current?.scrollToEnd({ animated: true }),
          100
        );
      }
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsRecognizing(false);
      Alert.alert(
        language === "ar" ? "خطأ" : "Error",
        language === "ar"
          ? "فشل بدء التعرف على الكلام. يرجى المحاولة مرة أخرى."
          : "Failed to start speech recognition. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const stopRecording = async () => {
    setIsRecognizing(false);
    if (!isRecognizing) return;

    try {
      console.log("Stopping voice recording using CustomSpeechRecognition");

      // Import the direct implementation
      const CustomSpeechRecognition =
        require("./helpers/CustomSpeechRecognition").default;
      await CustomSpeechRecognition.stopListening();
    } catch (error) {
      console.error("Speech recognition stop error:", error);
      // Make sure UI is updated even if there's an error
      setIsRecognizing(false);
    }
  };

  const playTTS = async (text, messageId = null) => {
    if (!text) return;

    // Stop any current playback first
    await stopTTS();

    try {
      console.log(`Requesting TTS for text: "${text.substring(0, 50)}..."`);

      // Set loading states
      setLoadingTTS(true);
      if (messageId) {
        setPlayingMessageId(messageId);
      }

      // Log the request details for debugging
      console.log("TTS Request:", {
        url: API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.TTS),
        language,
        textLength: text.length,
      });

      let data;
      try {
        data = await API_CONFIG.fetchWithLogging(
          API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.TTS),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, language }),
          }
        );
      } catch (apiError) {
        console.error("TTS API Error:", apiError);
        throw new Error(
          "Failed to fetch audio from server: " +
            (apiError.message || "Unknown error")
        );
      }

      // Handle case where the server returns a success response but without audio data
      if (!data || !data.audio_base64) {
        console.error("TTS API returned no audio data");
        throw new Error("No audio data received from server");
      }

      // Log the response status
      console.log("TTS Response received:", {
        hasAudio: !!data.audio_base64,
        audioLength: data.audio_base64 ? data.audio_base64.length : 0,
      });

      const audioBase64 = data.audio_base64;

      // Validate the base64 string
      if (!/^[A-Za-z0-9+/=]+$/.test(audioBase64)) {
        console.error("Invalid base64 data received");
        throw new Error("Invalid audio data received from server");
      }

      // Create a sound object
      let sound;
      try {
        sound = new Audio.Sound();
        activeSoundRef.current = sound;
      } catch (soundError) {
        console.error("Error creating sound object:", soundError);
        throw new Error("Failed to initialize audio player");
      }

      // Debug the audio URI
      const audioUri = `data:audio/mpeg;base64,${audioBase64}`;
      console.log("Loading audio with URI length:", audioUri.length);

      try {
        console.log("Loading audio...");
        await sound.loadAsync({ uri: audioUri });

        console.log("Playing audio...");
        const playbackStatus = await sound.playAsync();
        console.log("Playback started:", playbackStatus);

        sound.setOnPlaybackStatusUpdate((status) => {
          console.log(
            "Playback status:",
            status.isLoaded
              ? {
                  isPlaying: status.isPlaying,
                  positionMillis: status.positionMillis,
                  durationMillis: status.durationMillis,
                  didJustFinish: status.didJustFinish,
                }
              : { isLoaded: false }
          );

          if (status.isLoaded) {
            const loadedStatus = status;
            if (loadedStatus.didJustFinish) {
              console.log("Playback finished");
              setPlayingMessageId(null);
              sound
                .unloadAsync()
                .catch((err) => console.error("Error unloading sound:", err));
              activeSoundRef.current = null;
            }
          } else {
            console.log("Playback unloaded");
            setPlayingMessageId(null);
            sound
              .unloadAsync()
              .catch((err) => console.error("Error unloading sound:", err));
            activeSoundRef.current = null;
          }
        });
      } catch (error) {
        console.error("Sound playback error:", error);
        if (sound) {
          try {
            await sound.unloadAsync();
          } catch (unloadError) {
            console.error(
              "Error unloading sound after playback failure:",
              unloadError
            );
          }
        }
        activeSoundRef.current = null;
        setPlayingMessageId(null);
        throw error;
      }
    } catch (error) {
      console.error("TTS Error:", error);
      // Clear the playing message ID to remove the loading state
      setPlayingMessageId(null);

      // Show an error toast or message
      Alert.alert(
        language === "ar" ? "خطأ في تشغيل الصوت" : "Audio Playback Error",
        language === "ar"
          ? "عذراً، لم أتمكن من تشغيل الاستجابة الصوتية. يرجى المحاولة مرة أخرى."
          : "Sorry, I couldn't play the audio response. Please try again."
      );
    } finally {
      setLoadingTTS(false);
    }
  };

  const sendMessage = async (textOverride = null) => {
    const inputText =
      textOverride || (typeof message === "string" ? message.trim() : "");
    if (!inputText || !selectedMall) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsTyping(true);

    // Scroll to end after user message
    setTimeout(
      () => scrollViewRef.current?.scrollToEnd({ animated: true }),
      100
    );

    try {
      const backendUrl = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.CHAT);
      const requestBody = {
        text: userMessage.text,
        conversation_id: conversationId,
        language: language,
        mall_id: parseInt(selectedMall),
        include_tts: autoPlayTTS,
      };

      console.log(`Sending message to backend: ${JSON.stringify(requestBody)}`);

      const data = await API_CONFIG.fetchWithLogging(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      // Detailed console debugging to see exactly what's in the response
      console.log("Full API response:", JSON.stringify(data));
      console.log(
        "Images structure:",
        data.images ? JSON.stringify(data.images) : "No images"
      );

      const botResponse = {
        id: messages.length + 2,
        text: data.message || "No response received.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        images: data.images || [],
      };

      // Log what's being stored in the message object
      console.log(
        "Bot message with images:",
        JSON.stringify(botResponse.images)
      );

      setMessages((prev) => [...prev, botResponse]);
      setConversationId(data.conversation_id);
      await AsyncStorage.setItem("conversation_id", data.conversation_id);

      if (autoPlayTTS && data.audio_base64) {
        try {
          // Stop any current playback first
          await stopTTS();

          // Set loading state
          setLoadingTTS(true);
          setPlayingMessageId(botResponse.id);

          console.log("Auto-play TTS: Processing audio from response");

          // Validate the base64 string
          if (
            !data.audio_base64 ||
            !/^[A-Za-z0-9+/=]+$/.test(data.audio_base64)
          ) {
            console.error("Auto-play TTS: Invalid base64 data received");
            throw new Error("Invalid audio data received from server");
          }

          // Create a new sound object
          let autoPlaySound;
          try {
            autoPlaySound = new Audio.Sound();
            activeSoundRef.current = autoPlaySound;
          } catch (soundError) {
            console.error(
              "Auto-play TTS: Error creating sound object:",
              soundError
            );
            throw new Error("Failed to initialize audio player");
          }

          const audioUri = `data:audio/mpeg;base64,${data.audio_base64}`;
          console.log(
            "Auto-play TTS: Loading audio with length:",
            data.audio_base64.length
          );

          try {
            await autoPlaySound.loadAsync({ uri: audioUri });
            console.log("Auto-play TTS: Audio loaded successfully");

            const playbackStatus = await autoPlaySound.playAsync();
            console.log("Auto-play TTS: Playback started:", playbackStatus);

            autoPlaySound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded) {
                const loadedStatus = status;
                if (loadedStatus.didJustFinish) {
                  console.log("Auto-play TTS: Playback finished");
                  setPlayingMessageId(null);
                  autoPlaySound
                    .unloadAsync()
                    .catch((err) =>
                      console.error("Error unloading sound:", err)
                    );
                  activeSoundRef.current = null;
                }
              } else {
                console.log("Auto-play TTS: Playback unloaded");
                setPlayingMessageId(null);
                autoPlaySound
                  .unloadAsync()
                  .catch((err) => console.error("Error unloading sound:", err));
                activeSoundRef.current = null;
              }
            });
          } catch (playError) {
            console.error("Auto-play TTS: Error during playback:", playError);
            if (autoPlaySound) {
              try {
                await autoPlaySound.unloadAsync();
              } catch (unloadError) {
                console.error(
                  "Auto-play TTS: Error unloading sound after failure:",
                  unloadError
                );
              }
            }
            activeSoundRef.current = null;
            setPlayingMessageId(null);
            throw playError;
          }
        } catch (error) {
          console.error("Auto-play TTS Error:", error);
          setPlayingMessageId(null);
          // Don't show alert for auto-play errors to avoid disrupting the flow
          console.log(
            "Auto-play TTS failed silently, user can still manually play audio if needed"
          );
        } finally {
          setLoadingTTS(false);
        }
      }
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMessage = {
        id: messages.length + 2,
        text:
          language === "ar"
            ? "عذراً، حدث خطأ ما. يرجى المحاولة مرة أخرى لاحقاً."
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
    }
  };

  const clearChat = async () => {
    setMessages(getWelcomeMessages(language));
    setConversationId(null);
    await AsyncStorage.removeItem("conversation_id");
  };

  const quickPrompts = {
    en: [
      "What's the nearest mall?",
      "Show me dining options",
      "Any events this weekend?",
      "Find a clothing store",
    ],
    ar: [
      "ما هو أقرب مركز تجاري؟",
      "أرني خيارات الطعام",
      "هل هناك فعاليات هذا الأسبوع؟",
      "ابحث عن متجر ملابس",
    ],
  };

  // Add keyboard state tracking
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Add keyboard listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <Text style={{ color: theme.text, fontFamily: "Poppins-Regular" }}>
          Loading...
        </Text>
      </View>
    );
  }

  const getCurrentMallName = () => {
    const mall = malls.find((m) => m.mall_id.toString() === selectedMall);
    return mall
      ? mall.name_en
      : language === "en"
      ? "Select a mall"
      : "اختر مركزًا تجاريًا";
  };

  // Function to stop any currently playing TTS
  const stopTTS = async () => {
    console.log("Stopping TTS playback");
    if (activeSoundRef.current) {
      try {
        console.log("Active sound found, stopping...");
        // First stop the playback
        await activeSoundRef.current
          .stopAsync()
          .catch((err) => console.log("Error stopping sound:", err));

        // Then unload the sound
        await activeSoundRef.current
          .unloadAsync()
          .catch((err) => console.log("Error unloading sound:", err));

        console.log("Sound stopped and unloaded successfully");
        activeSoundRef.current = null;

        // Always reset the playingMessageId when stopping
        setPlayingMessageId(null);
        // Reset loading state
        setLoadingTTS(false);
      } catch (error) {
        console.error("Error stopping TTS playback:", error);
        // Make sure we cleanup even if there's an error
        activeSoundRef.current = null;
        setPlayingMessageId(null);
        setLoadingTTS(false);
      }
    } else {
      console.log("No active sound to stop");
      // Always reset these states
      setPlayingMessageId(null);
      setLoadingTTS(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.headerBg}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: Platform.OS === "android" ? 50 : 15,
              paddingBottom: 15,
              backgroundColor: theme.headerBg,
              borderBottomColor: theme.border,
              borderBottomWidth: 1,
              elevation: 2,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              {/* Logo with light/dark mode support */}
              <View
                style={{
                  backgroundColor: "transparent",
                  padding: theme.isDark ? 8 : 0,
                  borderRadius: theme.isDark ? 8 : 0,
                }}
              >
                <Logo
                  style={{
                    opacity: theme.isDark ? 1 : 1,
                  }}
                  size={{
                    width: dimensions.width * 0.25,
                    height: 30,
                  }}
                />
              </View>
              {/* Test button - only show in development */}
              {__DEV__ && (
                <TouchableOpacity
                  onPress={toggleTestImage}
                  style={{
                    marginLeft: 10,
                    backgroundColor: "#f0f0f0",
                    padding: 5,
                    borderRadius: 5,
                  }}
                >
                  <Text style={{ fontSize: 10 }}>Test</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {/* Theme toggle button */}
              <TouchableOpacity
                onPress={toggleTheme}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: theme.secondary,
                  borderRadius: 16,
                  marginRight: 10,
                }}
              >
                <Ionicons
                  name={theme.isDark ? "sunny-outline" : "moon-outline"}
                  size={isSmallScreen ? 14 : 16}
                  color={theme.text}
                />
              </TouchableOpacity>

              {/* Language toggle button */}
              <TouchableOpacity
                onPress={toggleLanguage}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: theme.secondary,
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{
                    color: theme.text,
                    fontFamily: "Poppins-Medium",
                    fontSize: isSmallScreen ? 12 : 14,
                  }}
                >
                  {language === "en" ? "عربي" : "EN"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Mall Selection */}
          <TouchableOpacity
            onPress={() => setShowMallSelector(!showMallSelector)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 15,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              backgroundColor: theme.background,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                maxWidth: "85%",
              }}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color={theme.primary}
                style={{ marginRight: 10 }}
              />
              <Text
                style={{
                  fontFamily: "Poppins-Medium",
                  color: theme.text,
                  fontSize: isSmallScreen ? 13 : 15,
                  flexShrink: 1,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {getCurrentMallName()}
              </Text>
            </View>
            <Ionicons
              name={showMallSelector ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.text}
            />
          </TouchableOpacity>

          {showMallSelector && (
            <MotiView
              from={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ type: "spring", damping: 18 }}
              style={{
                backgroundColor: theme.background,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                paddingHorizontal: 20,
                paddingBottom: 15,
                maxHeight: dimensions.height * 0.3,
              }}
            >
              <ScrollView
                style={{ maxHeight: dimensions.height * 0.25 }}
                showsVerticalScrollIndicator={false}
              >
                {malls.map((mall) => (
                  <MotiView
                    key={mall.mall_id}
                    from={{ opacity: 0, translateX: -5 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{
                      type: "timing",
                      duration: 300,
                      delay: (50 * malls.indexOf(mall)) % malls.length,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => handleMallChange(mall.mall_id)}
                      style={{
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                        backgroundColor:
                          mall.mall_id.toString() === selectedMall
                            ? theme.secondary
                            : "transparent",
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        marginTop: 8,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            mall.mall_id.toString() === selectedMall
                              ? theme.primary
                              : theme.text,
                          fontFamily:
                            mall.mall_id.toString() === selectedMall
                              ? "Poppins-Medium"
                              : "Poppins-Regular",
                          fontSize: isSmallScreen ? 13 : 15,
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {mall.name_en}
                      </Text>
                    </TouchableOpacity>
                  </MotiView>
                ))}
              </ScrollView>
            </MotiView>
          )}

          {/* Chat Area */}
          <View style={{ flex: 1 }}>
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{
                padding: 15,
                paddingBottom: 20,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 2 && (
                <MotiView
                  from={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "timing", duration: 250 }}
                  style={{ marginBottom: 25 }}
                >
                  <Text
                    style={{
                      color: theme.placeholder,
                      fontFamily: "Poppins-Medium",
                      marginBottom: 12,
                      fontSize: isSmallScreen ? 13 : 15,
                    }}
                  >
                    {language === "en" ? "Try asking about:" : "جرب السؤال عن:"}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 8 }}
                  >
                    {quickPrompts[language].map((prompt, index) => (
                      <MotiView
                        key={`prompt-${index}`}
                        from={{ opacity: 0, translateX: -5 }}
                        animate={{ opacity: 1, translateX: 0 }}
                        transition={{
                          type: "timing",
                          duration: 200,
                          delay: 200 + index * 50,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => sendMessage(prompt)}
                          style={{
                            backgroundColor: theme.secondary,
                            borderRadius: 20,
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                            marginRight: 10,
                            borderWidth: 1,
                            borderColor: theme.border,
                          }}
                        >
                          <Text
                            style={{
                              color: theme.text,
                              fontFamily: "Poppins-Regular",
                              fontSize: isSmallScreen ? 12 : 14,
                            }}
                          >
                            {prompt}
                          </Text>
                        </TouchableOpacity>
                      </MotiView>
                    ))}
                  </ScrollView>
                </MotiView>
              )}

              {messages.map((msg, index) => (
                <AnimatedMessage
                  key={msg.id}
                  msg={msg}
                  index={index}
                  language={language}
                  playingId={playingMessageId}
                  loadingTTS={loadingTTS}
                  onPlay={playTTS}
                  onStop={stopTTS}
                />
              ))}

              {isTyping && (
                <MotiView
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: "spring", stiffness: 150, damping: 15 }}
                  style={{
                    marginBottom: 15,
                    alignItems: "flex-start",
                    alignSelf: "flex-start",
                    backgroundColor: theme.messageBg,
                    borderRadius: 20,
                    borderTopLeftRadius: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 4,
                    shadowColor: theme.isDark ? "#000" : "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: theme.isDark ? 0.2 : 0.08,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                >
                  <TypingIndicator />
                </MotiView>
              )}
            </ScrollView>
          </View>

          {/* Input Area with STT Controls */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.border,
              backgroundColor: theme.background,
              paddingBottom: Platform.OS === "ios" ? 20 : 10,
              paddingTop: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 15,
                backgroundColor: theme.background,
              }}
            >
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: theme.inputBg,
                  borderRadius: 25,
                  overflow: "hidden",
                }}
              >
                <TouchableOpacity
                  onPress={isRecognizing ? stopRecording : startRecording}
                  style={{
                    padding: 12,
                    backgroundColor: isRecognizing
                      ? theme.primary
                      : "transparent",
                    borderRadius: isRecognizing ? 20 : 0,
                  }}
                >
                  <Ionicons
                    name={isRecognizing ? "stop" : "mic"}
                    size={20}
                    color={isRecognizing ? theme.userMessageText : theme.text}
                  />
                </TouchableOpacity>
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 15,
                    color: theme.text,
                    fontFamily: "Poppins-Regular",
                    textAlign: language === "ar" ? "right" : "left",
                    writingDirection: language === "ar" ? "rtl" : "ltr",
                    maxHeight: 100,
                    fontSize: isSmallScreen ? 13 : 15,
                  }}
                  placeholder={
                    language === "en"
                      ? "Message Cenomi AI..."
                      : "راسل سينومي AI..."
                  }
                  placeholderTextColor={theme.placeholder}
                  value={message}
                  onChangeText={(text) => setMessage(text || "")}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                    sendMessage();
                  }}
                  returnKeyType="send"
                  multiline
                />
                {playingMessageId ? (
                  <TouchableOpacity
                    onPress={stopTTS}
                    style={{
                      padding: 12,
                      backgroundColor: theme.primary + "20", // Semi-transparent
                      borderRadius: 20,
                      marginRight: 5,
                    }}
                  >
                    <Ionicons
                      name="stop-circle"
                      size={20}
                      color={theme.primary}
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={toggleAutoPlayTTS}
                    style={{
                      padding: 12,
                    }}
                  >
                    <Ionicons
                      name={autoPlayTTS ? "volume-high" : "volume-mute"}
                      size={20}
                      color={autoPlayTTS ? theme.primary : theme.placeholder}
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => sendMessage()}
                  disabled={!message?.trim() || !selectedMall || isTyping}
                  style={{
                    backgroundColor:
                      message?.trim() && selectedMall && !isTyping
                        ? theme.primary
                        : theme.secondary,
                    borderRadius: 25,
                    padding: 12,
                    marginRight: 5,
                  }}
                >
                  <Ionicons
                    name="paper-plane-outline"
                    size={20}
                    color={
                      message?.trim() && selectedMall && !isTyping
                        ? theme.userMessageText
                        : theme.placeholder
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={clearChat}
              style={{
                alignSelf: "center",
                marginTop: 8,
                paddingVertical: 4,
                paddingHorizontal: 10,
              }}
            >
              <Text
                style={{
                  color: theme.placeholder,
                  fontFamily: "Poppins-Medium",
                  fontSize: isSmallScreen ? 11 : 13,
                }}
              >
                {language === "en" ? "Clear conversation" : "مسح المحادثة"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
