import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import Main from "./components/Main";
import Footer from "./components/layout/Footer";
import LoginView from "./components/auth/LoginView";
import PwaStatus from "./components/pwa/PwaStatus";
import { useAuth } from "./hooks/useAuth";

import "./styles/layout.css";

// 기존 컴포넌트 CSS가 모두 적용된 뒤
// 최종 반응형 규칙을 가장 마지막에 불러옵니다.
import "./styles/responsive-final.css";
import "./styles/pwa.css";

function App() {
  // 인증 Hook에서 현재 사용자와 로그인·로그아웃 함수를 가져옵니다.
  const { user, isAuthLoading, authError, login, logout } = useAuth();

  // Firebase가 저장된 로그인 상태를 확인하는 동안 로딩 화면을 표시합니다.
  if (isAuthLoading) {
    return (
      <>
        <PwaStatus />
        <LoginView error={null} onLogin={() => undefined} isLoading />
      </>
    );
  }

  // 로그인한 사용자가 없으면 Google 로그인 화면을 표시합니다.
  if (!user) {
    return (
      <>
        <PwaStatus />
        <LoginView error={authError} onLogin={login} />
      </>
    );
  }

  // 로그인한 사용자에게 기존 일정관리 화면과 사용자 메뉴를 표시합니다.
  return (
    <>
      <PwaStatus />
      <Header
        user={user}
        onSwitchAccount={login}
        onLogout={logout}
      />

      <div className="container">
        <Sidebar />
        <Main userId={user.uid} />
      </div>

      <Footer />
    </>
  );
}

export default App;
