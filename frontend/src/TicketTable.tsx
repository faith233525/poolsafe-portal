import React, { useEffect, useState } from "react";
import styles from "./App.module.css";

export default function TicketTable({
  role,
  onSelect,
  onEdit,
  onDelete,
  filters,
}: {
  role: string;
  onSelect?: (id: string) => void;
  onEdit?: (ticket: any) => void;
  onDelete?: (id: string) => void;
  filters?: any;
}) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams(filters || {}).toString();
        const res = await fetch(`/api/tickets${params ? `?${params}` : ""}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load tickets");
        setTickets(data.items || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTickets();
  }, [JSON.stringify(filters)]);

  if (loading) return <div>Loading tickets...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Subject</th>
          <th>Category</th>
          <th>Priority</th>
          <th>Status</th>
          <th>Partner</th>
          <th>Assigned To</th>
          <th>Created</th>
          {role !== "partner" && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {tickets.map((ticket) => (
          <tr
            key={ticket.id}
            onClick={() => {
              if (onSelect) {
                onSelect(ticket.id);
              }
            }}
          >
            <td>{ticket.subject}</td>
            <td>{ticket.category}</td>
            <td>{ticket.priority}</td>
            <td>{ticket.status}</td>
            <td>{ticket.partner?.companyName}</td>
            <td>{ticket.assignedTo?.displayName || "Unassigned"}</td>
            <td>{new Date(ticket.createdAt).toLocaleString()}</td>
            {role !== "partner" && (
              <td>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEdit) {
                      onEdit(ticket);
                    }
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDelete) {
                      onDelete(ticket.id);
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
