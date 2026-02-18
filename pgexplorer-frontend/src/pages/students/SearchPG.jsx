import { useEffect, useMemo, useState } from "react";
import api from "../../utils/axios";
import { Link } from "react-router-dom";
import {
  createBooking,
  getStudentBookings,
} from "../../services/bookingService";
import {
  bulkAddFavoritePgIds,
  getMyFavoritePgIds,
  toggleFavoritePgId,
} from "../../services/favoriteService";
import { getFavoritePgIds as getLegacyFavoritePgIds } from "../../utils/favorites";
import { useToast } from "../../components/ToastProvider";

const toCamelCase = (str) =>
  str
    ?.toLowerCase()
    .trim()
    .split(/\s+/)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

const SearchPG = () => {
  const [pgs, setPgs] = useState([]);
  const [bookedPgIds, setBookedPgIds] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { pushToast } = useToast();

  const favoriteSet = useMemo(
    () => new Set((favoriteIds || []).map((x) => String(x))),
    [favoriteIds],
  );

  const [filters, setFilters] = useState({
    city: "",
    gender: "",
    minRent: "",
    maxRent: "",
    roomType: "",
    ac: false,
    amenities: "",
  });

  const fetchPGs = async (pageNumber, reset = false) => {
    if (loading) return;
    setLoading(true);

    try {
      setError(null);
      const params = {
        page: pageNumber,
        limit: 10,
      };

      if (filters.city?.trim()) params.city = filters.city.trim();
      if (filters.gender) params.gender = filters.gender;
      if (filters.roomType) params.roomType = filters.roomType;
      if (filters.minRent !== "") params.minRent = filters.minRent;
      if (filters.maxRent !== "") params.maxRent = filters.maxRent;
      if (filters.ac) params.ac = true;
      if (filters.amenities?.trim()) params.amenities = filters.amenities;

      const res = await api.get("/pg/search", { params });

      if (!Array.isArray(res.data) || res.data.length === 0) {
        if (reset) setPgs([]);
        setHasMore(false);
      } else {
        setPgs((prev) => (reset ? res.data : [...prev, ...res.data]));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch PGs");
      setHasMore(false);
      if (reset) setPgs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentBookings = async () => {
    try {
      const res = await getStudentBookings();
      const ids = res.data.map((b) => b.pg?._id);
      setBookedPgIds(ids);
    } catch (error) {
      console.error("Failed to fetch student bookings");
    }
  };

  const loadFavorites = async () => {
    try {
      const ids = await getMyFavoritePgIds();
      if (Array.isArray(ids) && ids.length > 0) {
        setFavoriteIds(ids);
        return;
      }

      // One-time migration from legacy device favorites.
      const legacy = getLegacyFavoritePgIds();
      if (Array.isArray(legacy) && legacy.length > 0) {
        const migrated = await bulkAddFavoritePgIds(legacy);
        const next = Array.isArray(migrated?.ids) ? migrated.ids : legacy;
        setFavoriteIds(next);
        try {
          localStorage.removeItem("favoritePgIds");
        } catch {
          // ignore
        }
        return;
      }

      setFavoriteIds([]);
    } catch {
      // If favorites API fails, keep UI working but without favorites state.
      setFavoriteIds([]);
    }
  };

  useEffect(() => {
    fetchPGs(1, true);
    fetchStudentBookings();
    loadFavorites();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
          document.body.offsetHeight - 200 &&
        hasMore &&
        !loading
      ) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchPGs(nextPage);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line
  }, [page, hasMore, loading]);

  const search = () => {
    setPage(1);
    setHasMore(true);
    fetchPGs(1, true);
  };

  const handleInterested = async (pgId) => {
    try {
      await createBooking(pgId);
      pushToast({
        type: "success",
        title: "Request sent",
        message: "Your booking request has been sent to the owner.",
      });
      setBookedPgIds((prev) => [...prev, pgId]);
    } catch (error) {
      pushToast({
        type: "error",
        title: "Booking failed",
        message: error.response?.data?.message || "Booking failed",
      });
    }
  };

  const handleToggleFavorite = async (pgId) => {
    try {
      const res = await toggleFavoritePgId(pgId);
      if (Array.isArray(res?.ids)) {
        setFavoriteIds(res.ids);
        return;
      }
      // Fallback: optimistic toggle if response is unexpected.
      const id = String(pgId);
      setFavoriteIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-start justify-content-between">
        <div>
          <h2 className="h4 mb-1">Search PG</h2>
          <div className="pg-muted">
            Use filters and scroll for more results.
          </div>
        </div>
        <button className="btn btn-primary" onClick={search}>
          Search
        </button>
      </div>

      <div className="pg-divider my-4" />

      {error && <div className="text-danger mb-3">{error}</div>}

      <div className="row g-3 align-items-end pg-form mb-4">
        <div className="col-12 col-md-4">
          <label className="form-label">City</label>
          <input
            className="form-control"
            placeholder="e.g. Hyderabad"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          />
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label">Gender</label>
          <select
            className="form-select"
            value={filters.gender}
            onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
          >
            <option value="">Any</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="unisex">Unisex</option>
          </select>
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label">Room Type</label>
          <select
            className="form-select"
            value={filters.roomType}
            onChange={(e) =>
              setFilters({ ...filters, roomType: e.target.value })
            }
          >
            <option value="">Any</option>
            <option value="single">Single</option>
            <option value="shared">Shared</option>
          </select>
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label">Min Rent</label>
          <input
            className="form-control"
            type="number"
            placeholder="e.g. 5000"
            value={filters.minRent}
            onChange={(e) =>
              setFilters({ ...filters, minRent: e.target.value })
            }
          />
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label">Max Rent</label>
          <input
            className="form-control"
            type="number"
            placeholder="e.g. 9000"
            value={filters.maxRent}
            onChange={(e) =>
              setFilters({ ...filters, maxRent: e.target.value })
            }
          />
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label">Amenities</label>
          <input
            className="form-control"
            placeholder="e.g. wifi,food"
            value={filters.amenities}
            onChange={(e) =>
              setFilters({ ...filters, amenities: e.target.value })
            }
          />
        </div>

        <div className="col-12 col-md-4">
          <div className="form-check mt-4">
            <input
              className="form-check-input"
              type="checkbox"
              id="acFilter"
              checked={filters.ac}
              onChange={(e) => setFilters({ ...filters, ac: e.target.checked })}
            />
            <label className="form-check-label" htmlFor="acFilter">
              AC only
            </label>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {pgs.map((pg) => {
          const isBooked = bookedPgIds.includes(pg._id);
          const isFull = Number(pg.availableRooms || 0) <= 0;
          const fav = favoriteSet.has(String(pg._id));

          return (
            <div key={pg._id} className="col-12 col-md-6 col-lg-4">
              <div className="pg-kpi rounded-4 p-4 h-100 d-flex flex-column position-relative">
                <button
                  type="button"
                  className={`btn pg-btn rounded-circle p-2 position-absolute top-0 end-0 m-3 ${
                    fav ? "btn-outline-secondary" : "btn-outline-light"
                  }`}
                  onClick={() => handleToggleFavorite(pg._id)}
                  aria-label={
                    fav ? "Remove from favorites" : "Save to favorites"
                  }
                  title={fav ? "Saved" : "Save"}
                  style={{ lineHeight: 1 }}
                >
                  <span style={{ fontSize: 18 }}>{fav ? "❤️" : "🤍"}</span>
                </button>

                <div className="mb-3">
                  <div className="h5 mb-1">{toCamelCase(pg.name)}</div>
                  <span className="">📍 {toCamelCase(pg.city)}</span>
                </div>

                <div className="flex-grow-1">
                  <div className="pg-muted small mb-1">Monthly Rent</div>
                  <div className="display-6 fw-semibold mb-3">₹{pg.rent}</div>
                </div>

                <div className="pt-3 border-top">
                  <Link
                    className="btn btn-outline-light w-100 mb-2"
                    to={`/pg/${pg._id}`}
                  >
                    View Details
                  </Link>

                  <button
                    className={`btn w-100 ${
                      isBooked ? "btn-outline-secondary" : "btn-primary"
                    }`}
                    disabled={isBooked || isFull}
                    onClick={() => handleInterested(pg._id)}
                  >
                    {isBooked
                      ? "Request Sent"
                      : isFull
                        ? "Full"
                        : "I'm Interested"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && !error && pgs.length === 0 && (
        <div className="pg-muted mt-3">No PGs found.</div>
      )}

      {loading && <div className="pg-muted mt-3">Loading...</div>}
    </div>
  );
};

export default SearchPG;
