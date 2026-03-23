import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getBookingInvoicePdf,
  getStudentBookingById,
} from "../../services/bookingService";
import { downloadAxiosBlobResponse } from "../../utils/download";

const toTitle = (str) =>
  str
    ?.toLowerCase()
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

const statusBadge = (status) => {
  if (status === "pending") return "bg-warning text-dark";
  if (status === "approved") return "bg-success";
  if (status === "rejected") return "bg-danger";
  if (status === "cancelled") return "bg-secondary";
  return "bg-secondary";
};

const fmt = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
};

const BookingSummary = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getStudentBookingById(id);
        if (mounted) setBooking(res.data);
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || "Failed to load booking");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <div className="pg-muted">Loading...</div>;
  if (error) return <div className="text-danger">{error}</div>;
  if (!booking) return <div className="pg-muted">Booking not found.</div>;

  const pg = booking.pg;

  const downloadInvoice = async () => {
    setDownloading(true);
    try {
      const res = await getBookingInvoicePdf(booking._id);
      downloadAxiosBlobResponse(res, `invoice-${booking._id}.pdf`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to download invoice");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2">
        <div>
          <h2 className="h4 mb-1">Booking Summary</h2>
          <div className="pg-muted small">Booking ID: {booking._id}</div>
        </div>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-light pg-btn" to="/student/bookings">
            Back
          </Link>
          {booking.status === "approved" && (
            <button
              type="button"
              className="btn btn-primary pg-btn"
              onClick={downloadInvoice}
              disabled={downloading}
            >
              {downloading ? "Downloading…" : "Download Invoice"}
            </button>
          )}
          {pg?._id && !pg?.isDeleted && pg?.status !== "inactive" && (
            <Link className="btn btn-primary pg-btn" to={`/pg/${pg._id}`}>
              View PG
            </Link>
          )}
        </div>
      </div>

      <div className="pg-divider my-4" />

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <div className="pg-kpi rounded-4 p-4 h-100">
            <div className="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div className="pg-muted small mb-1">Status</div>
                <span className={`badge ${statusBadge(booking.status)}`}>
                  {String(booking.status || "").toUpperCase()}
                </span>
              </div>
              <div className="text-end">
                <div className="pg-muted small mb-1">Requested</div>
                <div className="pg-muted">{fmt(booking.createdAt)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="pg-kpi rounded-4 p-4 h-100">
            <div className="pg-muted small mb-1">PG</div>
            <div className="h5 mb-1">{toTitle(pg?.name || "PG deleted")}</div>
            <div className="pg-muted">
              📍 {pg?.city ? toTitle(pg.city) : "(PG removed)"}
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="pg-kpi rounded-4 p-4 h-100">
            <div className="pg-muted small mb-1">Monthly Rent</div>
            <div className="h3 fw-semibold mb-0">₹{pg?.rent ?? "-"}</div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="pg-kpi rounded-4 p-4 h-100">
            <div className="pg-muted small mb-1">Rooms</div>
            <div className="h5 mb-0">
              {typeof pg?.availableRooms !== "undefined" &&
              typeof pg?.totalRooms !== "undefined"
                ? `${pg.availableRooms}/${pg.totalRooms}`
                : "-"}
            </div>
          </div>
        </div>

        {pg?.address && (
          <div className="col-12">
            <div className="pg-kpi rounded-4 p-4">
              <div className="pg-muted small mb-2">Address</div>
              <div className="pg-muted">{pg.address}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingSummary;
