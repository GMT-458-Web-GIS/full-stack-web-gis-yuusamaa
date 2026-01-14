// frontend/src/api/auth.ts
import { apiFetch, type ApiResponse } from "./client";
import type { AuthUser } from "./client";

export type UserRole = "citizen" | "editor" | "admin";

export async function login(body: {
  email: string;
  password: string;
}): Promise<ApiResponse<AuthUser>> {
  return apiFetch<AuthUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Citizen register (backend /api/auth/register citizen açıyor)
export async function registerCitizen(body: {
  email: string;
  password: string;
}): Promise<ApiResponse<AuthUser>> {
  return apiFetch<AuthUser>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
