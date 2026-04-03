"use client";

import { useState } from "react";
import { AuthModal } from "@/components/auth-modal";
import { DemoTypewriter } from "@/components/demo-typewriter";
import { useAuth } from "@/components/auth-provider";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  if (loading) return <>{children}</>;

  if (!user) {
    return (
      <>
        <DemoTypewriter onSignup={() => setAuthOpen(true)} />
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  return <>{children}</>;
}
