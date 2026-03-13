import { io } from "socket.io-client";

let socket;
let lastToken;

const getSocketUrl = () => {
  const host =
    typeof window !== "undefined" ? String(window.location.hostname) : "";
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const base =
    process.env.REACT_APP_API_BASE_URL ||
    (isLocal
      ? "http://localhost:5000/api"
      : "https://pgexplorer.onrender.com/api");
  // socket server runs on the same host but without /api
  return base.replace(/\/?api\/?$/, "");
};

export const getSocket = () => {
  const token = localStorage.getItem("token");

  if (socket && lastToken === token) return socket;

  if (socket && lastToken !== token) {
    try {
      socket.disconnect();
    } catch {
      // ignore
    }
    socket = undefined;
  }

  lastToken = token;

  socket = io(getSocketUrl(), {
    autoConnect: true,
    transports: ["websocket", "polling"],
    auth: token ? { token } : {},
    withCredentials: true,
  });

  return socket;
};

export const updateSocketAuth = (token) => {
  const nextToken = token || null;

  // If token is cleared, drop the connection.
  if (!nextToken) {
    resetSocket();
    lastToken = null;
    return;
  }

  // If no socket yet, it will pick up token when created.
  if (!socket) {
    lastToken = nextToken;
    return;
  }

  // Update auth and reconnect.
  lastToken = nextToken;
  try {
    socket.auth = { token: nextToken };
    socket.disconnect();
    socket.connect();
  } catch {
    // fall back to resetting
    resetSocket();
  }
};

export const resetSocket = () => {
  if (socket) {
    try {
      socket.disconnect();
    } catch {
      // ignore
    }
    socket = undefined;
  }
};
