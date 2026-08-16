import type { User } from "firebase/auth";
import type { Theme } from "../../types/ui";

type Props = {
  user: User;
  theme: Theme;
  onToggleTheme: () => void;
  onSwitchAccount: () => void | Promise<void>;
  onLogout: () => void | Promise<void>;
};

function SettingsView({
  user,
  theme,
  onToggleTheme,
  onSwitchAccount,
  onLogout,
}: Props) {
  const userLabel = user.displayName ?? user.email ?? "사용자";

  return (
    <div className="settings-grid">
      <section className="settings-card" aria-labelledby="display-settings-title">
        <div>
          <h3 id="display-settings-title">화면</h3>
          <p>앱 전체의 밝은 화면과 어두운 화면을 전환합니다.</p>
        </div>
        <button type="button" className="theme-toggle-btn" onClick={onToggleTheme}>
          {theme === "light" ? "🌙 다크 모드" : "☀️ 라이트 모드"}
        </button>
      </section>

      <section className="settings-card" aria-labelledby="pwa-settings-title">
        <div>
          <h3 id="pwa-settings-title">PWA</h3>
          <p>브라우저의 설치 메뉴에서 앱을 설치할 수 있으며, 새 버전은 화면 상단에서 안내합니다.</p>
        </div>
        <span className="settings-status">설치형 앱 지원</span>
      </section>

      <section className="settings-card" aria-labelledby="account-settings-title">
        <div className="settings-account-info">
          <h3 id="account-settings-title">계정</h3>
          {user.photoURL && (
            <img
              className="settings-account-image"
              src={user.photoURL}
              alt=""
              referrerPolicy="no-referrer"
            />
          )}
          <p className="settings-account-name">{userLabel}</p>
          {user.email && user.email !== userLabel && <p>{user.email}</p>}
        </div>
        <div className="settings-account-actions">
          <button type="button" onClick={() => void onSwitchAccount()}>계정 변경</button>
          <button type="button" className="settings-logout-btn" onClick={() => void onLogout()}>로그아웃</button>
        </div>
      </section>
    </div>
  );
}

export default SettingsView;
