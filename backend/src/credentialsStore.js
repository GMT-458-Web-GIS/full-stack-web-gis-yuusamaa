// backend/src/credentialsStore.js
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const EDITOR_FILE = path.join(DATA_DIR, "editor-credentials.json");

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(EDITOR_FILE)) {
    fs.writeFileSync(
      EDITOR_FILE,
      JSON.stringify(
        {
          email: "editor@ankatemiz.com",
          password: "Editor123!",
        },
        null,
        2
      ),
      "utf-8"
    );
  }
}

function getEditorCredentials() {
  ensure();
  return JSON.parse(fs.readFileSync(EDITOR_FILE, "utf-8"));
}

function setEditorCredentials(next) {
  ensure();
  fs.writeFileSync(EDITOR_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

module.exports = { getEditorCredentials, setEditorCredentials };
