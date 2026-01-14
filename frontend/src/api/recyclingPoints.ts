// frontend/src/api/recyclingPoints.ts
import { apiFetch, type ApiResponse } from "./client";

export type RecyclingPoint = {
  id: number;
  external_id: string | null;
  source: string | null;
  ilce: string | null;
  atik_turu_id: number | null;
  atik_turu_adi: string | null;
  name: string | null;
  category: string | null;
  address: string | null;
  phone: string | null;
  created_at?: string;
  lat: number | null;
  lng: number | null;
};

export type RecyclingFilters = {
  ilceler: string[];
  atikTurleri: string[];
  kategoriler: string[];
};

export async function getRecyclingPoints(): Promise<ApiResponse<RecyclingPoint[]>> {
  // Bu projede filtrelemeyi front-end’de yapıyoruz.
  // (İleride backend query param desteklerse burada params ekleyebiliriz.)
  return apiFetch<RecyclingPoint[]>("/api/recycling-points");
}

export async function getRecyclingFilters(): Promise<ApiResponse<RecyclingFilters>> {
  return apiFetch<RecyclingFilters>("/api/recycling-points/filters");
}
