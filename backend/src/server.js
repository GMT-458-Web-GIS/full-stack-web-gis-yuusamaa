// backend/src/server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const authRouter = require("./routes/auth");
const litterReportsRouter = require("./routes/litterReports");
const adminRouter = require("./routes/admin");

const recyclingPointsRouter = require("./routes/recyclingPoints");
const changeRequestsRouter = require("./routes/changeRequests");

// ✅ YENİ: waste types
const wasteTypesRouter = require("./routes/wasteTypes");

const app = express();

// CORS (dev)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// uploads statik servis: http://127.0.0.1:3001/uploads/xxx.jpg
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
app.use("/uploads", express.static(UPLOADS_DIR));

// health
app.get("/health", (req, res) => res.json({ ok: true }));

// routes
app.use("/api/auth", authRouter);
app.use("/api/litter-reports", litterReportsRouter);
app.use("/api/admin", adminRouter);

// Harita endpointi
app.use("/api/recycling-points", recyclingPointsRouter);

// Editör değişiklik talepleri
app.use("/api/change-requests", changeRequestsRouter);

// ✅ Waste types endpointi (Citizen dropdown buradan dolacak)
app.use("/api/waste-types", wasteTypesRouter);

// 404 fallback (JSON dönsün ki frontend HTML basmasın)
app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Not Found" });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
