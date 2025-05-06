// API Configuration
const API_CONFIG = {
  // Use your production backend URL here
  PROD_BASE_URL: "http://3.28.252.58:8000",  
  // PROD_BASE_URL: "http://3.29.133.32:8000",

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
    CHAT_STREAM: "/chat-stream",
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

  // Helper to handle streaming API requests
  async fetchStream(url, options = {}, onChunk, onComplete, onError) {
    console.log(`Making streaming API request to: ${url}`);
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        console.error(`API Error: ${response.status} ${response.statusText}`);
        throw new Error(`Request failed with status ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error("ReadableStream not supported in this browser");
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partialLine = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (partialLine) {
            // Process any remaining data
            try {
              onChunk(partialLine);
            } catch (e) {
              console.error("Error processing final chunk:", e);
            }
          }
          onComplete();
          break;
        }
        
        // Decode the stream chunk and split by lines
        const chunk = decoder.decode(value, { stream: true });
        const lines = (partialLine + chunk).split('\n');
        partialLine = lines.pop() || ''; // Last line might be incomplete
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              // Most likely JSON, but handle plain text too
              let parsedData;
              try {
                parsedData = JSON.parse(line);
              } catch (e) {
                parsedData = { message: line };
              }
              onChunk(parsedData);
            } catch (e) {
              console.error("Error processing chunk:", e, line);
            }
          }
        }
      }
      
    } catch (error) {
      console.error(`Streaming API Request Failed: ${url}`, error);
      onError && onError(error);
      throw error;
    }
  },
};

export default API_CONFIG;
