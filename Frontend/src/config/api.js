import axios from 'axios';
import axiosRetry from 'axios-retry';


const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // Increased to 60s for handling image uploads on slower networks
});

// Configure retry logic
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Only retry on network errors or 5xx server errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status >= 500;
  }
});


// Request Deduplication & Cache
const pendingRequests = new Map();
const cache = new Map();
const CACHE_TTL = 5000; // Default 5 seconds cache
const LONG_CACHE_TTL = 60000; // 1 minute cache for static-ish data

// Helper to generate a unique key for a request
const getRequestKey = (config) => {
  return `${config.method}:${config.url}:${JSON.stringify(config.params)}:${JSON.stringify(config.data)}`;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Only deduplicate and cache GET requests
  if (config.method === 'get') {
    const key = getRequestKey(config);
    
    // Determine TTL: System maintenance and settings get longer cache
    const ttl = config.url.includes('/system/') ? LONG_CACHE_TTL : CACHE_TTL;

    // Check Cache
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.timestamp < ttl)) {
       config.adapter = () => Promise.resolve({
         data: cached.data,
         status: 200,
         statusText: 'OK',
         headers: {},
         config,
         request: {}
       });
       return config;
    }

    // Deduplicate pending requests
    if (pendingRequests.has(key)) {
      return pendingRequests.get(key).then(() => config);
    }
    
    let resolvePending;
    const pendingPromise = new Promise(resolve => { resolvePending = resolve; });
    pendingRequests.set(key, pendingPromise);
    config.resolvePending = resolvePending;
    config.requestKey = key;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const { config } = response;
    if (config.method === 'get' && config.requestKey) {
      // Store in cache
      cache.set(config.requestKey, {
        data: response.data,
        timestamp: Date.now()
      });
      // Resolve pending
      if (config.resolvePending) config.resolvePending();
      pendingRequests.delete(config.requestKey);
    }
    return response;
  },
  (error) => {
    const { config } = error;
    if (config?.requestKey) {
      if (config.resolvePending) config.resolvePending();
      pendingRequests.delete(config.requestKey);
    }

    // Handle timeout specifically for better user feedback
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      return Promise.reject(new Error('Network is slow. Request timed out.'));
    }

    const msg = error.response?.data?.error || error.message;
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(new Error(msg));
  }
);

export default api;
