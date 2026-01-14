// frontend/src/api/client.ts
export type ApiOk<T> = { ok: true; data: T };
export type ApiFail = { ok: false; error: string };
export type ApiResponse<T> = ApiOk<T> | ApiFail;

export type AuthUser = {
  token: string;
  role: "citizen" | "editor" | "admin";
  email?: string;
};

export type Role = AuthUser["role"];

const AUTH_KEY = "auth_user";

/**
 * Vite proxy kullanıyoruz:
 *  - /api      -> http://localhost:3001/api
 *  - /uploads  -> http://localhost:3001/uploads
 *
 * Bu yüzden frontend her zaman relative "/api/..." çağırmalı.
 */
export function resolveApiUrl(path: string): string {
  if (!path) return "/api";

  // absolute URL ise dokunma
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  // uploads statik ise dokunma
  if (path.startsWith("/uploads")) return path;

  // zaten /api ile geliyorsa dokunma
  if (path.startsWith("/api")) return path;

  // "recycling-points" gibi gelirse -> "/api/recycling-points"
  const clean = path.replace(/^\/+/, "");
  return `/api/${clean}`;
}

/**
 * Backend foto_url alanı bazen "/uploads/..." döndürür.
 * Burada güvenli şekilde URL'e çeviriyoruz.
 */
export function resolveFileUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/uploads")) return path;

  // "uploads/..." gibi gelirse
  const clean = path.replace(/^\/+/, "");
  if (clean.startsWith("uploads/")) return `/${clean}`;

  // başka bir şey geldiyse yine de relative döndür
  return `/${clean}`;
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuthUser(user: AuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function clearAuthUser() {
  localStorage.removeItem(AUTH_KEY);
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { skipAuth?: boolean }
): Promise<ApiResponse<T>> {
  try {
    const url = resolveApiUrl(path);

    // HeadersInit (TS) karmaşası çıkmasın diye Record kullanıyoruz.
    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string> | undefined),
    };

    // JSON gönderiyorsak content-type verelim (FormData ise vermiyoruz)
    const isFormData =
      typeof FormData !== "undefined" && init?.body instanceof FormData;
    if (!isFormData && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    if (!init?.skipAuth) {
      const au = getAuthUser();
      if (au?.token) headers["Authorization"] = `Bearer ${au.token}`;
    }

    const res = await fetch(url, { ...init, headers });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");

    // Hata durumunda backend {ok:false,error:"..."} veya {ok:false,message:"..."} dönebilir
    if (!res.ok) {
      if (isJson) {
        const j = (await res.json().catch(() => null)) as any;
        const err =
          (j && typeof j === "object" && (j.error || j.message)) ||
          `HTTP ${res.status}`;
        return { ok: false, error: String(err) };
      }

      const txt = await res.text().catch(() => "");
      return { ok: false, error: txt || `HTTP ${res.status}` };
    }

    // OK ama JSON değilse
    if (!isJson) {
      const txt = await res.text().catch(() => "");
      // bazı endpointler text dönmez ama yine de güvenli
      return { ok: true, data: txt as unknown as T };
    }

    const json = (await res.json()) as any;

    // Backend standart: { ok:true, data: ... } / { ok:false, error:"..." }
    if (json && typeof json === "object" && json.ok === false) {
      return { ok: false, error: String(json.error || json.message || "Hata") };
    }
    if (json && typeof json === "object" && json.ok === true && "data" in json) {
      return { ok: true, data: json.data as T };
    }

    // Bazı endpointler direkt array/object döndürebilir
    return { ok: true, data: json as T };
  } catch (e: any) {
    return { ok: false, error: e?.message ? String(e.message) : "Fetch hatası." };
  }
}
