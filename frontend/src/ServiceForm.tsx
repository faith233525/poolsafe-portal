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

type ServiceFormState = typeof initialState;

export default function ServiceForm({
  onSubmit,
  initialData,
  role,
}: {
  onSubmit: (data: ServiceFormState) => void;
  initialData?: Partial<ServiceFormState>;
  role: string;
}) {
  const [form, setForm] = useState<ServiceFormState>({
    ...initialState,
    ...(initialData || {}),
  });
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const { name, value } = target as any;
    const isCheckbox = (target as HTMLInputElement).type === "checkbox";
    const checked = isCheckbox ? (target as HTMLInputElement).checked : undefined;
    setForm((f: ServiceFormState) => ({
      ...f,
      [name]: isCheckbox ? checked : value,
    } as ServiceFormState));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f: ServiceFormState) => ({
      ...f,
      attachments: Array.from(e.target.files || []),
    } as ServiceFormState));
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
  <select name="serviceType" value={form.serviceType} onChange={handleChange} aria-label="Service Type">
        <option>Maintenance</option>
        <option>Installation</option>
        <option>Upgrade</option>
        <option>Training</option>
        <option>Other</option>
      </select>
  <select name="status" value={form.status} onChange={handleChange} aria-label="Status">
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
  <input name="scheduledDate" type="date" value={form.scheduledDate} onChange={handleChange} aria-label="Scheduled Date" />
  <input name="attachments" type="file" multiple onChange={handleFileChange} aria-label="Attachments" />
      <button type="submit">{initialData ? "Update" : "Create"}</button>
    </form>
  );
}
