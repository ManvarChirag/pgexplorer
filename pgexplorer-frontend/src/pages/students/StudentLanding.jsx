import { useNavigate } from "react-router-dom";

const StudentLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="pg-solid-panel rounded-4 p-4 p-md-5">
      <div className="row g-4 align-items-center">
        <div className="col-12 col-lg-7">
          <div className="pg-pill mb-3">
            <span className="pg-dot" />
            <span className="pg-muted small">Student</span>
            <span className="small">Search smarter, decide faster</span>
          </div>

          <h1 className="pg-hero-title display-5 mb-3">
            Everything you need to{" "}
            <span className="pg-gradient-text">find</span>
            <br />
            the right PG.
          </h1>

          <div className="pg-muted fs-5 mb-4">
            Use filters, browse smoothly, and keep your profile ready.
          </div>

          <div className="d-flex flex-wrap gap-2">
            <button
              className="btn btn-primary pg-btn"
              onClick={() => navigate("/student/register")}
            >
              Register as Student
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
                  <div className="pg-solid-muted small">Filters</div>
                  <div className="h6 mb-0">City • Rent • Gender</div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="py-2">
                  <div className="pg-solid-muted small">Browse</div>
                  <div className="h6 mb-0">Smooth scrolling</div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="py-2">
                  <div className="pg-solid-muted small">Profile</div>
                  <div className="h6 mb-0">Always accessible</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="pg-solid-inset rounded-4 p-4">
            <div className="h5 mb-2">What you get</div>
            <ul className="pg-solid-muted mb-0">
              <li>Search PGs by city</li>
              <li>Filter by max rent and gender preference</li>
              <li>See rent and key details in one place</li>
              <li>View your profile anytime after login</li>
              <li>Infinite scroll for quick browsing</li>
            </ul>

            <div className="pg-divider my-4" />

            <div className="pg-solid-muted small mb-2">Next step</div>
            <div className="pg-solid-muted">
              Register first, then login to access Dashboard, Search PG, and
              Profile.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentLanding;
