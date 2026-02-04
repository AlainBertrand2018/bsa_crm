
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
        const businessDocRef = doc(db, 'businesses', firebaseUser.uid);

        let userData: any = {};
        let businessDetails: any = null;

        const updateState = () => {
          // HARDCODED BYPASS: Ensure 'alain.bertrand.mu@gmail.com' is always Super Admin
          const isHardcodedAdmin = firebaseUser.email === 'alain.bertrand.mu@gmail.com';
          let role = isHardcodedAdmin ? 'Super Admin' : ((userData.role === 'Super Admin' || userData.role === 'Admin') ? userData.role : 'User');

          // Trace data for debugging
          console.log('[Auth Debug] User Data:', {
            id: firebaseUser.uid,
            onboarding_raw: userData.onboarding,
            onboardingCompleted_raw: userData.onboardingCompleted,
            hasBusinessDetails: !!userData.businessDetails,
            businessName: userData.businessDetails?.businessName,
            bizCollName: businessDetails?.businessName
          });

          // A user is considered to have completed onboarding if:
          // 1. They are the Hardcoded Super Admin (Forced bypass)
          // 2. onboardingCompleted flag is true or 'true' or 'True'
          // 3. onboarding string flag is 'True' or 'true' or true
          // 4. onboardingStatus string flag is 'True' or 'true' or true
          // 5. They have businessDetails with a businessName (anywhere)
          const checkFlag = (val: any) => val === true || String(val).toLowerCase() === 'true';

          const onboardingCompleted =
            isHardcodedAdmin ||
            checkFlag(userData.onboardingCompleted) ||
            checkFlag(userData.onboarding) ||
            checkFlag(userData.onboardingStatus) ||
            !!(userData.businessDetails?.businessName || businessDetails?.businessName);

          console.log('[Auth Debug] Final onboardingCompleted:', onboardingCompleted);

          // Prevent access for suspended/locked accounts
          if (!isHardcodedAdmin && userData.status && userData.status !== 'active') {
            const statusLabel = userData.status.charAt(0).toUpperCase() + userData.status.slice(1);
            console.error(`[Auth] Account is ${statusLabel}. Logging out.`);
            auth.signOut();
            setCurrentUser(null);
            setIsLoading(false);
            return;
          }

          setCurrentUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: userData.name || firebaseUser.displayName || 'User',
            role,
            status: userData.status || 'active',
            companyId: userData.companyId,
            onboardingCompleted,
            businessName: userData.businessName || businessDetails?.businessName || userData.businessDetails?.businessName,
            businessDetails: businessDetails || userData.businessDetails,
            products: userData.products,
          });
          setIsLoading(false);
        };

        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          userData = docSnap.exists() ? docSnap.data() as any : {};
          console.log('[Auth Debug] Received User Doc:', userData);
          updateState();
        }, (error) => {
          console.error("[Auth] Firestore listener error:", error);
          setIsLoading(false);
        });

        const unsubscribeBusiness = onSnapshot(businessDocRef, (bizSnap) => {
          if (bizSnap.exists()) {
            businessDetails = bizSnap.data();
            updateState();
          }
        });

        return () => {
          unsubscribeDoc();
          unsubscribeBusiness();
        };
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

    // Throttle resetIdleTimer to avoid excessive calls during mousemove
    let lastReset = 0;
    const throttledReset = () => {
      const now = Date.now();
      if (now - lastReset > 1000) { // Only reset once per second
        resetIdleTimer();
        lastReset = now;
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, throttledReset, true);
    });

    resetIdleTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      activityEvents.forEach(event => {
        document.removeEventListener(event, throttledReset, true);
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

        // Fallback for businessDetails
        let businessDetails = userData.businessDetails;
        if (!businessDetails && firebaseUser.uid) {
          const businessDoc = await getDoc(doc(db, 'businesses', firebaseUser.uid));
          if (businessDoc.exists()) {
            businessDetails = businessDoc.data();
          }
        }

        setCurrentUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: userData.name || firebaseUser.displayName || 'User',
          role,
          companyId: userData.companyId,
          onboardingCompleted: userData.onboardingCompleted === true,
          businessName: userData.businessName || businessDetails?.businessName,
          businessDetails: businessDetails,
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

  const value = React.useMemo(() => ({
    currentUser,
    isLoading,
    login,
    logout,
    refreshUser,
  }), [currentUser, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
