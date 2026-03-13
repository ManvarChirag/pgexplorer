import { useCallback, useEffect, useState } from "react";
import {
  blockUser,
  listUsers,
  listUsersByRole,
  unblockUser,
} from "../../services/adminService";
import AdminNav from "./AdminNav";

const Users = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");

  const load = useCallback(
    async (nextRole = role) => {
      setLoading(true);
      setError("");
      try {
        const res = nextRole
          ? await listUsersByRole(nextRole)
          : await listUsers();
        setItems(res.users || res || []);
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    [role],
  );

  useEffect(() => {
    load();
  }, [load]);

  const setBlocked = async (id, nextBlocked) => {
    try {
      if (nextBlocked) await blockUser(id);
      else await unblockUser(id);
      await load(role);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update user");
    }
  };

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <AdminNav />
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="pg-page-title mb-1">Users</h1>
          <div className="pg-page-subtitle">
            View and manage accounts. Block/unblock suspicious users.
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <select
            className="form-select"
            style={{ maxWidth: 220 }}
            value={role}
            onChange={(e) => {
              const r = e.target.value;
              setRole(r);
              load(r);
            }}
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            <option value="student">Students</option>
            <option value="owner">Owners</option>
            <option value="admin">Admins</option>
          </select>

          <button
            className="btn btn-outline-light pg-btn"
            onClick={() => load(role)}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="pg-divider my-4" />

      {loading && <div className="pg-muted">Loading…</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && items.length === 0 ? (
        <div className="pg-muted">No users.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped align-middle mb-0 pg-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Blocked</th>
                <th style={{ width: 160 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u._id || u.id}>
                  <td>{u.name || "-"}</td>
                  <td>{u.email || "-"}</td>
                  <td className="text-capitalize">{u.role || "-"}</td>
                  <td>{u.blocked ? "Yes" : "No"}</td>
                  <td>
                    {String(u.role).toLowerCase() === "admin" ? (
                      <span className="pg-muted">—</span>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline-light pg-btn"
                        onClick={() => setBlocked(u._id || u.id, !u.blocked)}
                      >
                        {u.blocked ? "Unblock" : "Block"}
                      </button>
                    )}
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

export default Users;
