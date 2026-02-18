import { useEffect, useState } from "react";
import { getDashboard } from "../../services/adminService";
import AdminNav from "./AdminNav";

const sumCounts = (arr) =>
  (Array.isArray(arr) ? arr : []).reduce((sum, x) => sum + (x?.count || 0), 0);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const res = await getDashboard();
        if (!mounted) return;
        setData(res);
        setError("");
      } catch (e) {
        if (!mounted) return;
        setError(
          e?.response?.data?.message || "Failed to load admin dashboard",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const totalUsers = data ? data.totalUsers ?? sumCounts(data.usersByRole) : 0;
  const totalPGs = data ? data.totalPGs ?? sumCounts(data.pgsByStatus) : 0;
  const totalBookings = data
    ? data.totalBookings ?? sumCounts(data.bookingsByStatus)
    : 0;

  const renderCountList = (items, labelKey) => {
    const list = Array.isArray(items) ? items : [];
    if (list.length === 0) return <div className="pg-muted">No data.</div>;
    return (
      <div className="d-grid gap-1">
        {list.map((x) => (
          <div
            key={x[labelKey]}
            className="d-flex align-items-center justify-content-between gap-3 pg-kpi-row"
          >
            <span className="pg-muted text-capitalize">
              {String(x[labelKey] || "(unknown)")}
            </span>
            <span className="pg-kbd">{x.count ?? 0}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h1 className="pg-page-title mb-1">Admin Dashboard</h1>
          <div className="pg-page-subtitle">
            Overview of users, PG listings, and bookings.
          </div>
        </div>
      </div>

      <AdminNav />

      {loading && <div className="pg-muted">Loading…</div>}
      {error && <div className="alert alert-danger mb-3">{error}</div>}

      {data && (
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <div className="pg-kpi rounded-4 p-3 p-md-4 h-100">
              <div className="pg-kpi-label">Total Users</div>
              <div className="pg-kpi-value">{totalUsers}</div>
              <div className="pg-muted small">Students, owners, and admins.</div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="pg-kpi rounded-4 p-3 p-md-4 h-100">
              <div className="pg-kpi-label">Total PGs</div>
              <div className="pg-kpi-value">{totalPGs}</div>
              <div className="pg-muted small">Across all listing statuses.</div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="pg-kpi rounded-4 p-3 p-md-4 h-100">
              <div className="pg-kpi-label">Total Bookings</div>
              <div className="pg-kpi-value">{totalBookings}</div>
              <div className="pg-muted small">Includes pending and confirmed.</div>
            </div>
          </div>

          <div className="col-12">
            <div className="pg-kpi rounded-4 p-3 p-md-4">
              <div className="pg-section-title mb-3">Breakdown by status</div>
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <div className="pg-stat p-3 h-100">
                    <div className="pg-section-title mb-2">Bookings</div>
                    <div className="pg-muted small mb-3">
                      Current booking status counts.
                    </div>
                    {renderCountList(data.bookingsByStatus, "status")}
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="pg-stat p-3 h-100">
                    <div className="pg-section-title mb-2">PG listings</div>
                    <div className="pg-muted small mb-3">
                      Listing status overview.
                    </div>
                    {renderCountList(data.pgsByStatus, "status")}
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="pg-stat p-3 h-100">
                    <div className="pg-section-title mb-2">Users</div>
                    <div className="pg-muted small mb-3">
                      Total accounts by role.
                    </div>
                    {renderCountList(data.usersByRole, "role")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6">
            <div className="pg-kpi rounded-4 p-3 p-md-4 h-100">
              <div className="pg-section-title mb-3">Top locations</div>
              {(data.topCities || []).length === 0 ? (
                <div className="pg-muted">No data.</div>
              ) : (
                renderCountList(data.topCities, "city")
              )}
            </div>
          </div>

          <div className="col-12 col-md-6">
            <div className="pg-kpi rounded-4 p-3 p-md-4 h-100">
              <div className="pg-section-title mb-3">Most booked PGs</div>
              {(data.mostBooked || []).length === 0 ? (
                <div className="pg-muted">No data.</div>
              ) : (
                <div className="d-grid gap-1">
                  {data.mostBooked.map((x) => (
                    <div
                      key={x.pgId}
                      className="d-flex align-items-center justify-content-between gap-3 pg-kpi-row"
                    >
                      <span className="pg-muted">
                        {x.name || "(PG deleted)"}
                        {x.city ? ` • ${x.city}` : ""}
                      </span>
                      <span className="pg-strong">{x.count ?? 0}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
