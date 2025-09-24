import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styles from "./App.module.css";
import Login from "./Login";
import TicketForm from "./TicketForm";
import TicketList from "./TicketList";

function getJwt() {
  return localStorage.getItem("jwt") || "";
}

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

const UserContext = React.createContext<User | null>(null);

function App() {
  const [jwt, setJwt] = React.useState(getJwt());
  const [reload, setReload] = React.useState(0);
  const user = decodeJwt(jwt) || {};

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "jwt") {
        setJwt(getJwt());
      }
    };
    window.addEventListener("storage", onStorage);
    const originalSetItem = localStorage.setItem;
    // Patch setItem so same-tab updates also refresh jwt-driven UI
    localStorage.setItem = function (key: string, value: string) {
      originalSetItem.call(localStorage, key, value);
      if (key === "jwt") {
        setJwt(getJwt());
      }
    };
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          aria-label="Notification messages"
        />
        <header>
          <h1 className={styles.headerTitle}>LounGenie Support Portal (Scaffold)</h1>
          <p className={styles.headerMuted}>Demo seed data & ticket submission</p>
        </header>
        <div className={styles.card}>
          {/* Only partners can submit tickets */}
          {user.role === "partner" ? (
            <TicketForm onSubmit={() => setReload((r) => r + 1)} role={user.role} />
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

export default App;
