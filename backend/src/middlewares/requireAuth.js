// backend/src/middlewares/requireAuth.js
const jwt = require("jsonwebtoken");

// ✅ Tek bir kaynak: auth.js de bunu kullanacak
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role }
    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
}

function requireRole(roles = []) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ ok: false, error: "Unauthorized" });
    if (roles.length && !roles.includes(role)) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }
    return next();
  };
}

/**
 * ✅ Geriye dönük uyumluluk:
 * admin.js gibi eski kullanım: router.use(requireAuth("admin"))
 * veya router.use(requireAuth(["admin","editor"]))
 * veya router.use(requireAuth()) -> sadece authRequired
 */
function requireAuth(roleOrRoles) {
  const roles = Array.isArray(roleOrRoles)
    ? roleOrRoles
    : roleOrRoles
      ? [roleOrRoles]
      : [];

  return (req, res, next) => {
    authRequired(req, res, (err) => {
      if (err) return; // authRequired zaten response döndü
      if (roles.length) return requireRole(roles)(req, res, next);
      return next();
    });
  };
}

module.exports = { JWT_SECRET, authRequired, requireRole, requireAuth };
