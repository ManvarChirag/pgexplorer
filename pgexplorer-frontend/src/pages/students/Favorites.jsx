import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/axios";
import {
  bulkAddFavoritePgIds,
  getMyFavoritePgIds,
  removeFavoritePgId,
} from "../../services/favoriteService";
import { getFavoritePgIds as getLegacyFavoritePgIds } from "../../utils/favorites";

const toTitle = (str) =>
  str
    ?.toLowerCase()
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

const Favorites = () => {
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [pgs, setPgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const idsParam = useMemo(() => favoriteIds.join(","), [favoriteIds]);

  useEffect(() => {
    let mounted = true;

    const loadIds = async () => {
      try {
        const ids = await getMyFavoritePgIds();
        if (!mounted) return;

        if (Array.isArray(ids) && ids.length > 0) {
          setFavoriteIds(ids);
          return;
        }

        // One-time migration from legacy device favorites.
        const legacy = getLegacyFavoritePgIds();
        if (Array.isArray(legacy) && legacy.length > 0) {
          const migrated = await bulkAddFavoritePgIds(legacy);
          const next = Array.isArray(migrated?.ids) ? migrated.ids : legacy;
          if (mounted) setFavoriteIds(next);
          try {
            localStorage.removeItem("favoritePgIds");
          } catch {
            // ignore
          }
          return;
        }

        setFavoriteIds([]);
      } catch {
        if (mounted) setFavoriteIds([]);
      }
    };

    loadIds();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!favoriteIds.length) {
        setPgs([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/pg/by-ids", {
          params: { ids: idsParam },
        });
        if (mounted) setPgs(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || "Failed to load favorites");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [favoriteIds, idsParam]);

  const onRemove = async (id) => {
    try {
      const res = await removeFavoritePgId(id);
      const next = Array.isArray(res?.ids)
        ? res.ids
        : favoriteIds.filter((x) => String(x) !== String(id));
      setFavoriteIds(next);
      setPgs((prev) => prev.filter((p) => String(p._id) !== String(id)));
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to remove favorite";
      setError(msg);
    }
  };

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2">
        <div>
          <h2 className="h4 mb-1">Favorite PGs</h2>
          <div className="pg-muted">Saved to your account.</div>
        </div>
        <Link className="btn btn-outline-light pg-btn" to="/student/search">
          Back to Search
        </Link>
      </div>

      <div className="pg-divider my-4" />

      {error && <div className="text-danger mb-3">{error}</div>}

      {!loading && favoriteIds.length === 0 && (
        <div className="pg-muted">
          No favorites yet. Browse PGs and click the heart icon to save your
          favorites here.
        </div>
      )}

      {loading && <div className="pg-muted">Loading...</div>}

      <div className="row g-3">
        {pgs.map((pg) => (
          <div key={pg._id} className="col-12 col-md-6 col-lg-4">
            <div className="pg-kpi rounded-4 p-4 h-100 d-flex flex-column position-relative">
              <button
                type="button"
                className="btn btn-outline-secondary pg-btn rounded-circle p-2 position-absolute top-0 end-0 m-3"
                onClick={() => onRemove(pg._id)}
                aria-label="Remove from favorites"
                title="Remove from favorites"
                style={{ lineHeight: 1 }}
              >
                <span style={{ fontSize: 18 }}>❤️</span>
              </button>

              <div className="mb-2">
                <div className="h5 mb-1">{toTitle(pg.name)}</div>
                <div className="pg-muted">📍 {toTitle(pg.city)}</div>
              </div>

              <div className="flex-grow-1">
                <div className="pg-muted small mb-1">Monthly Rent</div>
                <div className="h3 fw-semibold mb-0">₹{pg.rent}</div>
              </div>

              <div className="pt-3 border-top mt-3">
                <Link
                  className="btn btn-outline-light w-100 mb-2"
                  to={`/pg/${pg._id}`}
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Favorites;
