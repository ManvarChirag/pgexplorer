import api from "../utils/axios";

export const getMyFavoritePgIds = async () => {
  const res = await api.get("/student/favorites");
  const ids = res?.data?.ids;
  return Array.isArray(ids) ? ids : [];
};

export const toggleFavoritePgId = async (pgId) => {
  const res = await api.post("/student/favorites/toggle", { pgId });
  return res?.data;
};

export const removeFavoritePgId = async (pgId) => {
  const res = await api.delete(`/student/favorites/${pgId}`);
  return res?.data;
};

export const bulkAddFavoritePgIds = async (ids) => {
  const res = await api.post("/student/favorites/bulk", { ids });
  return res?.data;
};
