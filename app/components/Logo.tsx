import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '../hooks/useTheme';

// This component will handle rendering the logo with the appropriate version based on theme
const Logo = ({ style, size = { width: 120, height: 60 } }) => {
  const { theme } = useTheme();
  
  // Import SVG files as strings
  const lightLogoXml = require('../../assets/logo.png');
  const darkLogoXml = require('../../assets/darkLogo.svg');
  
  // Choose the logo based on theme
  const logoXml = theme.isDark ? darkLogoXml : lightLogoXml;
  
  return (
    <View style={[styles.container, style]}>
      <SvgXml 
        xml={logoXml} 
        width={size.width} 
        height={size.height} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // You can add additional styling here if needed
  }
});

export default Logo; 