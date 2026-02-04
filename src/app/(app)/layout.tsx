
"use client";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { FullPageLoading } from "@/components/shared/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const { currentUser, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Listen for idle logout events
  useEffect(() => {
    const handleIdleLogout = () => {
      toast({
        title: "Session Expired",
        description: "You have been logged out due to inactivity.",
        variant: "destructive",
      });
    };

    window.addEventListener('idle-logout', handleIdleLogout);
    return () => {
      window.removeEventListener('idle-logout', handleIdleLogout);
    };
  }, [toast]);

  useEffect(() => {
    if (isMounted && !authIsLoading) {
      if (!currentUser) {
        router.replace('/login');
      } else {
        // Only users with onboardingCompleted=true can skip onboarding
        // Default: Super Admin and Admin have onboardingCompleted=true, regular Users have it false
        const needsOnboarding = !currentUser.onboardingCompleted;

        /*
        console.log('[Layout Debug] Check:', {
          email: currentUser.email,
          role: currentUser.role,
          onboardingCompleted: currentUser.onboardingCompleted,
          needsOnboarding,
          pathname
        });
        */

        if (needsOnboarding && pathname !== '/onboarding' && pathname !== '/fix-admin' && pathname !== '/debug-auth') {
          console.warn('[Layout Debug] Redirecting to /onboarding');
          router.replace('/onboarding');
        } else if (!needsOnboarding && pathname === '/onboarding') {
          router.replace('/dashboard');
        }
      }
    }
  }, [isMounted, authIsLoading, currentUser, router, pathname]);

  if (!isMounted || authIsLoading) {
    return <FullPageLoading message="Authenticating..." />;
  }

  if (!currentUser) {
    return <FullPageLoading message="Redirecting to login..." />;
  }

  // If we are on onboarding, show a simpler layout without sidebar/header
  if (pathname === '/onboarding') {
    return (
      <main className="min-h-screen">
        {children}
      </main>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
