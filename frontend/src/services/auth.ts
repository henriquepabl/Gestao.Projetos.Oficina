const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type ApiResponse = { message?: string; status?: string };

async function post<T extends ApiResponse>(path: string, body: object): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
  }
  const result = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) throw new Error(result.message ?? "Não foi possível concluir a solicitação.");
  return result;
}

export const authApi = {
  login: (email: string, senha: string) => post("login", { email, senha }),
  cadastro: (dados: { nome: string; email: string; telefone: string; senha: string }) => post("cadastro", dados),
};

const SESSION_KEY = "oficina-plus-authenticated";
export const authSession = {
  isAuthenticated: () => sessionStorage.getItem(SESSION_KEY) === "true",
  start: () => sessionStorage.setItem(SESSION_KEY, "true"),
  end: () => sessionStorage.removeItem(SESSION_KEY),
};
