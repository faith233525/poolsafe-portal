import React, { useEffect, useState } from "react";
import styles from "./App.module.css";

export default function TicketDetails({ ticketId, role }: { ticketId: string; role: string }) {
  const [ticket, setTicket] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTicket() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tickets/${ticketId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load ticket");
        setTicket(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTicket();
  }, [ticketId]);

  if (loading) return <div>Loading ticket...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!ticket) return <div>No ticket found.</div>;

  return (
    <div className={styles.card}>
      <h2>Ticket Details</h2>
      <div>
        <b>Subject:</b> {ticket.subject}
      </div>
      <div>
        <b>Category:</b> {ticket.category}
      </div>
      <div>
        <b>Priority:</b> {ticket.priority}
      </div>
      <div>
        <b>Status:</b> {ticket.status}
      </div>
      <div>
        <b>Description:</b> {ticket.description}
      </div>
      <div>
        <b>Partner:</b> {ticket.partner?.companyName}
      </div>
      <div>
        <b>Assigned To:</b> {ticket.assignedTo?.displayName || "Unassigned"}
      </div>
      <div>
        <b>Created:</b> {new Date(ticket.createdAt).toLocaleString()}
      </div>
      <div>
        <b>Updated:</b> {new Date(ticket.updatedAt).toLocaleString()}
      </div>
      <div>
        <b>Units Affected:</b> {ticket.unitsAffected}
      </div>
      <div>
        <b>Contact Preference:</b> {ticket.contactPreference}
      </div>
      <div>
        <b>Severity:</b> {ticket.severity}
      </div>
      <div>
        <b>Recurring Issue:</b> {ticket.recurringIssue ? "Yes" : "No"}
      </div>
      <div>
        <b>Follow Up Notes:</b> {ticket.followUpNotes}
      </div>
      <div>
        <b>Attachments:</b>{" "}
        {ticket.attachments?.length
          ? ticket.attachments.map((a: any) => <span key={a.id}>{a.filename} </span>)
          : "None"}
      </div>
      {role !== "partner" && (
        <>
          <div>
            <b>Internal Notes:</b> {ticket.internalNotes}
          </div>
          <div>
            <b>Resolution Time:</b> {ticket.resolutionTime ? `${ticket.resolutionTime} hrs` : "N/A"}
          </div>
        </>
      )}
    </div>
  );
}
