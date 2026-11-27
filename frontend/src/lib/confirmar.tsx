import { useState } from "react";
import { Dialogo } from "../components/DialogoConfirmacao";

type Opcoes = { titulo: string; mensagem: string; confirmar?: string; perigo?: boolean };
export type Pedido = Opcoes & { responder: (ok: boolean) => void };

/** Substitui window.confirm: `if (await confirmar({...}))`. Renderize `dialogo` na tela. */
export function useConfirmar() {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const confirmar = (opcoes: Opcoes) => new Promise<boolean>((responder) => setPedido({ ...opcoes, responder }));
  const fechar = (ok: boolean) => {
    pedido?.responder(ok);
    setPedido(null);
  };
  return { confirmar, dialogo: pedido && <Dialogo pedido={pedido} fechar={fechar} /> };
}
