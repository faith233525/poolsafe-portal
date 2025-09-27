import React, { useState, useEffect } from "react";
import styles from "./App.module.css";

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  fields: string[];
}

interface EmailStatus {
  configured: boolean;
  status: string;
  message: string;
}

export default function EmailManager({ role }: { role: string }) {
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Test email form
  const [testEmail, setTestEmail] = useState("");

  // Notification form
  const [notificationForm, setNotificationForm] = useState({
    to: "",
    title: "",
    message: "",
    type: "info" as "info" | "success" | "warning" | "error",
    actionUrl: "",
    actionText: "",
  });

  // Fetch email status and templates on load
  useEffect(() => {
    if (role === "ADMIN" || role === "SUPPORT") {
      fetchEmailStatus();
      fetchTemplates();
    }
  }, [role]);

  const fetchEmailStatus = async () => {
    try {
      const res = await fetch("/api/email/status");
      const data = await res.json();
      setEmailStatus(data);
    } catch {
      console.error("Failed to fetch email status");
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/email/templates");
      const data = await res.json();
      setTemplates(data);
    } catch {
      console.error("Failed to fetch templates");
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      setError("Please enter an email address");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        setTestEmail("");
      } else {
        setError(data.error || "Failed to send test email");
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async () => {
    if (!notificationForm.to || !notificationForm.title || !notificationForm.message) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/email/notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...notificationForm,
          actionUrl: notificationForm.actionUrl || undefined,
          actionText: notificationForm.actionText || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        setNotificationForm({
          to: "",
          title: "",
          message: "",
          type: "info",
          actionUrl: "",
          actionText: "",
        });
      } else {
        setError(data.error || "Failed to send notification");
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return "✅";
      case "disconnected":
        return "❌";
      default:
        return "⚠️";
    }
  };

  if (role !== "ADMIN" && role !== "SUPPORT") {
    return (
      <div className={styles.card}>
        <h2>Access Denied</h2>
        <p>Email management is only available to Support and Admin users.</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h2>📧 Email Management</h2>

      {/* Email Service Status */}
      <div className={styles.emailSection}>
        <h3>Service Status</h3>
        {emailStatus ? (
          <div className={emailStatus.configured ? styles.emailStatusCard : styles.emailErrorCard}>
            <span className={styles.emailStatusIcon}>{getStatusIcon(emailStatus.status)}</span>
            <div className={styles.emailStatusInfo}>
              <div className={styles.emailStatusTitle}>{emailStatus.status.toUpperCase()}</div>
              <div className={styles.emailStatusMessage}>{emailStatus.message}</div>
            </div>
          </div>
        ) : (
          <p className={styles.loadingText}>Loading status...</p>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && <div className={styles.emailErrorCard}>{error}</div>}

      {success && <div className={styles.emailSuccessCard}>{success}</div>}

      {/* Test Email Section */}
      <div className={styles.emailSection}>
        <h3>🧪 Test Email Service</h3>
        <div className={styles.emailForm}>
          <div className={styles.emailFormRow}>
            <label htmlFor="test-email" className={styles.emailFormLabel}>
              Test Email Address:
            </label>
            <input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email to test..."
              className={styles.input}
              disabled={loading}
            />
          </div>
          <button
            onClick={sendTestEmail}
            disabled={loading || !emailStatus?.configured}
            className={styles.emailButton}
          >
            {loading ? "Sending..." : "Send Test Email"}
          </button>
        </div>
      </div>

      {/* Send Notification Section */}
      <div className={styles.emailSection}>
        <h3>📢 Send Custom Notification</h3>
        <div className={styles.emailForm}>
          <div className={styles.emailFormRow}>
            <label htmlFor="notif-to" className={styles.emailFormLabel}>
              Recipient Email(s):
            </label>
            <input
              id="notif-to"
              type="email"
              value={notificationForm.to}
              onChange={(e) => setNotificationForm((prev) => ({ ...prev, to: e.target.value }))}
              placeholder="recipient@example.com"
              className={styles.input}
              disabled={loading}
            />
            <small className={styles.emailFormHint}>
              For multiple recipients, separate with commas
            </small>
          </div>

          <div className={styles.emailFormRow}>
            <label htmlFor="notif-title" className={styles.emailFormLabel}>
              Title:
            </label>
            <input
              id="notif-title"
              type="text"
              value={notificationForm.title}
              onChange={(e) => setNotificationForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Notification title..."
              className={styles.input}
              disabled={loading}
            />
          </div>

          <div className={styles.emailFormRow}>
            <label htmlFor="notif-message" className={styles.emailFormLabel}>
              Message:
            </label>
            <textarea
              id="notif-message"
              value={notificationForm.message}
              onChange={(e) =>
                setNotificationForm((prev) => ({ ...prev, message: e.target.value }))
              }
              placeholder="Your notification message here..."
              className={styles.textarea}
              disabled={loading}
              rows={4}
            />
          </div>

          <div className={styles.emailFormRow}>
            <label htmlFor="notif-type" className={styles.emailFormLabel}>
              Type:
            </label>
            <select
              id="notif-type"
              value={notificationForm.type}
              onChange={(e) =>
                setNotificationForm((prev) => ({
                  ...prev,
                  type: e.target.value as "info" | "success" | "warning" | "error",
                }))
              }
              disabled={loading}
              className={styles.emailSelect}
            >
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div className={styles.emailFormRow}>
            <label htmlFor="notif-action-text" className={styles.emailFormLabel}>
              Action Button Text (Optional):
            </label>
            <input
              id="notif-action-text"
              type="text"
              value={notificationForm.actionText}
              onChange={(e) =>
                setNotificationForm((prev) => ({ ...prev, actionText: e.target.value }))
              }
              placeholder="e.g., View Details"
              className={styles.input}
              disabled={loading}
            />
          </div>

          <div className={styles.emailFormRow}>
            <label htmlFor="notif-action-url" className={styles.emailFormLabel}>
              Action URL (Optional):
            </label>
            <input
              id="notif-action-url"
              type="url"
              value={notificationForm.actionUrl}
              onChange={(e) =>
                setNotificationForm((prev) => ({ ...prev, actionUrl: e.target.value }))
              }
              placeholder="https://..."
              className={styles.input}
              disabled={loading}
            />
          </div>

          <button
            onClick={sendNotification}
            disabled={loading || !emailStatus?.configured}
            className={styles.emailButton}
          >
            {loading ? "Sending..." : "Send Notification"}
          </button>
        </div>
      </div>

      {/* Available Templates */}
      <div className={styles.emailSection}>
        <h3>📋 Available Email Templates</h3>
        {templates.length > 0 ? (
          <div className={styles.templateGrid}>
            {templates.map((template) => (
              <div key={template.id} className={styles.templateCard}>
                <h4 className={styles.templateTitle}>{template.name}</h4>
                <p className={styles.templateDescription}>{template.description}</p>
                <div className={styles.templateFields}>
                  <strong>Fields:</strong> {template.fields.join(", ")}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.loadingText}>Loading templates...</p>
        )}
      </div>

      {/* Configuration Hint */}
      {!emailStatus?.configured && (
        <div className={styles.configNotice}>
          <h4 className={styles.configNoticeTitle}>⚙️ Email Configuration Required</h4>
          <p className={styles.configNoticeText}>
            To enable email functionality, configure the following environment variables in your
            backend:
            <br />
            <code className={styles.configCode}>
              SMTP_HOST=your-smtp-host
              <br />
              SMTP_PORT=587
              <br />
              SMTP_USER=your-email@domain.com
              <br />
              SMTP_PASS=your-password
              <br />
              SMTP_FROM=noreply@poolsafe.com
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
