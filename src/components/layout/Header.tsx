import "../../styles/header.css";
import type { User } from "firebase/auth";

type Props = {
  user: User;
  onLogout: () => void;
};

function Header({ user, onLogout }: Props) {
  return (
    <header className="header">
      <div className="logo">
        📅 Schedule Manager
      </div>

      <nav className="menu">
        <span>🔍</span>
        <span>⚙️</span>
        <span title={user.email ?? undefined}>👤 {user.displayName ?? user.email}</span>
        <button type="button" className="logout-btn" onClick={onLogout}>
          로그아웃
        </button>
      </nav>
    </header>
  );
}

export default Header;
