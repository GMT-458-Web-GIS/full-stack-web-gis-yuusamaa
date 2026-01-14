// frontend/src/api/admin.ts
import { apiFetch, type ApiResponse } from "./client";

export type EditorCredentials = {
  email: string;
  password: string;
};

export function getEditorCredentials(): Promise<ApiResponse<EditorCredentials>> {
  return apiFetch<EditorCredentials>("/api/admin/editor-credentials");
}

export function updateEditorCredentials(
  creds: EditorCredentials
): Promise<ApiResponse<EditorCredentials>> {
  return apiFetch<EditorCredentials>("/api/admin/editor-credentials", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });
}
