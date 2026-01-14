import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerCitizen, login } from "../auth/auth";

export default function CitizenRegister() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const res = registerCitizen(email.trim(), password);
      if (!res.ok) {
        setMsg(res.message || "Kayıt başarısız.");
        return;
      }

      const l = login(email.trim(), password);
      if (l.ok) {
        nav("/citizen", { replace: true });
      } else {
        nav("/login/citizen", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ width: 420, border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Citizen Kayıt</h2>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
          <label style={{ fontSize: 13 }}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />

          <label style={{ fontSize: 13 }}>Şifre</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />

          <button disabled={loading} style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd", cursor: "pointer" }}>
            {loading ? "Bekle..." : "Kayıt Ol"}
          </button>
        </form>

        {msg && <div style={{ marginTop: 10, color: "tomato" }}>{msg}</div>}

        <div style={{ marginTop: 12, fontSize: 13 }}>
          Zaten hesabın var mı? <Link to="/login/citizen">Citizen Giriş</Link>
        </div>

        <div style={{ marginTop: 12, fontSize: 13 }}>
          <Link to="/">← Haritaya Dön</Link>
        </div>
      </div>
    </div>
  );
}
