import React, { useEffect, useState } from "react";
import styles from "./App.module.css";

export default function Notifications({ role: _role }: { role: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/notifications");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load notifications");
        setNotifications(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, []);

  if (loading) return <div>Loading notifications...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.card}>
      <h2>Notifications</h2>
      <ul>
        {notifications.map((n) => (
          <li key={n.id}>
            <b>{n.title}</b> <span>{n.message}</span>{" "}
            <span>{new Date(n.date).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
