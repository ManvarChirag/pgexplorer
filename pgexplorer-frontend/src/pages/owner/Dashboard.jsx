import { useNavigate } from "react-router-dom";

const OwnerDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h2 className="h4 pg-title mb-1">Owner Dashboard</h2>
          <div className="pg-muted">Manage PG listings and bookings.</div>
        </div>
        <span className="badge text-bg-success">Owner</span>
      </div>

      <div className="pg-divider my-4" />

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <div className="pg-kpi rounded-4 p-4 pg-card-hover h-100">
            <div className="pg-muted small mb-1">Listing</div>
            <div className="h5 mb-3">Add a new PG</div>
            <button
              className="btn btn-primary pg-btn"
              onClick={() => navigate("/owner/add-pg")}
            >
              Add PG
            </button>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="pg-kpi rounded-4 p-4 pg-card-hover h-100">
            <div className="pg-muted small mb-1">Listings</div>
            <div className="h5 mb-3">View your PGs</div>
            <button
              className="btn btn-outline-light pg-btn"
              onClick={() => navigate("/owner/pgs")}
            >
              My PGs
            </button>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="pg-kpi rounded-4 p-4 pg-card-hover h-100">
            <div className="pg-muted small mb-1">Bookings</div>
            <div className="h5 mb-3">Review requests</div>
            <button
              className="btn btn-outline-light pg-btn"
              onClick={() => navigate("/owner/bookings")}
            >
              View Bookings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
