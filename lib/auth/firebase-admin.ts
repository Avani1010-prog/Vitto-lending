import * as admin from "firebase-admin";

const adminObj = admin as any;

function getFirebaseAdminApp() {
  const apps = adminObj.apps || adminObj.default?.apps || [];
  if (apps && apps.length > 0) {
    return apps[0];
  }

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined;

    const initialize = adminObj.initializeApp || adminObj.default?.initializeApp;
    const credentialCert = adminObj.credential?.cert || adminObj.default?.credential?.cert;

    if (typeof initialize !== "function") {
      return null;
    }

    if (serviceAccountJson) {
      const parsed = JSON.parse(serviceAccountJson);
      return initialize({
        credential: credentialCert ? credentialCert(parsed) : undefined,
      });
    } else if (projectId && clientEmail && privateKey) {
      return initialize({
        credential: credentialCert
          ? credentialCert({
              projectId,
              clientEmail,
              privateKey,
            })
          : undefined,
      });
    } else if (projectId) {
      return initialize({
        projectId,
      });
    } else {
      return initialize();
    }
  } catch (error) {
    return null;
  }
}

export function getAdminAuth() {
  getFirebaseAdminApp();
  const authFn = adminObj.auth || adminObj.default?.auth;
  if (typeof authFn === "function") {
    try {
      return authFn();
    } catch {
      return null;
    }
  }
  return null;
}

export default admin;
