import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/clientes", label: "Clientes" },
  { to: "/agendamentos", label: "Agendamentos" },
  { to: "/ordens-servico", label: "Ordens de serviço" },
  { to: "/estoque", label: "Estoque" },
];

export function Sidebar() {
  return (
    <aside className="flex min-h-screen w-64 flex-col bg-slate-900 p-5 text-white">
      <h1 className="mb-10 text-2xl font-bold text-blue-400">
        Oficina+
      </h1>

      <nav className="space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `block rounded-lg px-4 py-3 transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}