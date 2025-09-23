import React, { useEffect, useState, createContext, useContext } from "react";
import styles from "./App.module.css";
import Login from "./Login";

// Example: get JWT from localStorage (replace with your auth logic)
function getJwt() {
  return localStorage.getItem("jwt") || "";
}

// Decode JWT payload (naive, for demo)
function decodeJwt(token: string): any {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

type User = {
  role?: string;
  name?: string;
};

const UserContext = createContext<User | null>(null);
function useUser() {
  return useContext(UserContext);
}

type Ticket = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
};

function escapeHtml(str: string) {
  return str.replace(/[&<>'"/]/g, function (s) {
    const entity: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
      "/": "&#x2F;",
    };
    return entity[s] || s;
  });
}

function TicketForm({ onCreated }: { onCreated: () => void }) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function validateInput(subj: string, desc: string) {
    if (!subj.trim()) return "Subject is required.";
    if (subj.length > 100) return "Subject too long (max 100 chars).";
    if (desc.length > 1000) return "Description too long (max 1000 chars).";
    // Add more rules as needed
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const validationError = validateInput(subject, description);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      const jwt = getJwt();
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify({ partnerId: "demo-partner", subject, description }),
      });
      if (!res.ok) {
        let msg = "Failed to submit ticket. Please try again.";
        try {
          const err = await res.json();
          if (err && err.message) msg = err.message;
        } catch {}
        setError(msg);
        return;
      }
      setSubject("");
      setDescription("");
      onCreated();
    } catch (err: any) {
      setError(err?.message || "Network error. Please try again.");
    }
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      {error && <div className={styles.error}>{error}</div>}
      <div>
        <label htmlFor="subject">Subject</label>
        <br />
        <input
          id="subject"
          className={styles.input}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          maxLength={100}
          title="Enter the subject of your ticket"
          placeholder="Subject"
        />
      </div>
      <div>
        <label htmlFor="description">Description</label>
        <br />
        <textarea
          id="description"
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          title="Describe your issue"
          placeholder="Description"
        />
      </div>
      <button type="submit">Submit Ticket</button>
    </form>
  );
}

function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  async function load() {
    try {
      const jwt = getJwt();
      const res = await fetch("/api/tickets", {
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
      });
      if (!res.ok) {
        // Optionally handle error (e.g., show message)
        return;
      }
      const data = await res.json();
      setTickets(data);
    } catch {
      // Optionally handle network error
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h3>Tickets</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Subject</th>
            <th className={styles.th}>Status</th>
            <th className={styles.th}>Created</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td className={styles.td}>{escapeHtml(t.subject)}</td>
              <td className={styles.td}>{escapeHtml(t.status)}</td>
              <td className={styles.td}>{new Date(t.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

  const [jwt, setJwt] = useState(getJwt());
  const [reload, setReload] = useState(0);
  const user = decodeJwt(jwt) || {};

  function handleLogin(newJwt: string) {
    localStorage.setItem("jwt", newJwt);
    setJwt(newJwt);
  }

  if (!jwt) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <UserContext.Provider value={user}>
      <div className={styles.layout}>
        <header>
          <h1 className={styles.headerTitle}>LounGenie Support Portal (Scaffold)</h1>
          <p className={styles.headerMuted}>Demo seed data & ticket submission</p>
        </header>
        <div className={styles.card}>
          {/* Only partners can submit tickets */}
          {user.role === "partner" ? (
            <TicketForm onCreated={() => setReload((r) => r + 1)} />
          ) : (
            <div className={styles.info} role="status" aria-live="polite">
              Ticket submission is only available to partners.
            </div>
          )}
        </div>
        <div className={styles.card}>
          <TicketList key={reload} />
        </div>
      </div>
    </UserContext.Provider>
  );
}
