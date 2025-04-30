import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { MotiView } from "moti";
import { Audio } from "expo-av";
import Voice from "@react-native-voice/voice";
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

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

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
const TypingIndicator = () => (
  <View style={{ flexDirection: "row", padding: 10, alignItems: "center" }}>
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#303342",
        marginHorizontal: 2,
        opacity: 0.4,
      }}
    />
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#303342",
        marginHorizontal: 2,
        opacity: 0.7,
      }}
    />
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#303342",
        marginHorizontal: 2,
        opacity: 1,
      }}
    />
  </View>
);

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
  onPlay: (text: string, id: number) => void;
  onStop: () => void;
}

// Modified AnimatedMessage component with proper typing
const AnimatedMessage: React.FC<AnimatedMessageProps> = ({
  msg,
  index,
  language,
  playingId,
  onPlay,
  onStop,
}) => {
  // State for tracking images loading and errors
  const [imageLoadError, setImageLoadError] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

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
          {images.slice(0, 4).map((image, i) => {
            if (!image || !image.url) {
              return null;
            }

            const isLastVisible = i === 3 && images.length > 4;
            const remainingCount = images.length - 4;

            return (
              <TouchableOpacity
                key={i}
                style={{
                  ...getGridStyle(Math.min(images.length, 4), i),
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
        {images.some((img) => img?.alt_text) && (
          <Text
            style={{
              fontSize: 12,
              color: "#666",
              marginTop: 6,
              fontStyle: "italic",
            }}
          >
            {images[0]?.alt_text || ""}
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
            ? "#6C5CE7"
            : msg.text.includes("only store owners") ||
              msg.text.includes("Invalid tenant")
            ? "#FFEEF0"
            : "#F3F3FF",
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
            {playingId === msg.id ? (
              <TouchableOpacity
                onPress={() => onStop()}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 4,
                  backgroundColor: "rgba(255,255,255,0.8)",
                  borderRadius: 12,
                }}
              >
                <Ionicons name="stop" size={16} color="#6C5CE7" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => onPlay(msg.text, msg.id)}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 4,
                  backgroundColor: "rgba(255,255,255,0.8)",
                  borderRadius: 12,
                }}
              >
                <Ionicons name="volume-medium" size={16} color="#6C5CE7" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {msg.isUser ? (
          <Text
            style={{
              color: "#FFFFFF",
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
                color: "#303342",
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
            color: "#A0A0B9",
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
              <Ionicons name="alert-circle-outline" size={32} color="#FFFFFF" />
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
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
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

export default function HomeScreen() {
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

  const theme = {
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
    tabActive: "#6C5CE7",
    tabInactive: "#F0F0F7",
    inputBg: "#F5F5F7",
  };

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
      const response = await fetch("http://192.168.0.44:8000/malls");
      const data = await response.json();
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
    // (individual recording sessions will reinitialize as needed)
    const setupVoiceListeners = () => {
      Voice.onSpeechStart = () => {
        console.log("Speech started");
      };
      Voice.onSpeechRecognized = () => {
        console.log("Speech recognized");
      };
      Voice.onSpeechEnd = () => {
        console.log("Speech ended");
        setIsRecognizing(false);
      };
      Voice.onSpeechError = (error) => {
        console.error("Speech error:", error);
        setIsRecognizing(false);
        setMessages((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            text: "Sorry, I couldn't understand your voice input. Please try again.",
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
      };
      Voice.onSpeechResults = (event) => {
        if (event.value && event.value.length > 0) {
          const transcribedText = event.value[0];
          console.log("Speech results:", transcribedText);
          // Show transcribed text in input instead of auto-sending
          setMessage(transcribedText);
        }
      };
    };

    setupVoiceListeners();

    // Cleanup listeners on unmount
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
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
      // Request microphone permission
      if (permissionResponse.status !== "granted") {
        const response = await requestPermission();
        if (response.status !== "granted") {
          alert(
            language === "ar"
              ? "يلزم إذن الميكروفون لإدخال الصوت."
              : "Microphone permission is required for voice input."
          );
          return;
        }
      }

      // On Android, we need to check for RECORD_AUDIO permission too
      if (Platform.OS === "android") {
        try {
          const granted = await Voice.isRecognizing();
          if (granted) {
            // Already recording, stop it first
            await Voice.stop();
          }
        } catch (error) {
          console.error("Failed to check voice recognition status:", error);
        }
      }

      // Always ensure we're not already recording and reset voice recognition
      try {
        await Voice.destroy();
        // Reinitialize voice recognition to reset its state
        Voice.onSpeechStart = () => {
          console.log("Speech started");
        };
        Voice.onSpeechRecognized = () => {
          console.log("Speech recognized");
        };
        Voice.onSpeechEnd = () => {
          console.log("Speech ended");
          setIsRecognizing(false);
        };
        Voice.onSpeechError = (error) => {
          console.error("Speech error:", error);
          setIsRecognizing(false);
          setMessages((prev) => [
            ...prev,
            {
              id: prev.length + 1,
              text:
                language === "ar"
                  ? "عذراً، لم أتمكن من فهم المدخلات الصوتية. يرجى المحاولة مرة أخرى."
                  : "Sorry, I couldn't understand your voice input. Please try again.",
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
        };
        Voice.onSpeechResults = (event) => {
          if (event.value && event.value.length > 0) {
            const transcribedText = event.value[0];
            console.log("Speech results:", transcribedText);
            setMessage(transcribedText);
          }
        };
      } catch (error) {
        console.error("Error resetting voice recognition:", error);
      }

      // Add a small delay to ensure everything is properly reset
      await new Promise((resolve) => setTimeout(resolve, 100));

      setIsRecognizing(true);

      // Configure language for speech recognition
      // Arabic language code is 'ar-SA' for Saudi Arabia, adjust as needed
      const languageOption = language === "ar" ? "ar-SA" : "en-US";
      console.log(
        `Starting voice recognition with language: ${languageOption}`
      );

      await Voice.start(languageOption);
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsRecognizing(false);
      alert(
        language === "ar"
          ? "فشل بدء التعرف على الكلام. يرجى المحاولة مرة أخرى."
          : "Failed to start speech recognition. Please try again."
      );
    }
  };

  const stopRecording = async () => {
    if (!isRecognizing) return;

    try {
      await Voice.stop();
      setIsRecognizing(false);
    } catch (error) {
      console.error("Speech recognition stop error:", error);
    }
  };

  const playTTS = async (text, messageId = null) => {
    if (!text) return;

    // Stop any current playback first
    await stopTTS();

    try {
      const response = await fetch("http://192.168.0.44:8000/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `TTS request failed: ${errorData.detail || response.statusText}`
        );
      }
      const data = await response.json();
      if (!data.audio_base64) {
        throw new Error("No audio_base64 data received from TTS endpoint.");
      }
      const audioBase64 = data.audio_base64;
      if (!/^[A-Za-z0-9+/=]+$/.test(audioBase64)) {
        throw new Error("Invalid base64 string received.");
      }

      const sound = new Audio.Sound();
      activeSoundRef.current = sound;

      if (messageId) {
        setPlayingMessageId(messageId);
      }

      try {
        await sound.loadAsync({ uri: `data:audio/mpeg;base64,${audioBase64}` });
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            const loadedStatus = status;
            if (loadedStatus.didJustFinish) {
              setPlayingMessageId(null);
              sound.unloadAsync().catch(() => {});
              activeSoundRef.current = null;
            }
          } else {
            setPlayingMessageId(null);
            sound.unloadAsync().catch(() => {});
            activeSoundRef.current = null;
          }
        });
      } catch (error) {
        setPlayingMessageId(null);
        sound.unloadAsync().catch(() => {});
        activeSoundRef.current = null;
        throw error;
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setPlayingMessageId(null);
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text:
            language === "ar"
              ? "عذراً، لم أتمكن من تشغيل الاستجابة الصوتية. يرجى المحاولة مرة أخرى."
              : "Sorry, I couldn't play the audio response. Please try again.",
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
  };

  const handleSend = async (textOverride = null) => {
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

    try {
      const backendUrl = "http://192.168.0.44:8000/chat";
      const requestBody = {
        text: userMessage.text,
        conversation_id: conversationId,
        language: language,
        mall_id: parseInt(selectedMall),
        include_tts: autoPlayTTS,
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

          const sound = new Audio.Sound();
          activeSoundRef.current = sound;
          setPlayingMessageId(botResponse.id);

          await sound.loadAsync({
            uri: `data:audio/mpeg;base64,${data.audio_base64}`,
          });
          await sound.playAsync();
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded) {
              const loadedStatus = status;
              if (loadedStatus.didJustFinish) {
                setPlayingMessageId(null);
                sound.unloadAsync().catch(() => {});
                activeSoundRef.current = null;
              }
            } else {
              setPlayingMessageId(null);
              sound.unloadAsync().catch(() => {});
              activeSoundRef.current = null;
            }
          });
        } catch (error) {
          console.error("Auto-play TTS Error:", error);
          setPlayingMessageId(null);
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
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        100
      );
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
    if (activeSoundRef.current) {
      try {
        await activeSoundRef.current.stopAsync();
        await activeSoundRef.current.unloadAsync();
        activeSoundRef.current = null;
        setPlayingMessageId(null);
      } catch (error) {
        console.error("Error stopping playback:", error);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.headerBg} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 15,
              backgroundColor: theme.headerBg,
              borderBottomColor: theme.border,
              borderBottomWidth: 1,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={require("../assets/logo.png")}
                style={{
                  width: dimensions.width * 0.25,
                  height: 30,
                  resizeMode: "contain",
                }}
              />
              {/* Add debug button */}
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
            </View>
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
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1, paddingHorizontal: 15, paddingTop: 15 }}
            contentContainerStyle={{ paddingBottom: 20 }}
            onContentSizeChange={() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }
            showsVerticalScrollIndicator={false}
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
                        onPress={() => handleSend(prompt)}
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

            {messages.map((msg, idx) => {
              // Add debugging for each message as it's rendered
              if (!msg.isUser && msg.images && Array.isArray(msg.images)) {
                console.log(
                  `Rendering message ${msg.id} with ${msg.images.length} images`
                );
              }

              return (
                <AnimatedMessage
                  key={`message-${msg.id}`}
                  msg={msg}
                  index={idx}
                  language={language}
                  playingId={playingMessageId}
                  onPlay={(text, id) => playTTS(text, id)}
                  onStop={stopTTS}
                />
              );
            })}

            {isTyping && (
              <View
                style={{
                  marginBottom: 15,
                  alignItems: "flex-start",
                  maxWidth: dimensions.width * 0.25,
                  backgroundColor: theme.messageBg,
                  borderRadius: 20,
                  borderTopLeftRadius: 4,
                  padding: 4,
                }}
              >
                <TypingIndicator />
              </View>
            )}
          </ScrollView>

          {/* Input Area with STT Controls */}
          <MotiView
            from={{ translateY: 20, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            transition={{ type: "timing", duration: 300 }}
            style={{
              paddingHorizontal: 15,
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: theme.border,
              backgroundColor: theme.background,
            }}
          >
            <View
              style={{
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
                onSubmitEditing={() => handleSend()}
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
                onPress={() => handleSend()}
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

            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: "timing", duration: 500, delay: 500 }}
            >
              <TouchableOpacity
                onPress={clearChat}
                style={{
                  alignSelf: "center",
                  marginTop: 10,
                  paddingVertical: 5,
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
            </MotiView>
          </MotiView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
