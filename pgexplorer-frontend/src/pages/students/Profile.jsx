import { useEffect, useState } from "react";
import api from "../../utils/axios";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: "",
    college: "",
    branch: "",
    year: "",
  });

  const loadProfile = () =>
    api
      .get("/student/profile")
      .then((res) => {
        setProfile(res.data);
        setForm({
          name: res.data?.name ?? "",
          college: res.data?.college ?? "",
          branch: res.data?.branch ?? "",
          year: String(res.data?.year ?? ""),
        });
      })
      .catch((err) => {
        console.error("PROFILE ERROR:", err.response?.data || err.message);
        setError(err.response?.data?.message || "Failed to load profile");
      });

  useEffect(() => {
    loadProfile();
  }, []);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        college: form.college,
        branch: form.branch,
        year: Number(form.year),
      };
      const res = await api.put("/student/profile", payload);
      setProfile(res.data);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    if (profile) {
      setForm({
        name: profile?.name ?? "",
        college: profile?.college ?? "",
        branch: profile?.branch ?? "",
        year: String(profile?.year ?? ""),
      });
    }
    setEditing(false);
    setError(null);
  };

  if (!profile) return <p className="pg-muted">Loading...</p>;

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h2 className="h4 pg-title mb-1">Student Profile</h2>
          <div className="pg-muted">Your account details.</div>
        </div>
        <span className="badge text-bg-dark">Student</span>
      </div>

      <div className="pg-divider my-4" />

      {error && <div className="text-danger mb-3">{error}</div>}

      <div className="d-flex justify-content-end gap-2 mb-3">
        {editing ? (
          <>
            <button
              className="btn btn-primary pg-btn"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              className="btn btn-outline-light pg-btn"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            className="btn btn-outline-light pg-btn"
            onClick={() => {
              setError(null);
              setEditing(true);
            }}
          >
            Edit
          </button>
        )}
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <div className="pg-kpi rounded-4 p-4">
            <div className="pg-muted small">Name</div>
            {editing ? (
              <input
                className="form-control mt-2"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            ) : (
              <div className="h5 mb-0">{profile.name}</div>
            )}
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="pg-kpi rounded-4 p-4">
            <div className="pg-muted small">Email</div>
            <div className="h5 mb-0">{profile.userId.email}</div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="pg-kpi rounded-4 p-4">
            <div className="pg-muted small">College</div>
            {editing ? (
              <input
                className="form-control mt-2"
                value={form.college}
                onChange={(e) =>
                  setForm((f) => ({ ...f, college: e.target.value }))
                }
              />
            ) : (
              <div className="h6 mb-0">{profile.college}</div>
            )}
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="pg-kpi rounded-4 p-4">
            <div className="pg-muted small">Branch</div>
            {editing ? (
              <input
                className="form-control mt-2"
                value={form.branch}
                onChange={(e) =>
                  setForm((f) => ({ ...f, branch: e.target.value }))
                }
              />
            ) : (
              <div className="h6 mb-0">{profile.branch}</div>
            )}
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="pg-kpi rounded-4 p-4">
            <div className="pg-muted small">Year</div>
            {editing ? (
              <input
                className="form-control mt-2"
                type="number"
                value={form.year}
                onChange={(e) =>
                  setForm((f) => ({ ...f, year: e.target.value }))
                }
              />
            ) : (
              <div className="h6 mb-0">{profile.year}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
