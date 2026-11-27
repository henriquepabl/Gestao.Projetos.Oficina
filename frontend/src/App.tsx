import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { CreateAccount, Login } from "./pages/auth/AuthPages";
import { Clientes } from "./pages/Clientes";
import { Veiculos, VeiculoHistorico } from "./pages/Veiculos";
import { Agendamentos } from "./pages/Agendamentos";
import { NovoOrcamento, Orcamentos } from "./pages/Orcamentos";
import { OrdemServico, OrdensServico } from "./pages/OrdensServico";
import { Estoque } from "./pages/Estoque";
import { Relatorios } from "./pages/Relatorios";
import { Usuarios } from "./pages/Usuarios";
import { Perfil } from "./pages/Perfil";
import { authSession, type Role } from "./services/auth";

const EQUIPE: Role[] = ["employee", "admin"];

function ProtectedLayout() {
  const location = useLocation();
  if (!authSession.isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <AppLayout />;
}

/** Esconde a tela de quem não tem o perfil (a API também bloqueia). */
function Exigir({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const usuario = authSession.usuario();
  return usuario && roles.includes(usuario.role) ? children : <Navigate to="/" replace />;
}

function Inicio() {
  return authSession.usuario()?.role === "client" ? <Navigate to="/veiculos" replace /> : <Dashboard />;
}

function App() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/create-account" element={<CreateAccount />} />
    <Route path="/cadastro" element={<Navigate to="/create-account" replace />} />
    <Route element={<ProtectedLayout />}>
      <Route path="/" element={<Inicio />} />
      <Route path="/veiculos" element={<Veiculos />} />
      <Route path="/veiculos/:id" element={<VeiculoHistorico />} />
      <Route path="/agendamentos" element={<Agendamentos />} />
      <Route path="/orcamentos" element={<Orcamentos />} />
      <Route path="/orcamentos/novo" element={<Exigir roles={EQUIPE}><NovoOrcamento /></Exigir>} />
      <Route path="/ordens-servico" element={<OrdensServico />} />
      <Route path="/ordens-servico/:id" element={<OrdemServico />} />
      <Route path="/perfil" element={<Perfil />} />
      <Route path="/clientes" element={<Exigir roles={EQUIPE}><Clientes /></Exigir>} />
      <Route path="/estoque" element={<Exigir roles={EQUIPE}><Estoque /></Exigir>} />
      <Route path="/relatorios" element={<Exigir roles={["admin"]}><Relatorios /></Exigir>} />
      <Route path="/usuarios" element={<Exigir roles={["admin"]}><Usuarios /></Exigir>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter>;
}
export default App;
