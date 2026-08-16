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
import "./styles/notification.css";
import "./styles/ai-schedule.css";

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

  // 사용자 UID가 바뀌면 Main을 새로 마운트하여 기본 달력 화면에서 시작합니다.
  return (
    <>
      <PwaStatus />
      <Main
        key={user.uid}
        user={user}
        onSwitchAccount={login}
        onLogout={logout}
      />
      <Footer />
    </>
  );
}

export default App;
