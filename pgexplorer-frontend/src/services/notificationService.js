import api from "../utils/axios";

export const syncNotifications = async ({ since } = {}) => {
  const params = {};
  if (since) params.since = since;

  const res = await api.get("/notifications", { params });
  return res.data;
};
