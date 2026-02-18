import { useNavigate } from "react-router-dom";

const OwnerLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="pg-solid-panel rounded-4 p-4 p-md-5">
      <div className="row g-4 align-items-center">
        <div className="col-12 col-lg-7">
          <div className="pg-pill mb-3">
            <span className="pg-dot" />
            <span className="pg-muted small">Owner</span>
            <span className="small">List your PG, grow faster</span>
          </div>

          <h1 className="pg-hero-title display-5 mb-3">
            Manage listings with <span className="pg-gradient-text">ease</span>
            <br />
            and clarity.
          </h1>

          <div className="pg-muted fs-5 mb-4">
            Create your owner account, add PGs, and track booking requests.
          </div>

          <div className="d-flex flex-wrap gap-2">
            <button
              className="btn btn-primary pg-btn"
              onClick={() => navigate("/owner/register")}
            >
              Register as Owner
            </button>
            <button
              className="btn btn-outline-light pg-btn"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
          </div>

          <div className="pg-solid-inset rounded-4 p-3 mt-4">
            <div className="row g-2">
              <div className="col-12 col-md-4">
                <div className="py-2">
                  <div className="pg-solid-muted small">Create</div>
                  <div className="h6 mb-0">Owner profile</div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="py-2">
                  <div className="pg-solid-muted small">Add</div>
                  <div className="h6 mb-0">PG listings</div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="py-2">
                  <div className="pg-solid-muted small">Track</div>
                  <div className="h6 mb-0">Bookings</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="pg-solid-inset rounded-4 p-4">
            <div className="h5 mb-2">What you get</div>
            <ul className="pg-solid-muted mb-0">
              <li>Create an owner account with verification fields</li>
              <li>Add new PG listings in minutes</li>
              <li>Keep listings organized in your dashboard</li>
              <li>Review booking requests (when enabled)</li>
              <li>Simple, mobile-friendly management</li>
            </ul>

            <div className="pg-divider my-4" />

            <div className="pg-solid-muted small mb-2">Next step</div>
            <div className="pg-solid-muted">
              Register first, then login to access Dashboard, Add PG, and
              Bookings.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerLanding;
