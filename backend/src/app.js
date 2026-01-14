// backend/src/app.js
const express = require("express");
const path = require("path");

const app = express();

// ---- middlewares ----
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Eğer CORS kullanıyorsan ve frontend ayrı porttaysa aç:
// const cors = require("cors");
// app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// uploads statik
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ---- routes ----
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");
const litterReportsRouter = require("./routes/litterReports");
const recyclingPointsRouter = require("./routes/recyclingPoints");
const changeRequestsRouter = require("./routes/changeRequests");

// ✅ YENİ: waste types (dropdown için)
const wasteTypesRouter = require("./routes/wasteTypes");

// health
app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/litter-reports", litterReportsRouter);
app.use("/api/recycling-points", recyclingPointsRouter);

// ✅ change requests
app.use("/api/change-requests", changeRequestsRouter);

// ✅ waste types endpoint (Citizen dropdown buradan dolacak)
app.use("/api/waste-types", wasteTypesRouter);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Not Found" });
});

module.exports = app;
