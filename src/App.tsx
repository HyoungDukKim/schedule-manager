import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import Main from "./components/Main";
import Footer from "./components/layout/Footer";

import "./styles/layout.css";

// 기존 컴포넌트 CSS가 모두 적용된 뒤
// 최종 반응형 규칙을 가장 마지막에 불러옵니다.
import "./styles/responsive-final.css";

function App() {
  return (
    <>
      <Header />

      <div className="container">
        <Sidebar />
        <Main />
      </div>

      <Footer />
    </>
  );
}

export default App;