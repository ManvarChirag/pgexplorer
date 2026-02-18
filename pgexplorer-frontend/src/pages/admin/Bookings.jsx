import { useEffect, useState } from "react";
import { listBookings } from "../../services/adminService";
import AdminNav from "./AdminNav";

const Bookings = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listBookings();
      setItems(res.bookings || res || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <AdminNav />
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="pg-page-title mb-1">Bookings</h1>
          <div className="pg-page-subtitle">
            View booking activity across the platform.
          </div>
        </div>
        <button className="btn btn-outline-light pg-btn" onClick={load}>
          Refresh
        </button>
      </div>

      <div className="pg-divider my-4" />

      {loading && <div className="pg-muted">Loading…</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && items.length === 0 ? (
        <div className="pg-muted">No bookings.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped align-middle mb-0 pg-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>PG</th>
                <th>Status</th>
                <th>Requested</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b._id}>
                  <td>{b.student?.name || b.student?.email || "-"}</td>
                  <td>{b.pg?.name || "-"}</td>
                  <td className="text-capitalize">{b.status || "-"}</td>
                  <td>
                    {b.createdAt ? new Date(b.createdAt).toLocaleString() : "-"}
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

export default Bookings;
