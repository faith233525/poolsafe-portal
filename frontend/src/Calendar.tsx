import React, { useEffect, useState } from "react";
import styles from "./App.module.css";

export default function Calendar({ role }: { role: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/calendar-events");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load events");
        setEvents(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  if (loading) return <div>Loading calendar...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.card}>
      <h2>Calendar</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Title</th>
            <th>Description</th>
            <th>Partner</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{new Date(event.date).toLocaleDateString()}</td>
              <td>{event.type}</td>
              <td>{event.title}</td>
              <td>{event.description}</td>
              <td>{event.partner?.companyName}</td>
              <td>{event.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
