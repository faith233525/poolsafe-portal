import React, { useState } from "react";
import { apiFetch } from "./utils/api";
import styles from "./Login.module.css";

export default function Login({ onLogin }: { onLogin: (jwt: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLocalLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Determine if it's an email (admin/support) or company name (partner)
      const isEmail = username.includes('@');
      const endpoint = isEmail ? "/api/auth/login" : "/api/auth/login/partner";
      
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      onLogin(data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSsoLogin() {
    setError(null);
    setLoading(true);
    try {
      // Redirect to Microsoft SSO login endpoint
      const base =
        (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "";
      window.location.href = `${base}/api/sso/login`;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Portal Login</h2>
      <form onSubmit={handleLocalLogin}>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className={styles.input}
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={styles.input}
        />
        <button type="submit" disabled={loading} className={styles.button}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <hr className={styles.hr} />
      <button onClick={handleSsoLogin} disabled={loading} className={styles.buttonSso}>
        Login with Outlook SSO (Support/Admin)
      </button>
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
