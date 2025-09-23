import React, { useEffect, useState } from "react";
import styles from "./App.module.css";

export default function TicketStats({
  role,
  partnerId,
  assignedToId,
}: {
  role: string;
  partnerId?: string;
  assignedToId?: string;
}) {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ partnerId, assignedToId } as any).toString();
        const res = await fetch(`/api/tickets/stats/summary${params ? `?${params}` : ""}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load stats");
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [partnerId, assignedToId]);

  if (loading) return <div>Loading stats...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!stats) return <div>No stats found.</div>;

  return (
    <div className={styles.card}>
      <h2>Ticket Analytics</h2>
      <div>
        <b>Total Tickets:</b> {stats.totalTickets}
      </div>
      <div>
        <b>Assigned:</b> {stats.assignedTickets}
      </div>
      <div>
        <b>Unassigned:</b> {stats.unassignedTickets}
      </div>
      <div>
        <b>Avg. Resolution Time:</b>{" "}
        {stats.averageResolutionTime ? `${stats.averageResolutionTime.toFixed(2)} hrs` : "N/A"}
      </div>
      <div>
        <b>By Status:</b>{" "}
        {stats.byStatus.map((s: any) => `${s.status}: ${s._count.status}`).join(", ")}
      </div>
      <div>
        <b>By Category:</b>{" "}
        {stats.byCategory.map((c: any) => `${c.category}: ${c._count.category}`).join(", ")}
      </div>
      <div>
        <b>By Priority:</b>{" "}
        {stats.byPriority.map((p: any) => `${p.priority}: ${p._count.priority}`).join(", ")}
      </div>
    </div>
  );
}
