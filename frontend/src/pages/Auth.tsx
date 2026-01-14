// frontend/src/pages/Auth.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type Mode = "login" | "register";

export default function Auth() {
  const nav = useNavigate();
  const { login, registerCitizen } = useAuth();

  const [mode, setMode] = useState<Mode>("login");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form (citizen)
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const res = await login(loginEmail, loginPassword);

    setLoading(false);
    if (!res.ok || !res.user) {
      setErr(res.message || "Giriş başarısız.");
      return;
    }

    if (res.user.role === "admin") nav("/admin", { replace: true });
    else if (res.user.role === "editor") nav("/editor", { replace: true });
    else nav("/citizen", { replace: true }); // ✅ citizen panel
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const res = await registerCitizen(regEmail, regPassword);

    setLoading(false);
    if (!res.ok || !res.user) {
      setErr(res.message || "Kayıt başarısız.");
      return;
    }

    // ✅ kayıt sonrası citizen panel
    nav("/citizen", { replace: true });
  }

  return (
    <div style={{ maxWidth: 920, margin: "24px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 10 }}>Giriş / Kayıt</h2>

      {/* Üst sekmeler (tasarım bozulmasın diye basit) */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setMode("login")}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: mode === "login" ? "#111" : "#fff",
            color: mode === "login" ? "#fff" : "#111",
            cursor: "pointer",
            fontWeight: 700,
            flex: 1,
          }}
        >
          Giriş
        </button>
        <button
          onClick={() => setMode("register")}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: mode === "register" ? "#111" : "#fff",
            color: mode === "register" ? "#fff" : "#111",
            cursor: "pointer",
            fontWeight: 700,
            flex: 1,
          }}
        >
          Citizen Kayıt
        </button>
      </div>

      {err && (
        <div style={{ marginBottom: 12, color: "#b00020", fontWeight: 700 }}>
          {err}
        </div>
      )}

      {/* ✅ İstediğin layout: panel ikiye bölünmüş */}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 14,
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: 260,
        }}
      >
        {/* SOL: Login */}
        <div style={{ padding: 16, background: mode === "login" ? "#fff" : "#fafafa" }}>
          <h3 style={{ marginTop: 0 }}>Giriş</h3>

          <form onSubmit={onLogin} style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>E-posta</span>
              <input
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="ornek@mail.com"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Şifre</span>
              <input
                value={loginPassword}
                type="password"
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
            </label>

            <button
              disabled={loading}
              type="submit"
              style={{
                marginTop: 6,
                padding: "10px 12px",
                cursor: loading ? "not-allowed" : "pointer",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fff",
                fontWeight: 800,
              }}
            >
              {loading ? "Bekle..." : "Giriş Yap"}
            </button>
          </form>
        </div>

        {/* SAĞ: Citizen Register */}
        <div style={{ padding: 16, background: mode === "register" ? "#fff" : "#fafafa" }}>
          <h3 style={{ marginTop: 0 }}>Citizen Kayıt</h3>

          <form onSubmit={onRegister} style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>E-posta</span>
              <input
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="ornek@mail.com"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Şifre</span>
              <input
                value={regPassword}
                type="password"
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              />
            </label>

            <button
              disabled={loading}
              type="submit"
              style={{
                marginTop: 6,
                padding: "10px 12px",
                cursor: loading ? "not-allowed" : "pointer",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fff",
                fontWeight: 800,
              }}
            >
              {loading ? "Bekle..." : "Kayıt Ol"}
            </button>
          </form>

          <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
            Editor/Admin hesabı kayıt ile açılmaz; admin belirler.
          </div>
        </div>
      </div>
    </div>
  );
}
