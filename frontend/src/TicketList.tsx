import React, { useState, useEffect, useRef } from "react";
import { apiFetch } from "./utils/api";
import styles from "./App.module.css";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
};

function escapeHtml(str: string) {
  return str.replace(/[&<>'"/]/g, function (s) {
    const entity: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
      "/": "&#x2F;",
    };
    return entity[s] || s;
  });
}

function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();

    const load = async () => {
      if (!mountedRef.current) return;
      setLoading(true);
      setError(null);
      try {
        const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") || "" : "";
        const res = await apiFetch("/api/tickets", {
          headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
          signal: controller.signal,
        });
        if (!mountedRef.current) return;
        if (!res.ok) {
          setError("Failed to load tickets. Please try again later.");
          return;
        }
        const data = await res.json();
        if (!mountedRef.current) return;
        setTickets(data);
      } catch (e: any) {
        if (mountedRef.current && !(e?.name === "AbortError")) {
          setError("Network error. Please try again later.");
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    load();

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, []);

  return (
    <div>
      <h3>Tickets</h3>
      {loading ? (
        <div className={styles.info} role="status">
          Loading tickets...
        </div>
      ) : error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : tickets.length === 0 ? (
        <div className={styles.info}>No tickets found.</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Subject</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td className={styles.td}>{escapeHtml(t.subject)}</td>
                <td className={styles.td}>{escapeHtml(t.status)}</td>
                <td className={styles.td}>{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default TicketList;
