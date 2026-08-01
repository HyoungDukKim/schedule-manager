import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../firebase";
import { signInWithGoogle, signOutUser } from "../services/authService";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() =>
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    }), []);

  const login = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google 로그인에 실패했습니다.", error);
      setAuthError("Google 로그인에 실패했습니다. 다시 시도해 주세요.");
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    try {
      await signOutUser();
    } catch (error) {
      console.error("로그아웃에 실패했습니다.", error);
      setAuthError("로그아웃에 실패했습니다. 다시 시도해 주세요.");
    }
  }, []);

  return { user, isAuthLoading, authError, login, logout };
};
