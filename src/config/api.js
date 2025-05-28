/**
 * API Configuration for CeeloSol
 * Handles different API URLs for development vs production
 */

// Get the backend URL based on environment
const getBackendUrl = () => {
  // In production, use the environment variable
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_BACKEND_URL || 'https://your-app-name.railway.app';
  }
  
  // In development, use localhost
  return 'http://localhost:3001';
};

// Get the Socket.io URL
const getSocketUrl = () => {
  return getBackendUrl();
};

// API endpoints
export const API_CONFIG = {
  BACKEND_URL: getBackendUrl(),
  SOCKET_URL: getSocketUrl(),
  
  // API endpoints
  ENDPOINTS: {
    HOUSE_WALLET: '/api/house-wallet',
    START_GAME: '/api/start',
    REVEAL_GAME: '/api/reveal',
    SETTLE_GAME: '/api/settle',
    ACTIVITY_STORE: '/api/activity/store',
    ACTIVITY_WINS: '/api/activity/wins',
    ACTIVITY_RESULT: '/api/activity/result',
    ACTIVITY_STATS: '/api/activity/stats'
  }
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint) => {
  return `${API_CONFIG.BACKEND_URL}${endpoint}`;
};

// Helper function for making API requests
export const apiRequest = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(url, finalOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

export default API_CONFIG;
