import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">👥</span>
          <span>EMS</span>
        </Link>
        <div className="navbar-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            📋 Employees
          </Link>
          <Link to="/add" className={`nav-link ${location.pathname === '/add' ? 'active' : ''}`}>
            ➕ Add New
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
