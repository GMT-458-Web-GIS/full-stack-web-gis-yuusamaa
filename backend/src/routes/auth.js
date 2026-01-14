// backend/src/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { pool } = require("../db");
const { getEditorCredentials } = require("../credentialsStore");

// ✅ tek kaynak: middleware ile aynı secret
const { JWT_SECRET } = require("../middlewares/requireAuth");

const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// Admin için hem .local hem .com kabul edelim
const ADMIN_EMAILS = new Set([
  "admin@ankatemiz.local",
  "admin@ankatemiz.com",
]);

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * DB'de email varsa id döndürür; yoksa kullanıcı oluşturur.
 */
async function ensureUserExists(email, role) {
  const lowerEmail = String(email || "").trim().toLowerCase();
  if (!lowerEmail) throw new Error("Email boş.");

  const existing = await pool.query(
    `SELECT id, email, role FROM public.users WHERE lower(email) = $1 LIMIT 1`,
    [lowerEmail]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const inserted = await pool.query(
    `INSERT INTO public.users (email, password_hash, role)
     VALUES ($1, NULL, $2::user_role)
     RETURNING id, email, role`,
    [lowerEmail, role]
  );

  return inserted.rows[0];
}

/**
 * POST /api/auth/register
 * Citizen kayıt
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const lowerEmail = String(email || "").trim().toLowerCase();

    if (!lowerEmail || !password) {
      return res.status(400).json({ ok: false, error: "Email ve şifre zorunlu." });
    }

    const exists = await pool.query(
      "SELECT id FROM public.users WHERE lower(email) = $1 LIMIT 1",
      [lowerEmail]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ ok: false, error: "Bu email zaten kayıtlı." });
    }

    const hash = await bcrypt.hash(password, 10);
    const inserted = await pool.query(
      `INSERT INTO public.users (email, password_hash, role)
       VALUES ($1, $2, 'citizen'::user_role)
       RETURNING id, email, role`,
      [lowerEmail, hash]
    );

    const user = inserted.rows[0];
    const token = signToken({ id: user.id, role: user.role, email: user.email });

    return res.json({
      ok: true,
      data: { token, role: user.role, email: user.email },
    });
  } catch (err) {
    console.error("REGISTER error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

/**
 * POST /api/auth/login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const lowerEmail = String(email || "").trim().toLowerCase();
    const pass = String(password || "");

    if (!lowerEmail || !pass) {
      return res.status(400).json({ ok: false, error: "Email ve şifre zorunlu." });
    }

    // ✅ ADMIN (DEV)
    if (ADMIN_EMAILS.has(lowerEmail)) {
      if (pass !== ADMIN_PASSWORD) {
        return res.status(401).json({ ok: false, error: "Admin şifresi yanlış." });
      }

      const adminUser = await ensureUserExists(lowerEmail, "admin");

      const token = signToken({
        id: adminUser.id,
        role: "admin",
        email: adminUser.email,
      });

      return res.json({
        ok: true,
        data: { token, role: "admin", email: adminUser.email },
      });
    }

    // ✅ EDITOR (DEV - credentialsStore)
    const editorCreds = getEditorCredentials(); // { email, password }
    if (
      editorCreds?.email &&
      editorCreds?.password &&
      lowerEmail === String(editorCreds.email).trim().toLowerCase()
    ) {
      if (pass !== String(editorCreds.password)) {
        return res.status(401).json({ ok: false, error: "Editör şifresi yanlış." });
      }

      const editorUser = await ensureUserExists(lowerEmail, "editor");

      const token = signToken({
        id: editorUser.id,
        role: "editor",
        email: editorUser.email,
      });

      return res.json({
        ok: true,
        data: { token, role: "editor", email: editorUser.email },
      });
    }

    // ✅ CITIZEN (DB)
    const userRes = await pool.query(
      `SELECT id, email, role, password_hash
       FROM public.users
       WHERE lower(email) = $1
       LIMIT 1`,
      [lowerEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ ok: false, error: "Kullanıcı bulunamadı." });
    }

    const user = userRes.rows[0];

    if (user.role !== "citizen") {
      return res.status(401).json({
        ok: false,
        error: "Bu kullanıcı için giriş yöntemi geçersiz. (role mismatch)",
      });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        ok: false,
        error: "Bu kullanıcı için şifre kaydı yok. Tekrar kayıt olun.",
      });
    }

    const match = await bcrypt.compare(pass, user.password_hash);
    if (!match) {
      return res.status(401).json({ ok: false, error: "Şifre yanlış." });
    }

    const token = signToken({ id: user.id, role: user.role, email: user.email });
    return res.json({
      ok: true,
      data: { token, role: user.role, email: user.email },
    });
  } catch (err) {
    console.error("LOGIN error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
