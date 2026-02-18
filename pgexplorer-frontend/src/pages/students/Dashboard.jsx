import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h2 className="h4 pg-title mb-1">Student Dashboard</h2>
          <div className="pg-muted">Find PGs, save time, book faster.</div>
        </div>
        <span className="badge text-bg-info">Live</span>
      </div>

      <div className="pg-divider my-4" />

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <div className="pg-kpi rounded-4 p-4 pg-card-hover h-100">
            <div className="pg-muted small mb-1">Explore</div>
            <div className="h5 mb-3">Search PG listings</div>
            <button
              className="btn btn-primary pg-btn"
              onClick={() => navigate("/student/search")}
            >
              Search PG
            </button>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="pg-kpi rounded-4 p-4 pg-card-hover h-100">
            <div className="pg-muted small mb-1">Account</div>
            <div className="h5 mb-3">View your profile</div>
            <button
              className="btn btn-outline-light pg-btn"
              onClick={() => navigate("/student/profile")}
            >
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
