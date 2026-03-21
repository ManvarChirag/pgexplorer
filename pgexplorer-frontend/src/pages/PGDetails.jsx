import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../utils/axios";
import { createBooking } from "../services/bookingService";
import {
  getMyFavoritePgIds,
  toggleFavoritePgId,
} from "../services/favoriteService";
import { resolveMediaUrl } from "../utils/media";

const toTitle = (str) =>
  str
    ?.toLowerCase()
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

const roomTypeLabel = (value) => {
  const rt = String(value ?? "")
    .trim()
    .toLowerCase();
  if (rt === "single") return "Single";
  // normalize any legacy values to Shared
  if (["shared", "double", "triple"].includes(rt)) return "Shared";
  return "Shared";
};

const PGDetails = () => {
  const { id } = useParams();
  const [pg, setPg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [bookingState, setBookingState] = useState({
    loading: false,
    message: null,
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/pg/${id}`);
        if (mounted) setPg(res.data);
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || "Failed to load PG details");
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

  useEffect(() => {
    let alive = true;
    const loadFav = async () => {
      try {
        const token = sessionStorage.getItem("token");
        const role = sessionStorage.getItem("role");
        if (!token || role !== "student") {
          if (alive) setIsFavorite(false);
          return;
        }

        const ids = await getMyFavoritePgIds();
        if (!alive) return;
        setIsFavorite(Array.isArray(ids) && ids.includes(String(id)));
      } catch {
        if (alive) setIsFavorite(false);
      }
    };

    loadFav();
    return () => {
      alive = false;
    };
  }, [id]);

  const handleInterested = async () => {
    setBookingState({ loading: true, message: null });
    try {
      await createBooking(id);
      setBookingState({ loading: false, message: "Booking request sent" });
    } catch (err) {
      setBookingState({
        loading: false,
        message: err.response?.data?.message || "Booking failed",
      });
    }
  };

  if (loading) return <div className="pg-muted">Loading...</div>;
  if (error) return <div className="text-danger">{error}</div>;
  if (!pg) return <div className="pg-muted">PG not found.</div>;

  const token = sessionStorage.getItem("token");
  const role = sessionStorage.getItem("role");

  const isFull = Number(pg.availableRooms || 0) <= 0;

  const mainImage = resolveMediaUrl(pg.images?.[0]?.url);

  const handleImageError = (e) => {
    const el = e.currentTarget;
    const src = String(el?.getAttribute("src") || "");
    if (!src) return;

    // Retry once: upgrade http -> https (common when backend generated http URLs behind proxies)
    if (!el.dataset?.retried && src.startsWith("http://")) {
      el.dataset.retried = "1";
      el.src = `https://${src.slice(7)}`;
      return;
    }

    // Otherwise hide broken images to keep UI clean.
    el.style.display = "none";
  };

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2">
        <div>
          <h2 className="h4 mb-1">{toTitle(pg.name)}</h2>
          <div className="pg-muted">
            {toTitle(pg.city)} • ₹{pg.rent}
          </div>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className={`btn pg-btn ${isFavorite ? "btn-outline-secondary" : "btn-outline-light"}`}
            onClick={async () => {
              try {
                const token = sessionStorage.getItem("token");
                const role = sessionStorage.getItem("role");
                if (!token || role !== "student") return;

                const res = await toggleFavoritePgId(id);
                if (typeof res?.isFavorite === "boolean") {
                  setIsFavorite(res.isFavorite);
                  return;
                }
                setIsFavorite((v) => !v);
              } catch {
                // ignore
              }
            }}
          >
            {isFavorite ? "Saved" : "Save"}
          </button>

          {token && role === "student" && (
            <Link
              className="btn btn-outline-light pg-btn"
              to={`/student/chat/${id}`}
            >
              Chat
            </Link>
          )}

          <Link className="btn btn-outline-light pg-btn" to="/student/search">
            Back
          </Link>
        </div>
      </div>

      <div className="pg-divider my-4" />

      {mainImage && (
        <img
          src={mainImage}
          alt={pg.name}
          className="w-100 rounded-4 mb-3"
          style={{ height: 260, objectFit: "cover" }}
          loading="lazy"
          decoding="async"
          onError={handleImageError}
        />
      )}

      {Array.isArray(pg.images) && pg.images.length > 1 && (
        <div className="d-flex gap-2 flex-wrap mb-4">
          {pg.images.slice(1, 5).map((img) => (
            <img
              key={img.public_id || img.url}
              src={resolveMediaUrl(img.url)}
              alt=""
              className="rounded-3"
              style={{ width: 90, height: 70, objectFit: "cover" }}
              loading="lazy"
              decoding="async"
              onError={handleImageError}
            />
          ))}
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <div className="pg-kpi rounded-4 p-4 h-100">
            <div className="pg-muted small mb-1">Room Type</div>
            <div className="h5 mb-0">{roomTypeLabel(pg.roomType)}</div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="pg-kpi rounded-4 p-4 h-100">
            <div className="pg-muted small mb-1">AC</div>
            <div className="h5 mb-0">{pg.ac ? "Yes" : "No"}</div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="pg-kpi rounded-4 p-4 h-100">
            <div className="pg-muted small mb-1">Rooms</div>
            <div className="h5 mb-0">
              {pg.availableRooms}/{pg.totalRooms}
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="pg-kpi rounded-4 p-4 h-100">
            <div className="pg-muted small mb-1">Gender</div>
            <div className="h5 mb-0">{toTitle(pg.gender || "Unisex")}</div>
          </div>
        </div>

        {Array.isArray(pg.amenities) && pg.amenities.length > 0 && (
          <div className="col-12">
            <div className="pg-kpi rounded-4 p-4">
              <div className="pg-muted small mb-2">Amenities</div>
              <div className="d-flex flex-wrap gap-2">
                {pg.amenities.map((a) => (
                  <span key={a} className="badge text-bg-dark">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {pg.rules && (
          <div className="col-12">
            <div className="pg-kpi rounded-4 p-4">
              <div className="pg-muted small mb-2">Rules</div>
              <div className="pg-muted">{pg.rules}</div>
            </div>
          </div>
        )}

        {pg.description && (
          <div className="col-12">
            <div className="pg-kpi rounded-4 p-4">
              <div className="pg-muted small mb-2">Description</div>
              <div className="pg-muted">{pg.description}</div>
            </div>
          </div>
        )}
      </div>

      <div className="pg-divider my-4" />

      {bookingState.message && (
        <div
          className={`mb-3 ${
            bookingState.message === "Booking request sent"
              ? "text-success"
              : "text-danger"
          }`}
        >
          {bookingState.message}
        </div>
      )}

      {isFull && <div className="text-danger mb-3">No rooms available</div>}

      <button
        className="btn btn-primary pg-btn"
        onClick={handleInterested}
        disabled={bookingState.loading || isFull}
      >
        {bookingState.loading ? "Sending..." : "I'm Interested"}
      </button>
    </div>
  );
};

export default PGDetails;
