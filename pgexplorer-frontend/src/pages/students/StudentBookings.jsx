import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  cancelStudentBooking,
  getStudentBookings,
} from "../../services/bookingService";
import { useToast } from "../../components/ToastProvider";

const toCamelCase = (str) =>
  str
    ?.toLowerCase()
    .trim()
    .split(/\s+/)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

const StudentBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const { pushToast } = useToast();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await getStudentBookings();
        setBookings(res.data);
      } catch (error) {
        pushToast({
          type: "error",
          title: "Could not load bookings",
          message: "Please try again in a moment.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [pushToast]);

  const statusBadge = (status) => {
    if (status === "pending") return "bg-warning text-dark";
    if (status === "approved") return "bg-success";
    if (status === "rejected") return "bg-danger";
    if (status === "cancelled") return "bg-secondary";
    return "bg-secondary";
  };

  const formatDateTime = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  };

  const counts = bookings.reduce(
    (acc, b) => {
      const s = b?.status || "other";
      acc[s] = (acc[s] || 0) + 1;
      acc.all += 1;
      return acc;
    },
    { all: 0 },
  );

  const visibleBookings =
    statusFilter === "all"
      ? bookings
      : bookings.filter((b) => b.status === statusFilter);

  const handleCancel = async (bookingId) => {
    const ok = window.confirm("Cancel this booking request?");
    if (!ok) return;
    setUpdatingId(bookingId);
    try {
      const res = await cancelStudentBooking(bookingId);
      const updated = res.data?.booking;
      if (updated?._id) {
        setBookings((prev) =>
          prev.map((b) => (b._id === bookingId ? updated : b)),
        );
      } else {
        // fallback: just update status locally
        setBookings((prev) =>
          prev.map((b) =>
            b._id === bookingId ? { ...b, status: "cancelled" } : b,
          ),
        );
      }
    } catch (error) {
      pushToast({
        type: "error",
        title: "Cancel failed",
        message: error.response?.data?.message || "Failed to cancel booking",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <div className="pg-muted">Loading bookings...</div>;
  }

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">My Bookings</h2>
          <div className="pg-muted small">
            History of all your booking requests.
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className={`btn btn-sm ${
              statusFilter === "all" ? "btn-primary" : "btn-outline-light"
            }`}
            onClick={() => setStatusFilter("all")}
          >
            All ({counts.all || 0})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${
              statusFilter === "pending" ? "btn-primary" : "btn-outline-light"
            }`}
            onClick={() => setStatusFilter("pending")}
          >
            Pending ({counts.pending || 0})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${
              statusFilter === "approved" ? "btn-primary" : "btn-outline-light"
            }`}
            onClick={() => setStatusFilter("approved")}
          >
            Approved ({counts.approved || 0})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${
              statusFilter === "rejected" ? "btn-primary" : "btn-outline-light"
            }`}
            onClick={() => setStatusFilter("rejected")}
          >
            Rejected ({counts.rejected || 0})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${
              statusFilter === "cancelled" ? "btn-primary" : "btn-outline-light"
            }`}
            onClick={() => setStatusFilter("cancelled")}
          >
            Cancelled ({counts.cancelled || 0})
          </button>
        </div>
      </div>

      {bookings.length === 0 && <div className="pg-muted">No bookings yet</div>}
      {bookings.length > 0 && visibleBookings.length === 0 && (
        <div className="pg-muted">No bookings in this filter.</div>
      )}

      <div className="row g-3">
        {visibleBookings.map((booking) => (
          <div key={booking._id} className="col-12 col-md-6 col-lg-4">
            <div className="pg-kpi rounded-4 p-4 h-100 d-flex flex-column">
              {/* Header */}
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <div className="h5 mb-1">{toCamelCase(booking.pg?.name)}</div>
                  <span className="">📍 {toCamelCase(booking.pg?.city)}</span>
                  {booking.createdAt && (
                    <div className="pg-muted small mt-1">
                      Requested: {formatDateTime(booking.createdAt)}
                    </div>
                  )}
                </div>

                <span className={`badge ${statusBadge(booking.status)}`}>
                  {booking.status.toUpperCase()}
                </span>
              </div>

              {/* Body */}
              <div className="flex-grow-1">
                <div className="pg-muted small mb-1">Monthly Rent</div>
                <div className="display-6 fw-semibold">₹{booking.pg?.rent}</div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-top mt-3">
                <div className="pg-muted small">
                  Booking Status:{" "}
                  <strong>{booking.status.toUpperCase()}</strong>
                </div>

                {booking.pg?._id && (
                  <Link
                    className="btn btn-outline-light w-100 mt-3"
                    to={`/pg/${booking.pg._id}`}
                  >
                    View PG
                  </Link>
                )}

                <Link
                  className="btn btn-outline-light w-100 mt-2"
                  to={`/student/bookings/${booking._id}`}
                >
                  View Summary
                </Link>

                {booking.status === "pending" && (
                  <button
                    className="btn btn-outline-danger w-100 mt-3"
                    onClick={() => handleCancel(booking._id)}
                    disabled={updatingId === booking._id}
                  >
                    {updatingId === booking._id ? "Cancelling..." : "Cancel"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentBookings;
