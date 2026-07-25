const TOKEN_KEY = 'claude-lens-token';
const NAME_KEY = 'claude-lens-name';

export function saveSession(token: string, name: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(NAME_KEY, name);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
}
