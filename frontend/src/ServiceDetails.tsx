import React, { useEffect, useState } from "react";
import styles from "./App.module.css";

export default function ServiceDetails({
  recordId,
  role: _role,
}: {
  recordId: string;
  role: string;
}) {
  const [record, setRecord] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecord() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/service-records/${recordId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load service record");
        setRecord(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRecord();
  }, [recordId]);

  if (loading) return <div>Loading service record...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!record) return <div>No service record found.</div>;

  return (
    <div className={styles.card}>
      <h2>Service Record Details</h2>
      <div>
        <b>Type:</b> {record.serviceType}
      </div>
      <div>
        <b>Status:</b> {record.status}
      </div>
      <div>
        <b>Partner:</b> {record.partner?.companyName}
      </div>
      <div>
        <b>Assigned To:</b> {record.assignedTo?.displayName || "Unassigned"}
      </div>
      <div>
        <b>Scheduled:</b>{" "}
        {record.scheduledDate ? new Date(record.scheduledDate).toLocaleDateString() : "N/A"}
      </div>
      <div>
        <b>Created:</b> {new Date(record.createdAt).toLocaleString()}
      </div>
      <div>
        <b>Description:</b> {record.description}
      </div>
      <div>
        <b>Notes:</b> {record.notes}
      </div>
      <div>
        <b>Attachments:</b>{" "}
        {record.attachments
          ? JSON.parse(record.attachments).map((a: any, i: number) => (
              <span key={i}>{a.name} </span>
            ))
          : "None"}
      </div>
    </div>
  );
}
