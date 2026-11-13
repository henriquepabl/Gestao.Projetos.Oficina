import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { EmConstrucao } from "./pages/EmConstrucao";
import { CreateAccount, Login } from "./pages/auth/AuthPages";
import { authSession } from "./services/auth";

function ProtectedLayout() {
  const location = useLocation();
  if (!authSession.isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <AppLayout />;
}

function App() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/create-account" element={<CreateAccount />} />
    <Route path="/cadastro" element={<Navigate to="/create-account" replace />} />
    <Route element={<ProtectedLayout />}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/clientes" element={<EmConstrucao titulo="Clientes" />} />
      <Route path="/agendamentos" element={<EmConstrucao titulo="Agendamentos" />} />
      <Route path="/ordens-servico" element={<EmConstrucao titulo="Ordens de serviço" />} />
      <Route path="/estoque" element={<EmConstrucao titulo="Estoque" />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter>;
}
export default App;
