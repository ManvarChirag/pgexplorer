import { useEffect, useState } from "react";
import {
  deletePG,
  listPGs,
  listPGsByStatus,
  setPGStatus,
} from "../../services/adminService";
import AdminNav from "./AdminNav";

const PGs = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");

  const load = async (nextStatus = status) => {
    setLoading(true);
    setError("");
    try {
      const res = nextStatus
        ? await listPGsByStatus(nextStatus)
        : await listPGs();
      setItems(res.pgs || res || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load PGs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await setPGStatus(id, newStatus);
      await load(status);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update status");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this PG?")) return;
    try {
      await deletePG(id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete PG");
    }
  };

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <AdminNav />
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="pg-page-title mb-1">PG Moderation</h1>
          <div className="pg-page-subtitle">
            Review listings and approve, reject, or deactivate when needed.
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <select
            className="form-select"
            style={{ maxWidth: 220 }}
            value={status}
            onChange={(e) => {
              const s = e.target.value;
              setStatus(s);
              load(s);
            }}
            aria-label="Filter by status"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>

          <button
            className="btn btn-outline-light pg-btn"
            onClick={() => load(status)}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="pg-divider my-4" />

      {loading && <div className="pg-muted">Loading…</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && items.length === 0 ? (
        <div className="pg-muted">No PGs.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped align-middle mb-0 pg-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>City</th>
                <th>Owner</th>
                <th>Property Paper</th>
                <th>Status</th>
                <th style={{ width: 280 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((pg) => (
                <tr key={pg._id}>
                  <td>{pg.name || "-"}</td>
                  <td>{pg.city || "-"}</td>
                  <td>{pg.ownerId?.email || "-"}</td>
                  <td>
                    {pg.propertyPaper?.url ? (
                      <a
                        className="btn btn-sm btn-outline-light pg-btn"
                        href={pg.propertyPaper.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    ) : (
                      <span className="pg-muted">-</span>
                    )}
                  </td>
                  <td className="text-capitalize">{pg.status || "-"}</td>
                  <td className="d-flex gap-2 flex-wrap">
                    {pg.status === "pending" ? (
                      <>
                        <button
                          className="btn btn-sm btn-outline-light pg-btn"
                          onClick={() => updateStatus(pg._id, "active")}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-sm btn-outline-light pg-btn"
                          onClick={() => updateStatus(pg._id, "rejected")}
                        >
                          Reject
                        </button>
                      </>
                    ) : null}

                    {pg.status === "active" ? (
                      <button
                        className="btn btn-sm btn-outline-light pg-btn"
                        onClick={() => updateStatus(pg._id, "inactive")}
                      >
                        Deactivate
                      </button>
                    ) : null}

                    {pg.status === "inactive" || pg.status === "rejected" ? (
                      <button
                        className="btn btn-sm btn-outline-light pg-btn"
                        onClick={() => updateStatus(pg._id, "active")}
                      >
                        Activate
                      </button>
                    ) : null}

                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => remove(pg._id)}
                    >
                      Delete
                    </button>
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

export default PGs;
