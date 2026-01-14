// frontend/src/api/litterReports.ts
import { apiFetch, type ApiResponse } from "./client";

export type ReportStatus = "pending" | "approved" | "rejected";

export type LitterReport = {
  id: number;
  title: string;
  description: string | null;
  status: ReportStatus;
  address_text: string | null;
  photo_url: string | null;

  // waste type (backend join ile dönebilir)
  atik_turu_id?: number | null;
  atik_turu_adi?: string | null;
  atik_turu_code?: string | null;

  created_by?: number;
  created_at?: string;
  updated_at?: string;

  approved_by?: number | null;
  approved_at?: string | null;

  rejected_by?: number | null;
  rejected_at?: string | null;

  rejection_reason?: string | null;

  lat: number | null;
  lon: number | null;
};

export async function getLitterReports(params?: {
  status?: ReportStatus;
}): Promise<ApiResponse<LitterReport[]>> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  const url = `/api/litter-reports${qs.toString() ? `?${qs}` : ""}`;
  return apiFetch<LitterReport[]>(url);
}

export async function getAllLitterReports(): Promise<ApiResponse<LitterReport[]>> {
  return getLitterReports();
}

export async function getMyLitterReports(): Promise<ApiResponse<LitterReport[]>> {
  return apiFetch<LitterReport[]>("/api/litter-reports/mine");
}

export async function createLitterReport(body: FormData): Promise<ApiResponse<any>> {
  return apiFetch<any>("/api/litter-reports", {
    method: "POST",
    body,
  });
}

export async function approveLitterReport(id: number): Promise<ApiResponse<any>> {
  return apiFetch(`/api/litter-reports/${id}/approve`, { method: "PATCH" });
}

export async function rejectLitterReport(
  id: number,
  reason?: string
): Promise<ApiResponse<any>> {
  return apiFetch(`/api/litter-reports/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason: reason || "" }),
  });
}

// Editor/Admin: konumu güncelle
export async function updateLitterReportLocation(
  id: number,
  lat: number | null,
  lon: number | null
): Promise<ApiResponse<LitterReport>> {
  return apiFetch<LitterReport>(`/api/litter-reports/${id}/location`, {
    method: "PATCH",
    body: JSON.stringify({ lat, lon }),
  });
}
