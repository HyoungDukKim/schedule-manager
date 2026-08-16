import "../../styles/header.css";
import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";

// Header가 사용자 정보와 인증 동작을 부모 컴포넌트에서 전달받습니다.
type Props = {
  user: User;
  onSwitchAccount: () => void | Promise<void>;
  onLogout: () => void | Promise<void>;
  onAddSchedule: () => void;
};

function Header({ user, onSwitchAccount, onLogout, onAddSchedule }: Props) {
  // 사용자 메뉴가 열려 있는지 관리합니다.
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // 메뉴 바깥을 클릭했는지 확인하기 위해 전체 메뉴 영역을 참조합니다.
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Google 계정에 이름이 없으면 이메일을 대신 표시합니다.
  const userLabel = user.displayName ?? user.email ?? "사용자";

  useEffect(() => {
    // 메뉴가 닫혀 있으면 문서 이벤트를 등록하지 않습니다.
    if (!isUserMenuOpen) return;

    // 사용자 메뉴 바깥을 누르면 드롭다운을 닫습니다.
    const handleOutsideClick = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    // Escape 키를 누르면 키보드 사용자도 메뉴를 닫을 수 있습니다.
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsUserMenuOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscapeKey);

    // 컴포넌트가 다시 렌더링되거나 사라질 때 이벤트를 정리합니다.
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isUserMenuOpen]);

  // 계정 변경 메뉴를 누르면 메뉴를 닫고 Google 계정 선택 화면을 엽니다.
  const handleSwitchAccount = () => {
    setIsUserMenuOpen(false);
    void onSwitchAccount();
  };

  // 로그아웃 메뉴를 누르면 메뉴를 닫고 Firebase 로그아웃을 실행합니다.
  const handleLogout = () => {
    setIsUserMenuOpen(false);
    void onLogout();
  };

  return (
    <header className="header">
      {/* 기존 애플리케이션 로고를 그대로 표시합니다. */}
      <div className="logo">📅 Schedule Manager</div>

      <div className="header-actions">
        <button type="button" className="header-add-btn" onClick={onAddSchedule}>
          + 일정 추가
        </button>

        <div className="header-user-menu" ref={userMenuRef}>
          {/* 프로필 버튼을 누르면 사용자 메뉴를 열거나 닫습니다. */}
          <button
            type="button"
            className="user-menu-trigger"
            onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
          >
            {/* Google 프로필 사진이 있으면 사진을, 없으면 기본 아이콘을 표시합니다. */}
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="user-profile-image"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="user-profile-fallback" aria-hidden="true">👤</span>
            )}

            <span className="user-menu-label">{userLabel}</span>
            <span className="user-menu-arrow" aria-hidden="true">▾</span>
          </button>

          {/* 사용자 버튼을 클릭한 경우에만 드롭다운 메뉴를 표시합니다. */}
          {isUserMenuOpen && (
            <div className="user-menu-dropdown" role="menu">
              <button type="button" role="menuitem" onClick={handleSwitchAccount}>
                계정 변경
              </button>
              <button type="button" role="menuitem" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
