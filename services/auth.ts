import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, User, signOut } from "firebase/auth";
import { firebaseApp } from "./firebase";

const auth = getAuth(firebaseApp);

export const listenToAuthChanges = (callback: (user: User | null) => void) => onAuthStateChanged(auth, callback);

export const signInWithEmail = async (email: string, password: string) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const registerWithEmail = async (email: string, password: string, displayName?: string) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }

  return credential.user;
};

export const updateDisplayName = async (displayName: string) => {
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName });
    return auth.currentUser;
  }
  throw new Error("No authenticated user to update");
};

export const signOutUser = () => signOut(auth);

export const getCurrentUser = () => auth.currentUser;
