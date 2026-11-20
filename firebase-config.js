// Firebase Web app configuration. These values identify your Firebase project;
// authorization is enforced by Firestore Security Rules, not by hiding this file.
// Copy the web app values from Firebase Console > Project settings > Your apps.
export const firebaseConfig = {
  apiKey: "AIzaSyDwND02_G0ovfD4QSY402DiMKuAoHSQa_U",
  authDomain: "personal-planner-893b0.firebaseapp.com",
  projectId: "personal-planner-893b0",
  storageBucket: "personal-planner-893b0.firebasestorage.app",
  messagingSenderId: "326896750364",
  appId: "1:326896750364:web:9f98ea70df7bc8f4cdb4d9",
  measurementId: "G-0P8Y5N0DZN",
};

export const isFirebaseConfigured =
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) &&
  !Object.values(firebaseConfig).some((value) => value.includes("YOUR_"));
