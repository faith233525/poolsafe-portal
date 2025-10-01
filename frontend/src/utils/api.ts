// In test environment, provide a default absolute base to avoid invalid relative URLs in jsdom
const DEFAULT_TEST_BASE =
  typeof process !== "undefined" && process.env.NODE_ENV === "test" ? "http://localhost:4000" : "";
export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || DEFAULT_TEST_BASE || "";

export function apiUrl(path: string) {
  // Ensure single slash between base and path
  if (!API_BASE) return path;
  const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function apiFetch(input: string, init?: RequestInit) {
  const url = input.startsWith("/") ? apiUrl(input) : input;
  return fetch(url, init);
}
