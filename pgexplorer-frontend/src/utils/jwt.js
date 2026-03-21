const base64UrlToBase64 = (value) =>
  String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(String(value || "").length / 4) * 4, "=");

export const decodeJwtPayload = (token) => {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;

    const payload = parts[1];
    const json = atob(base64UrlToBase64(payload));
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

export const getUserIdFromToken = (token) => {
  const payload = decodeJwtPayload(token);
  const id = payload?.id || payload?._id || payload?.userId || null;
  return id ? String(id) : null;
};

export const getCurrentUserId = () => {
  try {
    const token =
      sessionStorage.getItem("token") || localStorage.getItem("token");
    return getUserIdFromToken(token);
  } catch {
    return null;
  }
};
