import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

// Theme definitions
export const lightTheme = {
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
  cardBg: "#FFFFFF",
  isDark: false,
};

export const darkTheme = {
  background: "#1A1C2A",
  text: "#E4E6F1",
  primary: "#8A7BFF",
  secondary: "#2D2F3E",
  messageBg: "#2D2F3E",
  userMessageBg: "#8A7BFF",
  userMessageText: "#FFFFFF",
  border: "#3A3E52",
  placeholder: "#8A8CA0",
  errorBg: "#4A3034",
  headerBg: "#222436",
  tabActive: "#8A7BFF",
  tabInactive: "#2D2F3E",
  inputBg: "#2D2F3E",
  cardBg: "#222436",
  isDark: true,
};

// Create Theme Context
export const ThemeContext = createContext({
  theme: lightTheme,
  toggleTheme: () => {},
});

// Theme Provider Component
export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    // Load saved theme preference
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme_preference');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        } else {
          // Use system preference if no saved preference
          setIsDarkMode(systemColorScheme === 'dark');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, [systemColorScheme]);
  
  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      await AsyncStorage.setItem('theme_preference', newMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };
  
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}; 