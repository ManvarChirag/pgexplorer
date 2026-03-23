import axios from "../utils/axios";

export const getOwnerBookings = () => axios.get("/booking/owner");

export const updateBookingStatus = (bookingId, status) =>
  axios.put(`/booking/${bookingId}/status`, { status });

/* 🔽 ADD THIS FOR STUDENT BOOKING */
export const createBooking = (listingId) =>
  axios.post(`/booking/request/${listingId}`);
export const getStudentBookings = () => axios.get("/booking/student");

export const getStudentBookingById = (bookingId) =>
  axios.get(`/booking/student/${bookingId}`);

export const cancelStudentBooking = (bookingId) =>
  axios.delete(`/booking/${bookingId}`);

export const getBookingInvoicePdf = (bookingId) =>
  axios.get(`/booking/${bookingId}/invoice`, {
    responseType: "blob",
    headers: { Accept: "application/pdf" },
  });
