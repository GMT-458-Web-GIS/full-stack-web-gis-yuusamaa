// frontend/src/auth/ProtectedRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { hasRole, useAuth } from "./AuthContext";
import type { UserRole } from "../api/auth";

export default function ProtectedRoute({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const { isAuthed, user } = useAuth();

  if (!isAuthed) return <Navigate to="/" replace />;
  if (!hasRole(user, roles)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
