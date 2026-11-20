import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Trajets from "./pages/Trajets";
import MesReservations from "./pages/MesReservations";
import Chauffeur from "./pages/Chauffeur";
import Admin from "./pages/Admin";
import RequireAuth from "./components/RequireAuth";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/trajets"
          element={<RequireAuth><Trajets /></RequireAuth>}
        />
        <Route
          path="/mes-reservations"
          element={<RequireAuth><MesReservations /></RequireAuth>}
        />
        <Route
          path="/chauffeur"
          element={
            <RequireAuth roles={["chauffeur", "admin"]}>
              <Chauffeur />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth roles={["admin"]}>
              <Admin />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}