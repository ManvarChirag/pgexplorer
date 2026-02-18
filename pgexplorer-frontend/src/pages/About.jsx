const About = () => {
  return (
    <div className="pg-solid-panel rounded-4 p-4 p-md-5">
      <div className="pg-hero">
        <div className="pg-hero-inner">
          <div className="pg-pill mb-3">
            <span className="pg-dot" />
            <span className="pg-muted small">About</span>
            <span className="small">PG Explorer</span>
          </div>

          <h1 className="pg-hero-title mb-2">
            About <span className="pg-gradient-text">PG Explorer</span>
          </h1>
          <p className="pg-muted pg-hero-subtitle mb-0">
            A simple platform connecting students with trusted PG owners.
          </p>
        </div>
      </div>

      <div className="pg-divider my-4" />

      <div className="pg-solid-inset rounded-4 p-4">
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <div className="h5 mb-2">Our mission</div>
            <div className="pg-solid-muted">
              Finding the right PG should be quick, clear, and stress-free. PG
              Explorer is built to help students compare options easily and help
              owners list properties without confusion.
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="h5 mb-2">What you can do</div>
            <ul className="mb-0 pg-solid-muted">
              <li>Search PGs by city, rent range, and gender preference</li>
              <li>See key details like rent and amenities</li>
              <li>Send booking requests (student)</li>
              <li>List PGs and manage booking requests (owner)</li>
            </ul>
          </div>

          <div className="col-12">
            <div className="pg-divider my-2" />
            <div className="h5 mb-2 mt-3">Why PG Explorer</div>
            <div className="pg-solid-muted">
              We focus on clarity: fewer steps, simple filters, and a clean
              dashboard for both students and owners. This keeps the experience
              fast even on mobile.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
