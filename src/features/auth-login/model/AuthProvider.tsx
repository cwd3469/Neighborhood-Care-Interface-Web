"use client";
// Design Ref: §4.3 — mount 시 /api/auth/me 호출, Context 공급
// Plan SC: SC-01, SC-02, SC-03
import { useState, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import type { AuthUser } from "./AuthContext";

interface Props {
  children: React.ReactNode;
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AuthUser | null) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
