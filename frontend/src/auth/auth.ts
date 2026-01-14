// frontend/src/auth/auth.ts

export type Role = "citizen" | "editor" | "admin";

type Session = { role: Role; email: string };

type CitizenUser = { email: string; password: string };

const SESSION_KEY = "anka_session";
const CITIZEN_USERS_KEY = "anka_citizen_users";

// ✅ Sabit (demo) editor/admin hesapları — sonra env/config yaparız
const EDITOR_EMAIL = "editor@ankatemiz.com";
const EDITOR_PASSWORD = "editor123";

const ADMIN_EMAIL = "admin@ankatemiz.com";
const ADMIN_PASSWORD = "admin123";

export function getFixedCredentialsInfo() {
  return {
    editorEmail: EDITOR_EMAIL,
    editorPassword: EDITOR_PASSWORD,
    adminEmail: ADMIN_EMAIL,
    adminPassword: ADMIN_PASSWORD,
  };
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function setSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

function getCitizenUsers(): CitizenUser[] {
  const raw = localStorage.getItem(CITIZEN_USERS_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as CitizenUser[]) : [];
  } catch {
    return [];
  }
}

function setCitizenUsers(users: CitizenUser[]) {
  localStorage.setItem(CITIZEN_USERS_KEY, JSON.stringify(users));
}

export function registerCitizen(email: string, password: string): { ok: boolean; message?: string } {
  if (!email || !password) return { ok: false, message: "Email ve şifre zorunlu." };
  if (!email.includes("@")) return { ok: false, message: "Geçerli bir email gir." };
  if (password.length < 4) return { ok: false, message: "Şifre en az 4 karakter olsun." };

  // editor/admin email ile kayıt olmasın
  if (email === EDITOR_EMAIL || email === ADMIN_EMAIL) {
    return { ok: false, message: "Bu email ile kayıt yapılamaz." };
  }

  const users = getCitizenUsers();
  const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) return { ok: false, message: "Bu email zaten kayıtlı." };

  users.push({ email, password });
  setCitizenUsers(users);
  return { ok: true };
}

export function login(
  email: string,
  password: string
): { ok: boolean; message?: string; role?: Role } {
  if (!email || !password) return { ok: false, message: "Email ve şifre zorunlu." };

  // admin
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    setSession({ role: "admin", email });
    return { ok: true, role: "admin" };
  }

  // editor
  if (email === EDITOR_EMAIL && password === EDITOR_PASSWORD) {
    setSession({ role: "editor", email });
    return { ok: true, role: "editor" };
  }

  // citizen
  const users = getCitizenUsers();
  const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!u) return { ok: false, message: "Kullanıcı bulunamadı. (Citizen kayıt olmalı)" };
  if (u.password !== password) return { ok: false, message: "Şifre hatalı." };

  setSession({ role: "citizen", email: u.email });
  return { ok: true, role: "citizen" };
}
