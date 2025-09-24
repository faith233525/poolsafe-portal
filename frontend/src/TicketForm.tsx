import React, { useState } from "react";
import styles from "./App.module.css";

const initialState = {
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
  const [form, setForm] = useState(initialData || initialState);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, attachments: Array.from(e.target.files || []) }));
  }

  function handleSubmit(e: React.FormEvent) {
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
    onSubmit(form);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2>{initialData ? "Edit Ticket" : "Create Ticket"}</h2>
      {error && (
        <div className={styles.error} role="alert" aria-live="assertive">
          {error}
        </div>
      )}
      <input
        name="subject"
        value={form.subject}
        onChange={handleChange}
        placeholder="Subject"
        required
      />
      <textarea
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="Description"
        required
      />
      <select name="category" value={form.category} onChange={handleChange}>
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
      <select name="priority" value={form.priority} onChange={handleChange}>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
      </select>
      <input
        name="unitsAffected"
        type="number"
        value={form.unitsAffected}
        onChange={handleChange}
        placeholder="Units Affected"
      />
      <input
        name="contactPreference"
        value={form.contactPreference}
        onChange={handleChange}
        placeholder="Contact Preference"
      />
      <input
        name="dateOfOccurrence"
        type="date"
        value={form.dateOfOccurrence}
        onChange={handleChange}
      />
      <input
        name="severity"
        type="range"
        min={1}
        max={10}
        value={form.severity}
        onChange={handleChange}
      />
      <label>
        <input
          name="recurringIssue"
          type="checkbox"
          checked={form.recurringIssue}
          onChange={handleChange}
        />{" "}
        Recurring Issue
      </label>
      <textarea
        name="followUpNotes"
        value={form.followUpNotes}
        onChange={handleChange}
        placeholder="Follow Up Notes"
      />
      <input name="attachments" type="file" multiple onChange={handleFileChange} />
      <button type="submit">{initialData ? "Update" : "Create"}</button>
    </form>
  );
}
