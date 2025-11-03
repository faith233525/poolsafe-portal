import React from "react";
import Sidebar from "./Sidebar";
import Header from "./components/Header";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./theme.css";
import styles from "./App.module.css";
import Login from "./Login";
import TicketForm from "./TicketForm";
import TicketList from "./TicketList";
import AccessibilitySettings from "./components/AccessibilitySettings";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
// import AdminPanel from "./components/AdminPanel";
import { GlobalErrorBoundary } from "./components/ErrorHandling";
// import NotFoundPage from "./pages/NotFoundPage";
import { pwaManager } from "./utils/pwa";
import "./styles/accessibility.css";
import "./styles/pwa.css";
import FeedbackForm from "./FeedbackForm";

function getJwt() {
  return localStorage.getItem("jwt") || "";
}

function decodeJwt(token: string): any {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    // Decode base64url (JWT) payload safely
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
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
  const [showAccessibilitySettings, setShowAccessibilitySettings] = React.useState(false);
  const [activeView, setActiveView] = React.useState("tickets");
  const user = decodeJwt(jwt) || {};

  React.useEffect(() => {
    // Initialize PWA features
    pwaManager.cacheImportantData();
  }, []);

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

  function handleLogout() {
    localStorage.removeItem("jwt");
    setJwt("");
  }

  if (!jwt) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <GlobalErrorBoundary>
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
          <Header
            user={user}
            onLogout={handleLogout}
            onAccessibilitySettings={() => setShowAccessibilitySettings(true)}
          />

          <div className={styles.mainContent}>
            {/* Sidebar navigation for all roles */}
            {user.role && (
              <Sidebar
                role={user.role.toLowerCase() as "admin" | "support" | "partner"}
                onNavigate={setActiveView}
                activeView={activeView}
              />
            )}

            {/* Main content area */}
            <div className={styles.contentArea}>
              {activeView === "dashboard" && (user.role === "ADMIN" || user.role === "SUPPORT") ? (
                <AnalyticsDashboard />
              ) : activeView === "tickets" || activeView === "dashboard" ? (
                <>
                  <div className={styles.card}>
                    {/* Only partners can submit tickets */}
                    {user.role?.toLowerCase() === "partner" ? (
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
                  {/* Feedback Form for all users */}
                  <div className={styles.card}>
                    <FeedbackForm />
                  </div>
                </>
              ) : (
                <div className={styles.info} role="status" aria-live="polite">
                  Feature coming soon.
                </div>
              )}
            </div>
          </div>

          {/* Accessibility Settings Modal */}
          <AccessibilitySettings
            isOpen={showAccessibilitySettings}
            onClose={() => setShowAccessibilitySettings(false)}
          />

          {/* PWA Install Button */}
          <button
            id="pwa-install-button"
            onClick={() => pwaManager.installApp()}
            aria-label="Install Pool Safe Inc Portal as an app"
          >
            Install App
          </button>

          {/* Connection Status */}
          <div id="connection-status" aria-live="polite"></div>

          {/* Skip to main content target */}
          <div id="main-content" tabIndex={-1} className={styles.mainContentTarget}></div>
        </div>
      </UserContext.Provider>
    </GlobalErrorBoundary>
  );
}

export default App;
