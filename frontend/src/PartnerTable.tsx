import React, { useEffect, useState } from "react";
import styles from "./App.module.css";

export default function PartnerTable({
  role,
  onSelect,
  onEdit,
  onDelete,
}: {
  role: string;
  onSelect?: (id: string) => void;
  onEdit?: (partner: any) => void;
  onDelete?: (id: string) => void;
}) {
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

  if (loading) return <div>Loading partners...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Company</th>
          <th>Management</th>
          <th>Address</th>
          <th>LounGenie Units</th>
          <th>Top Colour</th>
          <th>Map</th>
          {role !== "partner" && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {partners.map((partner) => (
          <tr
            key={partner.id}
            onClick={() => {
              if (onSelect) {
                onSelect(partner.id);
              }
            }}
          >
            <td>{partner.companyName}</td>
            <td>{partner.managementCompany}</td>
            <td>
              {partner.streetAddress}, {partner.city}, {partner.state}, {partner.zip},{" "}
              {partner.country}
            </td>
            <td>{partner.numberOfLoungeUnits}</td>
            <td>{partner.topColour}</td>
            <td>
              Lat {partner.latitude}, Long {partner.longitude}
            </td>
            {role !== "partner" && (
              <td>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEdit) {
                      onEdit(partner);
                    }
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDelete) {
                      onDelete(partner.id);
                    }
                  }}
                >
                  Delete
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
