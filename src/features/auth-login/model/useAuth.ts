"use client";
// Design Ref: §4.4 — AuthContext 소비 훅
// Plan SC: SC-01, SC-02, SC-03
import { useContext } from "react";
import { AuthContext } from "./AuthContext";

export function useAuth() {
  const { user, isLoading } = useContext(AuthContext);
  return {
    user,
    isAuthenticated: !!user,
    isLoading,
  };
}
