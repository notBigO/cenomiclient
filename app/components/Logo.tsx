import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

// This component will handle rendering the logo with the appropriate version based on theme
const Logo = ({ style, size = { width: 120, height: 60 } }) => {
  // Import regular PNG image
  const { theme } = useTheme();
  const logoImage = require('../../assets/logo.png');
  const darkLogo = require('../../assets/dark_mode_logo_fully_cleaned.png');
  
  return (
    <View style={[styles.container, style]}>
        {theme.isDark ? 
      <Image
        source={darkLogo}
        style={{
          width: size.width,
          height: size.height,
          resizeMode: 'contain'
        }}
      />
      :
      <Image
        source={logoImage}
        style={{
          width: size.width,
          height: size.height,
          resizeMode: 'contain'
        }}
      />
      }
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // You can add additional styling here if needed
  }
});

export default Logo; 