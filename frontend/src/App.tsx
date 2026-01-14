import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Citizen from "./pages/Citizen";
import Editor from "./pages/Editor";
import Admin from "./pages/Admin";

import ProtectedRoute from "./auth/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={<Auth />} />

      <Route
        path="/citizen"
        element={
          <ProtectedRoute roles={["citizen", "admin"]}>
            <Citizen />
          </ProtectedRoute>
        }
      />

      <Route
        path="/editor"
        element={
          <ProtectedRoute roles={["editor", "admin"]}>
            <Editor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <Admin />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
