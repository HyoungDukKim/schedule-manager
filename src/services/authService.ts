import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";

// Google 로그인을 처리할 인증 제공자 객체를 생성합니다.
const googleProvider = new GoogleAuthProvider();

// 이전에 로그인한 계정이 있어도 항상 Google 계정 선택 화면을 표시합니다.
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// 사용자가 선택한 Google 계정으로 Firebase 팝업 로그인을 진행합니다.
export const signInWithGoogle = async (): Promise<void> => {
  await signInWithPopup(auth, googleProvider);
};

// Firebase 로그인 세션을 종료해 다시 로그인할 수 있는 상태로 만듭니다.
export const signOutUser = async (): Promise<void> => {
  await signOut(auth);
};
