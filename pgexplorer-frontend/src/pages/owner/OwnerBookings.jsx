import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getOwnerBookings,
  getBookingInvoicePdf,
  updateBookingStatus,
} from "../../services/bookingService";
import { useToast } from "../../components/ToastProvider";
import { downloadAxiosBlobResponse } from "../../utils/download";

const OwnerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  const statusBadgeClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "approved") return "badge text-bg-success";
    if (s === "rejected") return "badge text-bg-danger";
    if (s === "cancelled") return "badge text-bg-secondary";
    if (s === "pending") return "badge text-bg-warning";
    return "badge text-bg-dark";
  };

  const fetchBookings = async () => {
    try {
      const res = await getOwnerBookings();
      setBookings(res.data);
    } catch (error) {
      console.error("Failed to fetch owner bookings", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId, status) => {
    try {
      await updateBookingStatus(bookingId, status);
      fetchBookings(); // refresh list
    } catch (error) {
      pushToast({
        type: "error",
        title: "Update failed",
        message: "Failed to update booking.",
      });
    }
  };

  const handleDownloadInvoice = async (bookingId) => {
    try {
      const res = await getBookingInvoicePdf(bookingId);
      downloadAxiosBlobResponse(res, `invoice-${bookingId}.pdf`);
    } catch (error) {
      pushToast({
        type: "error",
        title: "Invoice download failed",
        message: error.response?.data?.message || "Could not download invoice",
      });
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  if (loading) {
    return (
      <div className="pg-glass rounded-4 p-4 p-md-5">
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-2">
          <div>
            <h1 className="pg-page-title mb-1">Owner Bookings</h1>
            <div className="pg-page-subtitle">
              Approve, reject, and chat with students.
            </div>
          </div>
        </div>
        <div className="pg-divider my-4" />
        <div className="pg-muted">Loading bookings…</div>
      </div>
    );
  }

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="pg-page-title mb-1">Owner Bookings</h1>
          <div className="pg-page-subtitle">
            Approve, reject, and chat with students.
          </div>
        </div>
        <button
          type="button"
          className="btn btn-outline-light pg-btn"
          onClick={() => {
            setLoading(true);
            fetchBookings();
          }}
        >
          Refresh
        </button>
      </div>

      <div className="pg-divider my-4" />

      {bookings.length === 0 ? (
        <div className="pg-muted">No booking requests found.</div>
      ) : (
        <div className="table-responsive">
          <table className="table pg-table table-hover align-middle">
            <thead>
              <tr>
                <th>PG Name</th>
                <th>City</th>
                <th>Rent</th>
                <th>Student</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id}>
                  <td>
                    <div className="fw-semibold">{b.pg?.name || "—"}</div>
                  </td>
                  <td>{b.pg?.city || "—"}</td>
                  <td>
                    {typeof b.pg?.rent !== "undefined" && b.pg?.rent !== null
                      ? `₹${b.pg.rent}`
                      : "—"}
                  </td>
                  <td>{b.student?.name || b.student?.email || "—"}</td>
                  <td>
                    <span className={statusBadgeClass(b.status)}>
                      {String(b.status || "").toLowerCase() || "unknown"}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-2">
                      {b.pg?._id && b.student?._id && (
                        <Link
                          className="btn btn-outline-light btn-sm pg-btn"
                          to={`/owner/chat/${b.pg._id}/${b.student._id}`}
                        >
                          Chat
                        </Link>
                      )}

                      {b.status === "approved" && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm pg-btn"
                          onClick={() => handleDownloadInvoice(b._id)}
                        >
                          Download Invoice
                        </button>
                      )}

                      {b.status === "pending" && (
                        <>
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() =>
                              handleStatusUpdate(b._id, "approved")
                            }
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() =>
                              handleStatusUpdate(b._id, "rejected")
                            }
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OwnerBookings;
