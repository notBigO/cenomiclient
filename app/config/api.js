// API Configuration
const API_CONFIG = {
  // Use your production backend URL here
  PROD_BASE_URL: "http://192.168.1.5:8000",
  // PROD_BASE_URL: "http://3.29.133.32:8000",

  // For local development
  DEV_BASE_URL: "http://192.168.1.5:8000",

  // API Authentication token
  AUTH_TOKEN:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkdW1teSIsImV4cCI6MTc3ODMxMDA3Niwic2NvcGUiOiJpbnRlcm5hbCJ9._bgNhCJ-qHv1fbeTiGVm7NQRvmF3WMSQWWL_Ou7AizE",

  // Determine which URL to use based on environment or build type
  get BASE_URL() {
    // You can implement different logic to determine which URL to use
    // For now, we'll use the production URL for the APK
    return this.PROD_BASE_URL;
  },

  // Define API endpoints
  ENDPOINTS: {
    CHAT: "/chat/stream",
    CHAT_REGULAR: "/chat",
    TTS: "/tts",
    MALLS: "/malls",
    LOGIN: "/login",
  },

  // Set auth token to be used for all API requests
  setAuthToken(token) {
    this.AUTH_TOKEN = token;
    console.log(`API auth token set: ${token ? "Token provided" : "No token"}`);
  },

  // Get the current auth token
  getAuthToken() {
    return this.AUTH_TOKEN;
  },

  // Helper method to get full endpoint URLs
  getUrl(endpoint) {
    const url = `${this.BASE_URL}${endpoint}`;
    console.log(`API Request URL: ${url}`);
    return url;
  },

  // Get default headers with auth token
  getHeaders(customHeaders = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...customHeaders,
    };

    // Add auth token if available
    if (this.AUTH_TOKEN) {
      headers["Authorization"] = `Bearer ${this.AUTH_TOKEN}`;
    }

    return headers;
  },

  // Get specific headers for streaming requests
  getStreamingHeaders() {
    return this.getHeaders({
      Accept: "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
  },

  // Helper to handle API requests with error logging
  async fetchWithLogging(url, options = {}) {
    console.log(`Making API request to: ${url}`);

    // Add default headers with auth token
    options.headers = {
      ...this.getHeaders(options.headers),
    };

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

  // Helper to handle streaming requests
  async fetchStream(url, body, onChunk) {
    console.log(`Making streaming request to: ${url}`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getStreamingHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.error(
          `Stream API Error: ${response.status} ${response.statusText}`
        );
        const errorText = await response.text();
        throw new Error(
          `Streaming request failed with status ${response.status}: ${errorText}`
        );
      }

      // React Native doesn't fully support ReadableStream API, so we need to use text()
      console.log("Using text() to handle streaming in React Native");
      const responseText = await response.text();

      // Split the response by lines and process each line
      const lines = responseText.split("\n");
      console.log(`Received ${lines.length} lines from server`);

      // Process each line
      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const data = JSON.parse(line);
          onChunk(data);
        } catch (err) {
          console.error("Error parsing stream chunk:", err);
          // If not JSON, pass the raw line
          onChunk({ type: "raw", content: line });
        }
      }

      return true;
    } catch (error) {
      console.error("Stream request failed:", error);
      throw error;
    }
  },

  // For React Native: Simulates streaming by breaking up the response into chunks
  async fetchSimulatedStream(url, body, onChunk) {
    console.log(`Making simulated streaming request to: ${url}`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.error(`API Error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        throw new Error(
          `Request failed with status ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Got complete response, simulating streaming...");

      // Extract conversation ID and send it as a start event
      if (data.conversation_id) {
        onChunk({
          type: "start",
          conversation_id: data.conversation_id,
        });
      }

      // If we have a message, break it into chunks to simulate streaming
      if (data.message) {
        const message = data.message;
        const chunkSize = 3; // Number of characters per chunk

        // Send the message in chunks to simulate streaming
        for (let i = 0; i < message.length; i += chunkSize) {
          const chunk = message.substring(i, i + chunkSize);
          onChunk({
            type: "chunk",
            content: chunk,
          });

          // Small delay to simulate real streaming
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      // Send end event
      onChunk({
        type: "end",
      });

      return data;
    } catch (error) {
      console.error(`Simulated stream request failed: ${url}`, error);
      throw error;
    }
  },

  // Direct streaming for React Native using XMLHttpRequest which is more compatible
  async fetchDirectStream(url, body, onChunk) {
    console.log(`Making direct streaming request to: ${url}`);

    return new Promise((resolve, reject) => {
      // Use XMLHttpRequest which has better compatibility with React Native
      const xhr = new XMLHttpRequest();
      let buffer = "";

      // Set up response headers
      xhr.open("POST", url);
      xhr.setRequestHeader("Content-Type", "application/json");

      // Add authorization header if available
      if (this.AUTH_TOKEN) {
        xhr.setRequestHeader("Authorization", `Bearer ${this.AUTH_TOKEN}`);
      }

      // Set up event handlers
      xhr.onreadystatechange = function () {
        // Process partial data as it arrives (readyState 3)
        if (xhr.readyState === 3) {
          // Get only the new data since last progress
          const newData = xhr.responseText.substring(buffer.length);
          buffer = xhr.responseText;

          if (newData.trim()) {
            console.log(`Received chunk: ${newData.length} bytes`);

            // Process each line
            const lines = newData.split("\n");

            for (const line of lines) {
              if (!line.trim()) continue;

              try {
                const data = JSON.parse(line);
                onChunk(data);
              } catch (err) {
                // If not valid JSON, send as raw content
                if (line.trim()) {
                  console.log("Non-JSON content:", line);
                  onChunk({ type: "raw", content: line });
                }
              }
            }
          }
        }

        // When complete
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log("Stream complete");
            resolve();
          } else {
            console.error(`XHR Error: ${xhr.status}`);
            reject(
              new Error(
                `Stream request failed with status ${xhr.status}: ${xhr.statusText}`
              )
            );
          }
        }
      };

      // Handle network errors
      xhr.onerror = function () {
        console.error("XHR Network error");
        reject(new Error("Network error occurred during streaming request"));
      };

      // Send the request
      xhr.send(JSON.stringify(body));
    });
  },
};

// useEffect(() => {
//   fetch("http://192.168.1.5:8000/malls")
//     .then((res) => res.json())
//     .then((data) => console.log("✅ Got data:", data))
//     .catch((err) => console.log("❌ Fetch failed:", err));
// }, []);

export default API_CONFIG;
