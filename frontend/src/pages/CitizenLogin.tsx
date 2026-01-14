import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSession, login } from "../auth/auth";

export default function CitizenLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (s?.role) nav(`/${s.role}`, { replace: true });
  }, [nav]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const res = login(email.trim(), password);
      if (!res.ok) {
        setMsg(res.message || "Giriş başarısız.");
        return;
      }

      // Citizen sayfasına
      nav("/citizen", { replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ width: 420, border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Citizen Giriş</h2>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
          <label style={{ fontSize: 13 }}>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
          />

          <label style={{ fontSize: 13 }}>Şifre</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
          />

          <button
            disabled={loading}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd", cursor: "pointer" }}
          >
            {loading ? "Bekle..." : "Giriş Yap"}
          </button>
        </form>

        {msg && <div style={{ marginTop: 10, color: "tomato" }}>{msg}</div>}

        <div style={{ marginTop: 12, fontSize: 13 }}>
          Kayıtlı değil misin? <Link to="/register">Citizen Kayıt</Link>
        </div>

        <div style={{ marginTop: 12, fontSize: 13 }}>
          <Link to="/">← Haritaya Dön</Link>
        </div>
      </div>
    </div>
  );
}
