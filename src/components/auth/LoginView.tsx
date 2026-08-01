import "../../styles/auth.css";

type Props = {
  error: string | null;
  onLogin: () => void;
  isLoading?: boolean;
};

function LoginView({ error, onLogin, isLoading = false }: Props) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-icon" aria-hidden="true">📅</div>
        <h1>Schedule Manager</h1>
        <p>
          {isLoading
            ? "로그인 상태를 확인하고 있습니다."
            : "내 일정을 안전하게 관리하려면 로그인하세요."}
        </p>
        {!isLoading && (
          <button type="button" className="google-login-btn" onClick={onLogin}>
            Google로 로그인
          </button>
        )}
        {error && <p className="auth-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}

export default LoginView;
