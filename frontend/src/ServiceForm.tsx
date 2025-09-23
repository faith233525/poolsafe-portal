import React, { useState } from "react";
import styles from "./App.module.css";

const initialState = {
  serviceType: "Maintenance",
  status: "SCHEDULED",
  partnerId: "",
  assignedToId: "",
  description: "",
  notes: "",
  scheduledDate: "",
  attachments: [],
};

export default function ServiceForm({
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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, attachments: Array.from(e.target.files || []) }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.serviceType || !form.partnerId) {
      setError("Service type and partner are required.");
      return;
    }
    onSubmit(form);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2>{initialData ? "Edit Service Record" : "Create Service Record"}</h2>
      {error && <div className={styles.error}>{error}</div>}
      <select name="serviceType" value={form.serviceType} onChange={handleChange}>
        <option>Maintenance</option>
        <option>Installation</option>
        <option>Upgrade</option>
        <option>Training</option>
        <option>Other</option>
      </select>
      <select name="status" value={form.status} onChange={handleChange}>
        <option value="SCHEDULED">Scheduled</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      <input
        name="partnerId"
        value={form.partnerId}
        onChange={handleChange}
        placeholder="Partner ID"
        required
      />
      <input
        name="assignedToId"
        value={form.assignedToId}
        onChange={handleChange}
        placeholder="Assigned To (User ID)"
      />
      <textarea
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="Description"
      />
      <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Notes" />
      <input name="scheduledDate" type="date" value={form.scheduledDate} onChange={handleChange} />
      <input name="attachments" type="file" multiple onChange={handleFileChange} />
      <button type="submit">{initialData ? "Update" : "Create"}</button>
    </form>
  );
}
