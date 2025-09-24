import React, { useState } from "react";
import styles from "./App.module.css";

type FormState = {
  subject: string;
  category: string;
  priority: string;
  description: string;
  unitsAffected: number;
  contactPreference: string;
  recurringIssue: boolean;
  dateOfOccurrence: string;
  severity: number;
  followUpNotes: string;
  attachments: File[];
};

const initialState: FormState = {
  subject: "",
  category: "General",
  priority: "MEDIUM",
  description: "",
  unitsAffected: 0,
  contactPreference: "",
  recurringIssue: false,
  dateOfOccurrence: "",
  severity: 5,
  followUpNotes: "",
  attachments: [],
};

export default function TicketForm({
  onSubmit,
  initialData,
  role,
}: {
  onSubmit: (data: any) => void;
  initialData?: any;
  role: string;
}) {
  const [form, setForm] = useState<FormState>(initialData || initialState);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((f: FormState) => ({ ...f, [name]: value } as FormState));
  }

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((f: FormState) => ({ ...f, [name]: value } as FormState));
  }

  function handleCheckboxChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, checked } = e.target;
    setForm((f: FormState) => ({ ...f, [name]: checked } as FormState));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f: FormState) => ({ ...f, attachments: Array.from(e.target.files || []) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.subject) {
      setError("Subject is required.");
      return;
    }
    if (!form.description) {
      setError("Description is required.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        setError("Failed to submit ticket.");
        return;
      }
      onSubmit(form);
    } catch (err) {
      setError("Failed to submit ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate aria-label="Ticket Form">
      <h2>{initialData ? "Edit Ticket" : "Create Ticket"}</h2>
      {error && (
        <div
          className={styles.error}
          role="alert"
          aria-live="assertive"
          data-testid="ticket-error"
        >
          {error}
        </div>
      )}
      <label htmlFor="subject">Subject</label>
      <input
        id="subject"
        name="subject"
        value={form.subject}
        onChange={handleTextChange}
        placeholder="Subject"
        required
        disabled={submitting}
      />
      <label htmlFor="description">Description</label>
      <textarea
        id="description"
        name="description"
        value={form.description}
        onChange={handleTextChange}
        placeholder="Description"
        required
        disabled={submitting}
      />
      <label htmlFor="category">Category</label>
      <select
        id="category"
        name="category"
        value={form.category}
        onChange={handleSelectChange}
        disabled={submitting}
      >
        <option>General</option>
        <option>Connectivity</option>
        <option>Charging</option>
        <option>Screen</option>
        <option>Locking</option>
        <option>General Maintenance</option>
        <option>Monitor</option>
        <option>Antenna</option>
        <option>Gateway</option>
        <option>LoRa</option>
        <option>General System</option>
        <option>Other</option>
      </select>
      <label htmlFor="priority">Priority</label>
      <select
        id="priority"
        name="priority"
        value={form.priority}
        onChange={handleSelectChange}
        disabled={submitting}
      >
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
      </select>
      <label htmlFor="unitsAffected">Units Affected</label>
      <input
        id="unitsAffected"
        name="unitsAffected"
        type="number"
        value={form.unitsAffected}
        onChange={handleTextChange}
        placeholder="Units Affected"
        disabled={submitting}
      />
      <label htmlFor="contactPreference">Contact Preference</label>
      <input
        id="contactPreference"
        name="contactPreference"
        value={form.contactPreference}
        onChange={handleTextChange}
        placeholder="Contact Preference"
        disabled={submitting}
      />
      <label htmlFor="dateOfOccurrence">Date of Occurrence</label>
      <input
        id="dateOfOccurrence"
        name="dateOfOccurrence"
        type="date"
        value={form.dateOfOccurrence}
        onChange={handleTextChange}
        disabled={submitting}
      />
      <label htmlFor="severity">Severity</label>
      <input
        id="severity"
        name="severity"
        type="range"
        min={1}
        max={10}
        value={form.severity}
        onChange={handleTextChange}
        disabled={submitting}
      />
      <label>
        <input
          name="recurringIssue"
          type="checkbox"
          checked={form.recurringIssue}
          onChange={handleCheckboxChange}
          disabled={submitting}
        />{" "}
        Recurring Issue
      </label>
      <label htmlFor="followUpNotes">Follow Up Notes</label>
      <textarea
        id="followUpNotes"
        name="followUpNotes"
        value={form.followUpNotes}
        onChange={handleTextChange}
        placeholder="Follow Up Notes"
        disabled={submitting}
      />
      <label htmlFor="attachments">Attachments</label>
      <input
        id="attachments"
        name="attachments"
        type="file"
        multiple
        onChange={handleFileChange}
        disabled={submitting}
      />
      <button type="submit" disabled={submitting}>
        {initialData ? "Update" : "Submit Ticket"}
      </button>
    </form>
  );
}
