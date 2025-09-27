import React, { useEffect, useState } from "react";
import styles from "./App.module.css";

export default function ServiceStats({
  role: _role,
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
        const res = await fetch(`/api/service-records/stats/summary${params ? `?${params}` : ""}`);
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
      <h2>Service Analytics</h2>
      <div>
        <b>Total Records:</b> {stats.totalRecords}
      </div>
      <div>
        <b>By Status:</b>{" "}
        {stats.byStatus.map((s: any) => `${s.status}: ${s._count.status}`).join(", ")}
      </div>
      <div>
        <b>By Type:</b>{" "}
        {stats.byType.map((t: any) => `${t.serviceType}: ${t._count.serviceType}`).join(", ")}
      </div>
      <div>
        <b>Monthly Trend:</b>{" "}
        {stats.monthlyTrend
          .map((m: any) => `${new Date(m.createdAt).toLocaleDateString()}: ${m._count.id}`)
          .join(", ")}
      </div>
    </div>
  );
}
