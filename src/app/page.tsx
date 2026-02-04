"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, FileText, Bot, LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { APP_NAME } from "@/lib/constants";
import { LoginModal } from "@/components/auth/LoginModal";

export default function HomePage() {
  const { currentUser, isLoading, logout } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
      {/* Logout button in top-right if logged in */}
      {currentUser && (
        <div className="absolute top-4 right-4">
          <Button
            variant="outline"
            onClick={logout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout ({currentUser.name})
          </Button>
        </div>
      )}

      <header className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-20 w-20 text-primary"
            aria-label={`${APP_NAME} Logo`}
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
        </div>
        <h1 className="text-5xl font-bold text-primary font-headline">{APP_NAME}</h1>
        <p className="text-xl text-foreground/80 mt-2">
          Your Intelligent Solution for Client Management & Invoicing
        </p>
      </header>

      <main className="grid md:grid-cols-3 gap-8 max-w-4xl w-full mb-12">
        <FeatureCard
          icon={<FileText className="w-12 h-12 text-accent" />}
          title="Effortless Quotations"
          description="Generate professional quotations for various product types with automated calculations."
        />
        <FeatureCard
          icon={<Rocket className="w-12 h-12 text-accent" />}
          title="Seamless Invoicing"
          description="Automatically create invoices when quotations are won, streamlining your workflow."
        />
        <FeatureCard
          icon={<Bot className="w-12 h-12 text-accent" />}
          title="AI-Powered Suggestions"
          description="Get intelligent product configuration recommendations based on client needs and budget."
        />
      </main>

      <div className="flex flex-col items-center">
        <Button
          size="lg"
          onClick={() => setIsLoginModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 h-14 rounded-xl shadow-lg transition-all hover:scale-105 hover:shadow-primary/20"
        >
          Go to Dashboard
          <LogIn className="ml-2 h-5 w-5" />
        </Button>
        <LoginModal
          isOpen={isLoginModalOpen}
          onOpenChange={setIsLoginModalOpen}
        />
      </div>


      <footer className="mt-16 text-center text-foreground/60">
        <p>&copy; 2026 Business Studio AI (BSA) - Alain BERTRAND All rights reserved.</p>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = React.memo(({ icon, title, description }: FeatureCardProps) => {
  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-shadow duration-300">
      <CardHeader className="items-center">
        {icon}
        <CardTitle className="text-2xl font-headline text-primary mt-2">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-center text-foreground/70">{description}</CardDescription>
      </CardContent>
    </Card>
  );
});

FeatureCard.displayName = "FeatureCard";
