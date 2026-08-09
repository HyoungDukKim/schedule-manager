import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const ADMIN_APP_NAME = "schedule-manager-api";

export class FirebaseAdminConfigurationError extends Error {}

const getRequiredEnvironmentValue = (name: string) => {
  const value = process.env[name];
  if (!value) throw new FirebaseAdminConfigurationError(`${name} is not configured`);
  return value;
};

// Firebase Admin은 Vercel 서버 환경에서만 초기화하며 클라이언트 설정과 분리합니다.
const getFirebaseAdminApp = () => {
  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  if (existing) return existing;

  const projectId = getRequiredEnvironmentValue("FIREBASE_PROJECT_ID");
  const clientEmail = getRequiredEnvironmentValue("FIREBASE_CLIENT_EMAIL");
  const privateKey = getRequiredEnvironmentValue("FIREBASE_PRIVATE_KEY").replace(
    /\\n/g,
    "\n",
  );

  return initializeApp(
    { credential: cert({ projectId, clientEmail, privateKey }) },
    ADMIN_APP_NAME,
  );
};

export const verifyFirebaseIdToken = async (token: string) =>
  getAuth(getFirebaseAdminApp()).verifyIdToken(token);
