// src/utils/apiClient.js
import axios from 'axios';

// Get the base URL from your environment variables
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json', // Most of your requests will likely be JSON
  },
});

// Add a request interceptor to attach the token to every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Retrieve the token from localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // console.log('Axios Interceptor: Attaching token to request:', token); // Keep this for debugging, or remove later
    } else {
      // console.log('Axios Interceptor: No token found for request.'); // Keep for debugging
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Add a response interceptor to handle 401s globally
apiClient.interceptors.response.use(
  (response) => response, // Just pass through successful responses
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error('API Client: Unauthorized access (401). Redirecting to login.');
      localStorage.removeItem('token'); // Clear invalid token
      // You might also want to clear any stored user data
      localStorage.removeItem('user'); 
      
      // Redirect to login page
      // This part assumes you have `Maps` available or a global routing mechanism.
      // For a simple app, a direct window.location.href might work, but it's not ideal for React SPA.
      // You could use a context API or a global event emitter for a more React-friendly way
      // to trigger a redirect from an interceptor. For now, a simple reload might suffice
      // to get back to the login page.
       window.location.href = '/auth-login'; // Or your specific login route
      toast.error('Your session has expired. Please log in again.');
    }
    return Promise.reject(error);
  }
);


export default apiClient;