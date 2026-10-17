type EmConstrucaoProps = {
  titulo: string;
};

export function EmConstrucao({ titulo }: EmConstrucaoProps) {
  return (
    <section>
      <h2 className="text-3xl font-bold text-slate-900">{titulo}</h2>
      <p className="mt-2 text-slate-600">
        Esta funcionalidade será implementada nas próximas etapas.
      </p>
    </section>
  );
}