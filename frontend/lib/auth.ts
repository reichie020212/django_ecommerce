// Auth API + JWT storage. Tokens live in localStorage; Bearer is attached on
// every authed call via authedFetch().

const BROWSER_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const TOKEN_KEY = 'lumen_jwt';
const REFRESH_KEY = 'lumen_jwt_refresh';

export type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
};

type AuthResponse = { user: User; access: string; refresh: string };

const json: RequestInit = { headers: { 'Content-Type': 'application/json' } };

function setTokens(access: string, refresh: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, access);
  window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

export async function register(input: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${BROWSER_URL}/api/auth/register/`, {
    ...json,
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(formatError(body) ?? `Registration failed: ${res.status}`);
  }
  const data: AuthResponse = await res.json();
  setTokens(data.access, data.refresh);
  return data;
}

export async function login(email: string, password: string): Promise<{ user: User }> {
  const res = await fetch(`${BROWSER_URL}/api/auth/login/`, {
    ...json,
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Invalid email or password.');
  const { access, refresh } = (await res.json()) as { access: string; refresh: string };
  setTokens(access, refresh);
  const user = await me();
  return { user };
}

export async function me(): Promise<User> {
  const res = await authedFetch('/api/auth/me/');
  if (!res.ok) throw new Error(`me failed: ${res.status}`);
  return res.json();
}

export function logout() {
  clearTokens();
}

export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(`${BROWSER_URL}${path}`, { ...init, headers, credentials: 'include' });
}

function formatError(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const out: string[] = [];
  for (const [field, errs] of Object.entries(body as Record<string, unknown>)) {
    const list = Array.isArray(errs) ? errs : [String(errs)];
    out.push(`${field}: ${list.join(', ')}`);
  }
  return out.length ? out.join('\n') : null;
}
