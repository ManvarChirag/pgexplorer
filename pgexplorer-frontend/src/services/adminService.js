import api from "../utils/axios";

export const getDashboard = async () => {
  const res = await api.get("/admin/dashboard");
  return res.data;
};

export const listUsers = async () => {
  const res = await api.get("/admin/users");
  return res.data;
};

export const listUsersByRole = async (role) => {
  const res = await api.get("/admin/users", {
    params: role ? { role } : undefined,
  });
  return res.data;
};

export const blockUser = async (id) => {
  const res = await api.patch(`/admin/users/${id}/block`, { blocked: true });
  return res.data;
};

export const unblockUser = async (id) => {
  const res = await api.patch(`/admin/users/${id}/block`, { blocked: false });
  return res.data;
};

export const listPGs = async () => {
  const res = await api.get("/admin/pgs");
  return res.data;
};

export const listPGsByStatus = async (status) => {
  const res = await api.get("/admin/pgs", {
    params: status ? { status } : undefined,
  });
  return res.data;
};

export const setPGStatus = async (id, status) => {
  const res = await api.patch(`/admin/pgs/${id}/status`, { status });
  return res.data;
};

export const deletePG = async (id) => {
  const res = await api.delete(`/admin/pgs/${id}`);
  return res.data;
};

export const getPGPropertyPaperUrl = async (id) => {
  const res = await api.get(`/admin/pgs/${id}/property-paper-url`);
  return res.data;
};

export const listBookings = async () => {
  const res = await api.get("/admin/bookings");
  return res.data;
};

export const listAnnouncements = async () => {
  const res = await api.get("/admin/announcements");
  return res.data;
};

export const createAnnouncement = async (payload) => {
  const res = await api.post("/admin/announcements", payload);
  return res.data;
};
