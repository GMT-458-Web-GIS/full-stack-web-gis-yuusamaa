import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSession, login, getFixedCredentialsInfo } from "../auth/auth";

export default function AdminLogin() {
  const nav = useNavigate();
  const fixed = getFixedCredentialsInfo();

  const [email, setEmail] = useState(fixed.adminEmail);
  const [password, setPassword] = useState(fixed.adminPassword);
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
      nav("/admin", { replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ width: 420, border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Admin Giriş</h2>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
          <label style={{ fontSize: 13 }}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />

          <label style={{ fontSize: 13 }}>Şifre</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />

          <button disabled={loading} style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd", cursor: "pointer" }}>
            {loading ? "Bekle..." : "Giriş Yap"}
          </button>
        </form>

        {msg && <div style={{ marginTop: 10, color: "tomato" }}>{msg}</div>}

        <div style={{ marginTop: 12, fontSize: 13 }}>
          <Link to="/">← Haritaya Dön</Link>
        </div>
      </div>
    </div>
  );
}
