import React, { Suspense } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styles from "./App.module.css";
import Login from "./Login";

const LazyTicketForm = React.lazy(() => import("./TicketForm"));
const LazyTicketList = React.lazy(() => import("./TicketList"));

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
          <Suspense fallback={<div className={styles.info}>Loading ticket form...</div>}>
            {user.role === "partner" ? (
              <LazyTicketForm onSubmit={() => setReload((r) => r + 1)} role={user.role} />
            ) : (
              <div className={styles.info} role="status" aria-live="polite">
                Ticket submission is only available to partners.
              </div>
            )}
          </Suspense>
        </div>
        <div className={styles.card}>
          <Suspense fallback={<div className={styles.info}>Loading tickets...</div>}>
            <LazyTicketList key={reload} />
          </Suspense>
        </div>
      </div>
    </UserContext.Provider>
  );
}

export default App;
