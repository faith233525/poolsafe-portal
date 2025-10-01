import React, { useState } from "react";
import { apiFetch } from "./utils/api";

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
  role: _role,
}: {
  onSubmit: (data: any) => void;
  initialData?: any;
  role: string; // This line remains unchanged
}) {
  const [form, setForm] = useState<FormState>(initialData || initialState);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((f: FormState) => ({ ...f, [name]: value }) as FormState);
  }

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((f: FormState) => ({ ...f, [name]: value }) as FormState);
  }

  function handleCheckboxChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, checked } = e.target;
    setForm((f: FormState) => ({ ...f, [name]: checked }) as FormState);
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
      const res = await apiFetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        setError("Failed to submit ticket.");
        return;
      }
      onSubmit(form);
    } catch {
      setError("Failed to submit ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card fade-in">
      <form className="space-y-6" onSubmit={handleSubmit} noValidate aria-label="Ticket Form">
        <div className="flex items-center space-x-4">
          <div className="text-xl">🎫</div>
          <h2 className="text-xl font-bold text-gray-900">
            {initialData ? "Edit Ticket" : "Create New Ticket"}
          </h2>
        </div>

        {error && (
          <div className="error" role="alert" aria-live="assertive" data-testid="ticket-error">
            <span className="errorIcon">⚠️</span>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="subject" className="form-label">
              Subject *
            </label>
            <input
              id="subject"
              name="subject"
              value={form.subject}
              onChange={handleTextChange}
              placeholder="Brief description of the issue"
              required
              disabled={submitting}
              className="form-input"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="form-label">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={form.category}
              onChange={handleSelectChange}
              disabled={submitting}
              className="form-select"
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
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="form-label">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleTextChange}
            placeholder="Detailed description of the issue, including steps to reproduce, error messages, etc."
            required
            disabled={submitting}
            className="form-textarea"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label htmlFor="priority" className="form-label">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={form.priority}
              onChange={handleSelectChange}
              disabled={submitting}
              className="form-select"
            >
              <option value="LOW">🟢 Low</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="HIGH">🔴 High</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="unitsAffected" className="form-label">
              Units Affected
            </label>
            <input
              id="unitsAffected"
              name="unitsAffected"
              type="number"
              value={form.unitsAffected}
              onChange={handleTextChange}
              placeholder="Number of units affected"
              disabled={submitting}
              className="form-input"
              min={0}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="contactPreference" className="form-label">
              Contact Preference
            </label>
            <input
              id="contactPreference"
              name="contactPreference"
              value={form.contactPreference}
              onChange={handleTextChange}
              placeholder="Email, Phone, etc."
              disabled={submitting}
              className="form-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="dateOfOccurrence" className="form-label">
              Date of Occurrence
            </label>
            <input
              id="dateOfOccurrence"
              name="dateOfOccurrence"
              type="date"
              value={form.dateOfOccurrence}
              onChange={handleTextChange}
              disabled={submitting}
              className="form-input"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="severity" className="form-label">
              Severity: {form.severity}/10
            </label>
            <input
              id="severity"
              name="severity"
              type="range"
              min={1}
              max={10}
              value={form.severity}
              onChange={handleTextChange}
              disabled={submitting}
              className="form-input"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <input
            id="recurringIssue"
            name="recurringIssue"
            type="checkbox"
            checked={form.recurringIssue}
            onChange={handleCheckboxChange}
            disabled={submitting}
            className="w-4 h-4 text-aqua bg-gray-100 border-gray-300 rounded focus:ring-aqua"
          />
          <label htmlFor="recurringIssue" className="form-label">
            🔄 This is a recurring issue
          </label>
        </div>

        <div className="space-y-2">
          <label htmlFor="followUpNotes" className="form-label">
            Follow Up Notes
          </label>
          <textarea
            id="followUpNotes"
            name="followUpNotes"
            value={form.followUpNotes}
            onChange={handleTextChange}
            placeholder="Additional notes for follow-up"
            disabled={submitting}
            className="form-textarea"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="attachments" className="form-label">
            📎 Attachments
          </label>
          <input
            id="attachments"
            name="attachments"
            type="file"
            multiple
            onChange={handleFileChange}
            disabled={submitting}
            className="form-input"
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.txt"
          />
          <p className="text-xs text-muted">
            Supported formats: Images, PDFs, Documents (Max 10MB each)
          </p>
        </div>

        <div className="flex gap-4 pt-6">
          <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
            {submitting ? (
              <span className="buttonContent">
                <span className="loading"></span>
                Processing...
              </span>
            ) : (
              <span className="buttonContent">
                <span>{initialData ? "📝" : "🎫"}</span>
                {initialData ? "Update Ticket" : "Submit Ticket"}
              </span>
            )}
          </button>

          <button
            type="button"
            disabled={submitting}
            className="btn btn-secondary"
            onClick={() => setForm(initialState)}
          >
            <span className="buttonContent">
              <span>🔄</span>
              Reset
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
