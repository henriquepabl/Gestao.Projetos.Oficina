const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type Role = "client" | "employee" | "admin";
export type Usuario = { id: string; nome: string; email: string; role: Role };
type ApiResponse = { message?: string; status?: string };

const SESSION_KEY = "oficina-plus-sessao";

export const authSession = {
  get: (): { token: string; usuario: Usuario } | null => {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null");
    } catch {
      return null;
    }
  },
  isAuthenticated: () => authSession.get() !== null,
  usuario: () => authSession.get()?.usuario ?? null,
  start: (token: string, usuario: Usuario) => sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, usuario })),
  end: () => sessionStorage.removeItem(SESSION_KEY),
};

async function request<T>(method: string, path: string, body?: object): Promise<T> {
  const token = authSession.get()?.token;
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
  }
  const result = (await response.json().catch(() => ({}))) as T & ApiResponse;
  if (response.status === 401 && token) {
    // sessão expirou: volta para o login
    authSession.end();
    window.location.assign("/login");
  }
  if (!response.ok) throw new Error(result.message ?? "Não foi possível concluir a solicitação.");
  return result;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: object) => request<T>("POST", path, body),
  patch: <T>(path: string, body: object) => request<T>("PATCH", path, body),
};

export const authApi = {
  login: (email: string, senha: string) => api.post<{ token: string; usuario: Usuario }>("login", { email, senha }),
  cadastro: (dados: { nome: string; email: string; telefone: string; senha: string }) => api.post<ApiResponse>("cadastro", dados),
};
