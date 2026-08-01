import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import Main from "./components/Main";
import Footer from "./components/layout/Footer";
import LoginView from "./components/auth/LoginView";
import { useAuth } from "./hooks/useAuth";

import "./styles/layout.css";

// 기존 컴포넌트 CSS가 모두 적용된 뒤
// 최종 반응형 규칙을 가장 마지막에 불러옵니다.
import "./styles/responsive-final.css";

function App() {
  const { user, isAuthLoading, authError, login, logout } = useAuth();

  if (isAuthLoading) {
    return <LoginView error={null} onLogin={() => undefined} isLoading />;
  }

  if (!user) {
    return <LoginView error={authError} onLogin={login} />;
  }

  return (
    <>
      <Header user={user} onLogout={logout} />

      <div className="container">
        <Sidebar />
        <Main userId={user.uid} />
      </div>

      <Footer />
    </>
  );
}

export default App;
