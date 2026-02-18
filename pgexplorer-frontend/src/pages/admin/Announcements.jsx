import { useEffect, useState } from "react";
import {
  createAnnouncement,
  listAnnouncements,
} from "../../services/adminService";
import AdminNav from "./AdminNav";

const Announcements = () => {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listAnnouncements();
      setItems(res.announcements || res || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const roles = audience === "all" ? undefined : [audience];
      await createAnnouncement({ title, message, roles });
      setTitle("");
      setMessage("");
      setAudience("all");
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to create announcement");
    }
  };

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <AdminNav />
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="pg-page-title mb-1">Announcements</h1>
          <div className="pg-page-subtitle">
            Send important updates to all users (or by role).
          </div>
        </div>
        <button className="btn btn-outline-light pg-btn" onClick={load}>
          Refresh
        </button>
      </div>

      <div className="pg-divider my-4" />

      {error && <div className="alert alert-danger">{error}</div>}

      <form className="row g-2 mb-4 pg-form" onSubmit={submit}>
        <div className="col-12 col-md-2">
          <select
            className="form-select"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            aria-label="Announcement audience"
          >
            <option value="all">All</option>
            <option value="student">Students</option>
            <option value="owner">Owners</option>
            
          </select>
        </div>
        <div className="col-12 col-md-4">
          <input
            className="form-control"
            placeholder="Title (e.g., Maintenance update)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="col-12 col-md-6">
          <input
            className="form-control"
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>
        <div className="col-12 col-md-2 d-grid">
          <button className="btn pg-btn" type="submit">
            Publish
          </button>
        </div>
      </form>

      {loading && <div className="pg-muted">Loading…</div>}

      {!loading && items.length === 0 ? (
        <div className="pg-muted">No announcements yet.</div>
      ) : (
        <div className="d-grid gap-2">
          {items.map((a) => (
            <div
              key={a.id || a._id || a.createdAt}
              className="pg-kpi rounded-4 p-3 p-md-4"
            >
              <div className="d-flex justify-content-between gap-2">
                <div className="pg-section-title mb-1">{a.title}</div>
                <div className="pg-muted small">
                  {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                </div>
              </div>
              <div className="pg-muted small mb-2">
                Audience:{" "}
                {Array.isArray(a.roles) && a.roles.length > 0
                  ? a.roles.join(", ")
                  : "all"}
              </div>
              <div className="pg-muted">{a.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Announcements;
