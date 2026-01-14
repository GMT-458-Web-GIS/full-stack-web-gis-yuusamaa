// frontend/src/auth/RequireRole.tsx
import { Navigate } from "react-router-dom";
import { getSession, type Role } from "./auth";

export function RequireRole({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const session = getSession();

  if (!session?.role) return <Navigate to="/auth" replace />;

  if (!allow.includes(session.role)) {
    return <Navigate to={`/${session.role}`} replace />;
  }

  return <>{children}</>;
}
