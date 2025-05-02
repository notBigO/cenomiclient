import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

// Custom hook to use the theme
export const useTheme = () => useContext(ThemeContext); 