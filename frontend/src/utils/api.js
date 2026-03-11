import axios from 'axios';
import { parseApiError, logError, isAuthError } from './errorHandler';

const BASE_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cd_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    logError(error, { type: 'request_interceptor' });
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    // Log success in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    const parsedError = parseApiError(error);
    
    // Log the error
    logError(parsedError, {
      type: 'api_error',
      url: error.config?.url,
      method: error.config?.method,
    });
    
    // Handle authentication errors
    if (isAuthError(parsedError)) {
      // Don't redirect if already on auth page
      if (!window.location.pathname.includes('/auth') && !window.location.pathname.includes('/invite')) {
        localStorage.removeItem('cd_token');
        
        // Store current location for redirect after login
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        
        // Redirect to login
        window.location.href = '/auth';
      }
    }
    
    // Attach parsed error to the error object for easy access
    error.parsedError = parsedError;
    
    return Promise.reject(error);
  }
);

/**
 * Helper function to make API calls with standardized error handling
 * @param {Function} apiCall - The API call function
 * @param {Object} options - Options for error handling
 * @returns {Promise} - Response data or throws parsed error
 */
export async function apiRequest(apiCall, options = {}) {
  const { showToast = true, toastFn = null } = options;
  
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    const parsedError = error.parsedError || parseApiError(error);
    
    // Show toast notification if requested
    if (showToast && toastFn) {
      toastFn({
        title: "Error",
        description: parsedError.message,
        variant: "destructive",
      });
    }
    
    throw parsedError;
  }
}

/**
 * Retry a failed API call with exponential backoff
 * @param {Function} apiCall - The API call function
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} - Response data
 */
export async function retryApiCall(apiCall, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      const parsedError = error.parsedError || parseApiError(error);
      
      // Don't retry authentication errors or validation errors
      if (isAuthError(parsedError) || parsedError.code?.startsWith('VAL_')) {
        throw error;
      }
      
      // Wait before retrying
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export default api;
