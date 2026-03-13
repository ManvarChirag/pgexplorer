import api from "./axios";

const stripTrailingSlashes = (value) => String(value || "").replace(/\/+$/, "");

const getBackendOrigin = () => {
  const baseURL = api?.defaults?.baseURL;
  if (!baseURL) return "";

  // baseURL is typically like: https://api.example.com/api
  const trimmed = stripTrailingSlashes(baseURL);
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
};

export const resolveMediaUrl = (rawUrl) => {
  if (!rawUrl) return "";
  const url = String(rawUrl).trim();

  // Absolute URLs: best effort to avoid mixed content on https sites.
  if (/^https?:\/\//i.test(url)) {
    if (
      typeof window !== "undefined" &&
      window.location?.protocol === "https:"
    ) {
      return url.startsWith("http://") ? `https://${url.slice(7)}` : url;
    }
    return url;
  }

  // Support legacy relative paths like '/uploads/...' by prefixing backend origin.
  if (url.startsWith("/")) {
    const origin = getBackendOrigin();
    return origin ? `${origin}${url}` : url;
  }

  return url;
};
