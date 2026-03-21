import api from "../utils/axios";
import { resetSocket, updateSocketAuth } from "../utils/socket";
import { getUserIdFromToken } from "../utils/jwt";

export const registerUser = async (formData) => {
  const res = await api.post("/auth/register", formData);
  return res.data;
};

export const loginUser = async (formData) => {
  const res = await api.post("/auth/login", formData);
  sessionStorage.setItem("token", res.data.token);
  sessionStorage.setItem("role", res.data.role);
  const userId = getUserIdFromToken(res.data.token);
  if (userId) sessionStorage.setItem("userId", userId);

  // Clear legacy global notification storage (now scoped per-user)
  try {
    localStorage.removeItem("realtimeNotifications");
    localStorage.removeItem("realtimeNotifications:lastSeenAt");
    localStorage.removeItem("realtimeNotifications:lastSync");
  } catch {
    // ignore
  }

  try {
    window.dispatchEvent(new CustomEvent("realtimeNotifications:updated"));
  } catch {
    // ignore
  }

  updateSocketAuth(res.data.token);
  return res.data;
};

export const verifyEmail = async (token) => {
  const res = await api.post("/auth/verify-email", { token });
  return res.data;
};

export const verifyEmailOtp = async ({ email, otp }) => {
  const res = await api.post("/auth/verify-otp", { email, otp });
  return res.data;
};

export const resendVerificationEmail = async (email) => {
  const res = await api.post("/auth/resend-verification", { email });
  return res.data;
};

export const forgotPassword = async (email) => {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data;
};

export const resetPassword = async ({ token, newPassword }) => {
  const res = await api.post("/auth/reset-password", { token, newPassword });
  return res.data;
};

export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } finally {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("userId");

    // Best-effort cleanup of any legacy persistent auth.
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
    } catch {
      // ignore
    }
    try {
      window.dispatchEvent(new CustomEvent("realtimeNotifications:updated"));
    } catch {
      // ignore
    }
    resetSocket();
  }
};
