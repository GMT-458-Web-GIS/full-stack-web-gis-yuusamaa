require("dotenv").config();
const bcrypt = require("bcryptjs");
const { pool } = require("../src/db");

async function run() {
  const adminEmail = "admin@ankatemiz.local";
  const editorEmail = "editor@ankatemiz.local";

  const adminPass = "Admin123!";
  const editorPass = "Editor123!";

  const adminHash = await bcrypt.hash(adminPass, 10);
  const editorHash = await bcrypt.hash(editorPass, 10);

  // ✅ name kolonu NOT NULL olduğu için name mutlaka gönderiyoruz
  await pool.query(
    `
    INSERT INTO public.users (name, email, password_hash, role)
    VALUES ($1,$2,$3,'admin')
    ON CONFLICT (email) DO NOTHING;
    `,
    ["Admin", adminEmail, adminHash]
  );

  await pool.query(
    `
    INSERT INTO public.users (name, email, password_hash, role)
    VALUES ($1,$2,$3,'editor')
    ON CONFLICT (email) DO NOTHING;
    `,
    ["Editor", editorEmail, editorHash]
  );

  console.log("Seed tamam ✅");
  console.log("Admin:", adminEmail, adminPass);
  console.log("Editor:", editorEmail, editorPass);
  process.exit(0);
}

run().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});
