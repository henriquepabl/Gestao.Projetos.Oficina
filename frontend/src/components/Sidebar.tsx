import { NavLink, useNavigate } from "react-router-dom";
import { authSession, type Role } from "../services/auth";
import { rotulo } from "../lib/util";

const EQUIPE: Role[] = ["employee", "admin"];

const links: { to: string; label: string; clienteLabel?: string; roles: Role[] }[] = [
  { to: "/", label: "Dashboard", roles: EQUIPE },
  { to: "/clientes", label: "Clientes", roles: EQUIPE },
  { to: "/veiculos", label: "Veículos", clienteLabel: "Meus veículos", roles: ["client", ...EQUIPE] },
  { to: "/agendamentos", label: "Agendamentos", clienteLabel: "Meus agendamentos", roles: ["client", ...EQUIPE] },
  { to: "/orcamentos", label: "Orçamentos", roles: ["client", ...EQUIPE] },
  { to: "/ordens-servico", label: "Ordens de serviço", clienteLabel: "Meus serviços", roles: ["client", ...EQUIPE] },
  { to: "/estoque", label: "Estoque", roles: EQUIPE },
  { to: "/relatorios", label: "Relatórios", roles: ["admin"] },
  { to: "/usuarios", label: "Usuários", roles: ["admin"] },
  { to: "/perfil", label: "Meu perfil", roles: ["client", ...EQUIPE] },
];

export function Sidebar() {
  const navigate = useNavigate();
  const usuario = authSession.usuario();
  function logout() { authSession.end(); navigate("/login", { replace: true }); }
  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col bg-slate-900 p-5 text-white">
      <h1 className="mb-2 text-2xl font-bold text-blue-400">
        Oficina+
      </h1>
      {usuario && <p className="mb-8 text-sm text-slate-400">{usuario.nome} · {rotulo(usuario.role)}</p>}

      <nav className="space-y-1">
        {links.filter((link) => usuario && link.roles.includes(usuario.role)).map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `block rounded-lg px-4 py-2.5 transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            {usuario?.role === "client" ? (link.clienteLabel ?? link.label) : link.label}
          </NavLink>
        ))}
      </nav>

      <button type="button" onClick={logout} className="mt-auto rounded-lg px-4 py-3 text-left text-slate-300 transition hover:bg-slate-800 hover:text-white">Sair da conta</button>
    </aside>
  );
}
