
"use client";

import type { User, AuthContextType } from '@/lib/types';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 1. Firebase Auth Listener
    const unsubscribeFirebase = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        console.log('[Auth] Firebase user detected:', firebaseUser.uid);

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap: DocumentSnapshot) => {
          const userData = docSnap.exists() ? docSnap.data() as any : {};

          // HARDCODED BYPASS: Ensure 'alain.bertrand.mu@gmail.com' is always Super Admin
          const isHardcodedAdmin = firebaseUser.email === 'alain.bertrand.mu@gmail.com';
          let role = isHardcodedAdmin ? 'Super Admin' : ((userData.role === 'Super Admin' || userData.role === 'Admin') ? userData.role : 'User');

          /*
          console.log('[AuthContext Debug]', {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            userDataRole: userData.role,
            resolvedRole: role,
            onboardingCompletedDB: userData.onboardingCompleted,
            finalOnboardingCompleted: (role === 'Super Admin' || role === 'Admin') ? true : userData.onboardingCompleted === true,
          });
          */

          setCurrentUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: userData.name || firebaseUser.displayName || 'User',
            role,
            companyId: userData.companyId,
            onboardingCompleted: (role === 'Super Admin' || role === 'Admin') ? true : userData.onboardingCompleted === true,
            businessName: userData.businessName,
            businessDetails: userData.businessDetails,
            products: userData.products,
          });

          setIsLoading(false);
        }, (error) => {
          console.error("[Auth] Firestore listener error:", error);
          setIsLoading(false);
        });
        return () => unsubscribeDoc();
      } else {
        setCurrentUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeFirebase();
    };
  }, []);

  // Auto-logout after 10 minutes of inactivity
  useEffect(() => {
    if (!currentUser) return;

    const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
    let idleTimer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);

      idleTimer = setTimeout(() => {
        console.log('[Auth] Auto-logout due to inactivity');
        logout();
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('idle-logout');
          window.dispatchEvent(event);
        }
      }, IDLE_TIMEOUT);
    };

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    activityEvents.forEach(event => {
      document.addEventListener(event, resetIdleTimer, true);
    });

    resetIdleTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetIdleTimer, true);
      });
    };
  }, [currentUser]);

  const login = async (email: string, password_provided: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password_provided);
      // Listener will handle setting currentUser
      return { success: true };
    } catch (error: any) {
      console.error("Firebase Login failed:", error);
      setIsLoading(false);

      let errorMessage = "Invalid email or password. Please try again.";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password.";
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password. Please check your credentials.";
      }
      return { success: false, error: errorMessage };
    }
  };

  const refreshUser = async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const userData = userDoc.exists() ? userDoc.data() as any : {};
        const isHardcodedAdmin = firebaseUser.email === 'alain.bertrand.mu@gmail.com';
        const role = isHardcodedAdmin ? 'Super Admin' : ((userData.role === 'Super Admin' || userData.role === 'Admin') ? userData.role : 'User');

        setCurrentUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: userData.name || firebaseUser.displayName || 'User',
          role,
          companyId: userData.companyId,
          onboardingCompleted: (role === 'Super Admin' || role === 'Admin') ? true : userData.onboardingCompleted === true,
          businessName: userData.businessName,
          businessDetails: userData.businessDetails,
          products: userData.products,
        });
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      router.push('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const value = {
    currentUser,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
