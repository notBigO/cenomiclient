// API Test Script
import API_CONFIG from './app/config/api.js';

// This would run in a Node.js environment
const testAPI = async () => {
  try {
    console.log('Testing API connectivity...');
    
    // Test 1: Get malls endpoint
    console.log('\nTest 1: Fetching malls...');
    const mallsUrl = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.MALLS);
    console.log(`Requesting: ${mallsUrl}`);
    const mallsData = await API_CONFIG.fetchWithLogging(mallsUrl);
    console.log('Malls data:', mallsData);
    
    // Test 2: Chat endpoint
    console.log('\nTest 2: Testing chat endpoint...');
    const chatUrl = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.CHAT);
    console.log(`Requesting: ${chatUrl}`);
    const chatData = await API_CONFIG.fetchWithLogging(chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hello',
        mall_id: 1457,
        language: 'en'
      })
    });
    console.log('Chat response received!');
    
    console.log('\nAll tests passed! API connection is working.');
  } catch (error) {
    console.error('API Test failed:', error);
  }
};

testAPI(); 