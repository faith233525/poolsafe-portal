import React, { useEffect, useState } from "react";
import styles from "./App.module.css";

export default function PartnerMap({ role }: { role: string }) {
  const [partners, setPartners] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPartners() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/partners");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load partners");
        setPartners(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPartners();
  }, []);

  if (loading) return <div>Loading map...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.card}>
      <h2>Partner Map</h2>
      <svg width={600} height={400} style={{ background: "#eef" }}>
        {partners.map((partner) => (
          <circle
            key={partner.id}
            cx={300 + (partner.longitude || 0) * 2}
            cy={200 - (partner.latitude || 0) * 2}
            r={8}
            fill="#0077cc"
          >
            <title>{partner.companyName}</title>
          </circle>
        ))}
      </svg>
      <div>
        {partners.map((partner) => (
          <div key={partner.id}>
            <b>{partner.companyName}</b> ({partner.city}, {partner.state})
          </div>
        ))}
      </div>
    </div>
  );
}
