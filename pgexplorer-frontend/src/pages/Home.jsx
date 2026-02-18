import { useNavigate } from "react-router-dom";

const Section = ({ id, tag, title, desc, points, cta }) => {
  const navigate = useNavigate();

  return (
    <div id={id} className="pg-anchor">
      <div className="row g-4 align-items-start">
        <div className="col-12 col-lg-7">
          <div className="pg-solid-muted small">{tag}</div>
          <h3 className="mb-2">{title}</h3>
          <p className="pg-solid-muted">{desc}</p>

          <ul className="pg-solid-muted mt-3">
            {points.map((p, i) => (
              <li key={i} className="mb-1">
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="col-12 col-lg-5 d-flex align-items-start">
          <button
            className="btn btn-primary pg-btn mt-2"
            onClick={() => navigate(cta.link)}
          >
            {cta.text}
          </button>
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="pg-section">
      <div className="pg-solid-panel rounded-4 p-4 p-md-5">
        {/* ================= HERO ================= */}
        <div id="home" className="pg-anchor mb-5">
          <div className="pg-hero">
            <div className="pg-hero-inner">
              <div className="pg-pill mb-3">
                <span className="pg-dot" />
                <span className="pg-muted small">New</span>
                <span className="small">Smarter PG search for students</span>
              </div>

              <h1 className="pg-hero-title mb-3">
                Find your next <span className="pg-gradient-text">PG</span>
                <br /> in minutes.
              </h1>

              <p className="pg-muted pg-hero-subtitle mb-4">
                Clear pricing, useful filters, and simple dashboards —
                everything you need to find or manage PG accommodation easily.
              </p>

              <div className="pg-hero-actions">
                <button
                  className="btn btn-primary pg-btn"
                  onClick={() => navigate("/login")}
                >
                  Get Started <span className="pg-kbd ms-2">G</span>
                </button>

                <button
                  className="btn btn-outline-light pg-btn"
                  onClick={() => scrollTo("about")}
                >
                  Learn More <span className="pg-kbd ms-2">L</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pg-divider my-5" />

        {/* ================= ABOUT ================= */}
        <Section
          id="about"
          tag="About PG Explorer"
          title="A faster, simpler way to find and manage PGs"
          desc="PG Explorer is designed to remove confusion from the PG search process.
          Students can quickly compare options while owners can manage listings and
          bookings from one place."
          points={[
            "No hidden rent or unclear details",
            "Search results load quickly with smooth scrolling",
            "Separate dashboards for students and owners",
            "Designed for mobile and desktop users",
            "Secure login and verified listings",
          ]}
          cta={{ text: "Start Exploring", link: "/login" }}
        />

        <div className="pg-divider my-5" />

        {/* ================= STUDENT ================= */}
        <Section
          id="student"
          tag="For Students"
          title="Find the right PG without wasting time"
          desc="Instead of calling multiple owners and checking random ads,
          you can browse verified PGs with filters that actually help."
          points={[
            "Search PGs by city and location",
            "Filter by rent range and gender preference",
            "View room type, amenities, and rules clearly",
            "Save time with instant booking requests",
            "Manage your profile and bookings in dashboard",
          ]}
          cta={{ text: "Register as Student", link: "/student/register" }}
        />

        <div className="pg-divider my-5" />

        {/* ================= OWNER ================= */}
        <Section
          id="owner"
          tag="For Owners"
          title="List your PG and manage bookings easily"
          desc="No paperwork, no repeated calls. Add your PG once and manage all
          student requests from your dashboard."
          points={[
            "Create and update PG listings anytime",
            "Upload room details, rent, and facilities",
            "Receive and approve booking requests",
            "Track occupied and available rooms",
            "Grow visibility among local students",
          ]}
          cta={{ text: "Register as Owner", link: "/owner/register" }}
        />
      </div>
    </div>
  );
};

export default Home;
