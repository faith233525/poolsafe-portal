import React, { useState } from "react";
import styles from "./Login.module.css";

export default function Login({ onLogin }: { onLogin: (jwt: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLocalLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
    // Simulate SSO redirect (replace with real Microsoft OAuth2 flow)
    try {
      // In production, redirect to Microsoft login and handle callback
      const res = await fetch("/api/auth/sso-demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "SSO failed");
      onLogin(data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Portal Login</h2>
      <form onSubmit={handleLocalLogin}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          Login (Partner)
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
