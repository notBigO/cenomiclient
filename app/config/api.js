// API Configuration
const API_CONFIG = {
  // Use your production backend URL here
  PROD_BASE_URL: "http://40.172.7.59:8000",
  // PROD_BASE_URL: "http://192.168.0.29:8000

  // For local development
  DEV_BASE_URL: "http://192.168.0.23:8000",

  // Determine which URL to use based on environment or build type
  get BASE_URL() {
    // You can implement different logic to determine which URL to use
    // For now, we'll use the production URL for the APK
    return this.PROD_BASE_URL;
  },

  // Define API endpoints
  ENDPOINTS: {
    CHAT: "/chat",
    TTS: "/tts",
    MALLS: "/malls",
    LOGIN: "/login",
  },

  // Helper method to get full endpoint URLs
  getUrl(endpoint) {
    const url = `${this.BASE_URL}${endpoint}`;
    console.log(`API Request URL: ${url}`);
    return url;
  },

  // Helper to handle API requests with error logging
  async fetchWithLogging(url, options = {}) {
    console.log(`Making API request to: ${url}`);
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        console.error(`API Error: ${response.status} ${response.statusText}`);
        const errorData = await response.json().catch(() => ({}));
        console.error("Error details:", errorData);
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data = await response.json();
      console.log("API Response Success:", url);
      return data;
    } catch (error) {
      console.error(`API Request Failed: ${url}`, error);
      throw error;
    }
  },
};

export default API_CONFIG;
