import { useEffect, useState } from "react";
import api from "../../utils/axios";
import { resolveMediaUrl } from "../../utils/media";

const MyPGs = () => {
  const [pgs, setPgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [approvedCountByPgId, setApprovedCountByPgId] = useState({});
  const [editForm, setEditForm] = useState({
    name: "",
    city: "",
    rent: "",
    totalRooms: "",
    availableRooms: "",
    amenities: "",
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [pgRes, bookingRes] = await Promise.all([
          api.get("/pg/mine"),
          api.get("/booking/owner"),
        ]);

        if (mounted) {
          setPgs(Array.isArray(pgRes.data) ? pgRes.data : []);

          const counts = {};
          const bookings = Array.isArray(bookingRes.data)
            ? bookingRes.data
            : [];
          for (const b of bookings) {
            const pgId = b?.pg?._id;
            if (!pgId) continue;
            if (b.status !== "approved") continue;
            counts[pgId] = (counts[pgId] || 0) + 1;
          }
          setApprovedCountByPgId(counts);
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || "Failed to load PGs");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const startEdit = (pg) => {
    setEditingId(pg._id);
    setEditForm({
      name: pg.name ?? "",
      city: pg.city ?? "",
      rent: String(pg.rent ?? ""),
      totalRooms: String(pg.totalRooms ?? ""),
      availableRooms: String(pg.availableRooms ?? ""),
      amenities: Array.isArray(pg.amenities) ? pg.amenities.join(",") : "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id) => {
    setSaving(true);
    setError(null);
    try {
      const approvedCount = Number(approvedCountByPgId[id] || 0);
      const totalRoomsRaw = Math.trunc(Number(editForm.totalRooms || 0));
      if (!Number.isFinite(totalRoomsRaw)) {
        setError("Total rooms must be a number");
        return;
      }

      if (totalRoomsRaw < 0) {
        setError("Total rooms cannot be negative");
        return;
      }

      if (totalRoomsRaw < approvedCount) {
        setError(
          `Total rooms cannot be less than approved bookings (${approvedCount})`,
        );
        return;
      }

      const totalRooms = totalRoomsRaw;

      const payload = {
        name: editForm.name,
        city: editForm.city,
        rent: Number(editForm.rent),
        totalRooms,
        amenities: editForm.amenities,
      };
      const res = await api.put(`/pg/${id}`, payload);
      setPgs((prev) => prev.map((p) => (p._id === id ? res.data : p)));
      setEditingId(null);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        err.message ||
        "Failed to update PG";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const deletePg = async (id) => {
    const ok = window.confirm("Delete this PG? This cannot be undone.");
    if (!ok) return;
    setError(null);
    try {
      await api.delete(`/pg/${id}`);
      setPgs((prev) => prev.filter((p) => p._id !== id));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        err.message ||
        "Failed to delete PG";
      setError(msg);
    }
  };

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h2 className="h4 pg-title mb-1">My PGs</h2>
          <div className="pg-muted">All PGs you have listed.</div>
        </div>
        <span className="badge text-bg-success">Owner</span>
      </div>

      <div className="pg-divider my-4" />

      {loading && <div className="pg-muted">Loading...</div>}
      {error && <div className="text-danger">{error}</div>}

      {!loading && !error && pgs.length === 0 && (
        <div className="pg-muted">No PGs found.</div>
      )}

      <div className="row g-3">
        {pgs.map((pg) => (
          <div key={pg._id} className="col-12 col-md-6 col-lg-4">
            <div className="pg-kpi rounded-4 p-4 h-100">
              {pg.images?.[0]?.url && (
                <img
                  src={resolveMediaUrl(pg.images[0].url)}
                  alt={pg.name}
                  className="w-100 rounded-3 mb-3"
                  style={{ height: 160, objectFit: "cover" }}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const el = e.currentTarget;
                    const src = String(el?.getAttribute("src") || "");
                    if (!src) return;
                    if (!el.dataset?.retried && src.startsWith("http://")) {
                      el.dataset.retried = "1";
                      el.src = `https://${src.slice(7)}`;
                      return;
                    }
                    el.style.display = "none";
                  }}
                />
              )}
              <div className="h5 mb-1">{pg.name}</div>
              <div className="pg-muted small mb-2">
                {pg.city} • ₹{pg.rent}
              </div>
              <div className="pg-muted small">
                Rooms: {pg.availableRooms}/{pg.totalRooms}
              </div>

              <div className="d-flex gap-2 mt-3">
                {editingId === pg._id ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary pg-btn"
                      onClick={() => saveEdit(pg._id)}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-light pg-btn"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-light pg-btn"
                      onClick={() => startEdit(pg)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => deletePg(pg._id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>

              {editingId === pg._id && (
                <div className="mt-3">
                  <div className="mb-2">
                    <label className="form-label">Name</label>
                    <input
                      className="form-control"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">City</label>
                    <input
                      className="form-control"
                      value={editForm.city}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, city: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Rent</label>
                    <input
                      className="form-control"
                      type="number"
                      value={editForm.rent}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, rent: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label">Total rooms</label>
                      <input
                        className="form-control"
                        type="number"
                        min={Math.max(
                          0,
                          Number(approvedCountByPgId[pg._id] || 0),
                        )}
                        value={editForm.totalRooms}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            totalRooms: e.target.value,
                          }))
                        }
                      />
                      <div className="pg-muted small mt-1">
                        Approved bookings:{" "}
                        {Number(approvedCountByPgId[pg._id] || 0)}
                      </div>
                    </div>
                    <div className="col-6">
                      <label className="form-label">Available rooms</label>
                      <input
                        className="form-control"
                        type="number"
                        value={editForm.availableRooms}
                        disabled
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            availableRooms: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="form-label">
                      Amenities (comma-separated)
                    </label>
                    <input
                      className="form-control"
                      value={editForm.amenities}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          amenities: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyPGs;
