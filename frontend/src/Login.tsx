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
      const isEmail = username.includes("@");
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
  window.location.href = `${base}/api/auth/sso/login`;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>🛋️</div>
            <h1 className={styles.logoText}>LounGenie</h1>
          </div>
          <h2 className={styles.title}>Welcome Back</h2>
          <p className={styles.subtitle}>Sign in to your support portal</p>
        </div>

        <form onSubmit={handleLocalLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="username" className={styles.label}>
              Email or Company Name
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={styles.input}
              placeholder="Enter your email or company name"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            {loading ? (
              <span className={styles.buttonContent}>
                <span className={styles.spinner}></span>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerText}>or continue with</span>
        </div>

        <button
          onClick={handleSsoLogin}
          disabled={loading}
          className={`${styles.button} ${styles.buttonSso}`}
        >
          <span className={styles.buttonContent}>
            <span className={styles.microsoftIcon}>🏢</span>
            Microsoft SSO (Admin/Support)
          </span>
        </button>

        {error && (
          <div className={styles.error}>
            <span className={styles.errorIcon}>⚠️</span>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
