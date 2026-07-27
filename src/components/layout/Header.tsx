import "../../styles/header.css";

function Header() {
  return (
    <header className="header">
      <div className="logo">
        📅 Schedule Manager
      </div>

      <nav className="menu">
        <span>🔍</span>
        <span>⚙️</span>
        <span>👤</span>
      </nav>
    </header>
  );
}

export default Header;