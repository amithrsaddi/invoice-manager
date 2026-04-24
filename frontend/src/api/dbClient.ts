const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const USER_ID_KEY = "invoice_manager_user_id";

type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};
type AuthPayload = { email: string; password: string };
type RegisterPayload = AuthPayload & { name: string };
type User = { id: string; email: string; name: string };

const getUserId = () => localStorage.getItem(USER_ID_KEY);
const setUserId = (userId: string | null | undefined) => {
  if (userId) localStorage.setItem(USER_ID_KEY, userId);
  else localStorage.removeItem(USER_ID_KEY);
};

const request = async <T = unknown>(path: string, options: RequestOptions = {}): Promise<T> => {
  const userId = getUserId();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "x-user-id": userId } : {})
    },
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json() as Promise<T>;
};

const createEntityClient = (route: string) => ({
  list: (sort?: string) => request(`/${route}${sort ? `?sort=${encodeURIComponent(sort)}` : ""}`),
  get: (id: string) => request(`/${route}/${id}`),
  create: (payload: unknown) =>
    request(`/${route}`, { method: "POST", body: JSON.stringify(payload) }),
  update: (id: string, payload: unknown) =>
    request(`/${route}/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  delete: (id: string) => request(`/${route}/${id}`, { method: "DELETE" })
});

export const db = {
  auth: {
    register: async ({ name, email, password }: RegisterPayload) => {
      const data = await request<{ user?: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });
      setUserId(data.user?.id);
      return data.user;
    },
    login: async ({ email, password }: AuthPayload) => {
      const data = await request<{ user?: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setUserId(data.user?.id);
      return data.user;
    },
    me: async () => request<User>("/auth/me"),
    isAuthenticated: async () => !!getUserId(),
    logout: () => setUserId(null),
    redirectToLogin: () => {}
  },
  entities: {
    Invoice: createEntityClient("invoices"),
    Client: createEntityClient("clients"),
    Supplier: createEntityClient("suppliers"),
    AdditionalExpense: createEntityClient("additional-expenses"),
    RecurringSchedule: createEntityClient("recurring-schedules")
  }
};
