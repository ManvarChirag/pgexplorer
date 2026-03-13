import axios from "axios";
import { updateSocketAuth } from "./socket";
import { getUserIdFromToken } from "./jwt";

const getDefaultApiBaseUrl = () => {
  // CRA in the browser.
  const host =
    typeof window !== "undefined" ? String(window.location.hostname) : "";
  const isLocal = host === "localhost" || host === "127.0.0.1";
  return isLocal
    ? "http://localhost:5000/api"
    : "https://pgexplorer.onrender.com/api";
};

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || getDefaultApiBaseUrl(),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loops
    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !originalRequest?.url?.includes("/auth/login") &&
      !originalRequest?.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;
      try {
        const refreshRes = await api.post("/auth/refresh");
        if (refreshRes.data?.token) {
          localStorage.setItem("token", refreshRes.data.token);
          const userId = getUserIdFromToken(refreshRes.data.token);
          if (userId) localStorage.setItem("userId", userId);
          updateSocketAuth(refreshRes.data.token);
        }
        return api(originalRequest);
      } catch (refreshErr) {
        // Refresh failed - clear local auth
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("userId");
        updateSocketAuth(null);
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
