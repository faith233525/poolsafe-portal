import React, { useEffect, useState } from "react";
import styles from "./App.module.css";

export default function ServiceTable({
  role,
  onSelect,
  onEdit,
  onDelete,
  filters,
}: {
  role: string;
  onSelect?: (id: string) => void;
  onEdit?: (record: any) => void;
  onDelete?: (id: string) => void;
  filters?: any;
}) {
  const [records, setRecords] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecords() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams(filters || {}).toString();
        const res = await fetch(`/api/service-records${params ? `?${params}` : ""}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load service records");
        setRecords(data.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRecords();
  }, [JSON.stringify(filters)]);

  if (loading) return <div>Loading service records...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Type</th>
          <th>Status</th>
          <th>Partner</th>
          <th>Assigned To</th>
          <th>Scheduled</th>
          <th>Created</th>
          {role !== "partner" && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr
            key={record.id}
            onClick={() => {
              if (onSelect) {
                onSelect(record.id);
              }
            }}
          >
            <td>{record.serviceType}</td>
            <td>{record.status}</td>
            <td>{record.partner?.companyName}</td>
            <td>{record.assignedTo?.displayName || "Unassigned"}</td>
            <td>
              {record.scheduledDate ? new Date(record.scheduledDate).toLocaleDateString() : "N/A"}
            </td>
            <td>{new Date(record.createdAt).toLocaleString()}</td>
            {role !== "partner" && (
              <td>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEdit) {
                      onEdit(record);
                    }
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDelete) {
                      onDelete(record.id);
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
