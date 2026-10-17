export function Dashboard() {
  const indicadores = [
    { titulo: "Agendamentos hoje", valor: "8" },
    { titulo: "Ordens em andamento", valor: "12" },
    { titulo: "Orçamentos pendentes", valor: "5" },
    { titulo: "Peças com estoque baixo", valor: "3" },
  ];

  return (
    <section>
      <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
      <p className="mt-2 text-slate-600">
        Visão geral da oficina.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {indicadores.map((indicador) => (
          <article
            key={indicador.titulo}
            className="rounded-xl bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{indicador.titulo}</p>
            <strong className="mt-2 block text-3xl text-blue-600">
              {indicador.valor}
            </strong>
          </article>
        ))}
      </div>
    </section>
  );
}