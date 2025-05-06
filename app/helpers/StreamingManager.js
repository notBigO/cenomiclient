/**
 * WebSocket Streaming Manager
 * 
 * Provides WebSocket-based chat streaming capabilities as an alternative to fetch-based streaming
 */

class StreamingManager {
  constructor() {
    this.socket = null;
    this.onMessageCallback = null;
    this.onCloseCallback = null;
    this.onErrorCallback = null;
    this.onOpenCallback = null;
    this.isConnected = false;
  }

  connect(url) {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Connecting to WebSocket at ${url}`);
        this.socket = new WebSocket(url);
        
        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.isConnected = true;
          if (this.onOpenCallback) this.onOpenCallback();
          resolve(true);
        };

        this.socket.onmessage = (event) => {
          console.log('WebSocket message received:', event.data.substring(0, 50) + '...');
          if (this.onMessageCallback) {
            try {
              // Try to parse as JSON first
              let data;
              try {
                data = JSON.parse(event.data);
              } catch (e) {
                // If not JSON, use as text
                data = { message: event.data };
              }
              this.onMessageCallback(data);
            } catch (error) {
              console.error('Error processing WebSocket message:', error);
            }
          }
        };

        this.socket.onclose = (event) => {
          console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
          this.isConnected = false;
          if (this.onCloseCallback) this.onCloseCallback(event);
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (this.onErrorCallback) this.onErrorCallback(error);
          reject(error);
        };
      } catch (error) {
        console.error('Error setting up WebSocket:', error);
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.socket && this.isConnected) {
      this.socket.close();
      this.isConnected = false;
      console.log('WebSocket disconnected');
    }
  }

  send(data) {
    if (!this.socket || !this.isConnected) {
      console.error('Cannot send: WebSocket not connected');
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.socket.send(message);
      console.log('Message sent:', message.substring(0, 50) + '...');
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  setCallbacks({
    onMessage = null,
    onClose = null,
    onError = null,
    onOpen = null,
  }) {
    if (onMessage) this.onMessageCallback = onMessage;
    if (onClose) this.onCloseCallback = onClose;
    if (onError) this.onErrorCallback = onError;
    if (onOpen) this.onOpenCallback = onOpen;
  }
}

export default new StreamingManager(); 