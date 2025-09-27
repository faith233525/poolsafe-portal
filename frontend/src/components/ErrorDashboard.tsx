/* eslint-disable-next-line max-len */
/* eslint-disable react/forbid-dom-props */
import React, { useState, useEffect } from "react";
import {
  getErrorReports,
  getStoredErrors,
  clearErrors,
  exportErrors,
} from "../utils/errorTracking";
import "../styles/error-dashboard.css";

interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  context: any;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

const ErrorDashboard: React.FC = () => {
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [sortBy, setSortBy] = useState<"count" | "lastSeen" | "severity">("count");
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadErrors();

    // Refresh errors every 30 seconds
    const interval = setInterval(loadErrors, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadErrors = () => {
    const currentErrors = getErrorReports();
    const storedErrors = getStoredErrors();

    // Combine and deduplicate errors
    const allErrors = [...currentErrors, ...storedErrors];
    const uniqueErrors = allErrors.reduce((acc, error) => {
      const existing = acc.find((e) => e.id === error.id);
      if (existing) {
        existing.count += error.count;
        if (new Date(error.lastSeen) > new Date(existing.lastSeen)) {
          existing.lastSeen = error.lastSeen;
        }
      } else {
        acc.push({ ...error });
      }
      return acc;
    }, [] as ErrorReport[]);

    setErrors(uniqueErrors);
  };

  const getSeverity = (error: ErrorReport): "high" | "medium" | "low" => {
    if (error.context.severity) {
      return error.context.severity;
    }

    // Auto-determine severity
    if (error.count > 10 || error.message.toLowerCase().includes("critical")) {
      return "high";
    } else if (error.count > 5 || error.message.toLowerCase().includes("error")) {
      return "medium";
    } else {
      return "low";
    }
  };

  const filteredErrors = errors
    .filter((error) => {
      if (filter !== "all" && getSeverity(error) !== filter) {
        return false;
      }

      if (searchTerm) {
        return (
          error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          error.context.route?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "count":
          return b.count - a.count;
        case "lastSeen":
          return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
        case "severity": {
          const severityOrder = { high: 3, medium: 2, low: 1 };
          return severityOrder[getSeverity(b)] - severityOrder[getSeverity(a)];
        }
        default:
          return 0;
      }
    });

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all error reports?")) {
      clearErrors();
      setErrors([]);
      setSelectedError(null);
    }
  };

  const handleExport = () => {
    const data = exportErrors();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "#dc3545";
      case "medium":
        return "#ffc107";
      case "low":
        return "#28a745";
      default:
        return "#6c757d";
    }
  };

  return (
    <div className="error-dashboard">
      <div className="error-dashboard-header">
        <h1 className="error-dashboard-title">Error Dashboard</h1>
        <div className="error-dashboard-controls">
          <button onClick={loadErrors} className="error-dashboard-button">
            Refresh
          </button>
          <button onClick={handleExport} className="error-dashboard-button secondary">
            Export
          </button>
          <button onClick={handleClearAll} className="error-dashboard-button danger">
            Clear All
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="filter-section">
        <input
          type="text"
          placeholder="Search errors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="filter-input"
        />

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="filter-select"
          aria-label="Filter by severity level"
        >
          <option value="all">All Severities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="filter-select"
          aria-label="Sort errors by"
        >
          <option value="count">Sort by Count</option>
          <option value="lastSeen">Sort by Last Seen</option>
          <option value="severity">Sort by Severity</option>
        </select>

        <span className="filter-status">
          {filteredErrors.length} of {errors.length} errors
        </span>
      </div>

      {/* Error Summary Cards */}
      <div className="summary-cards-grid">
        {["high", "medium", "low"].map((severity) => {
          const count = errors.filter((e) => getSeverity(e) === severity).length;
          return (
            <div
              key={severity}
              style={{
                padding: "1rem",
                background: "white",
                border: `2px solid ${getSeverityColor(severity)}`,
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: getSeverityColor(severity),
                }}
              >
                {count}
              </div>
              <div
                style={{
                  textTransform: "capitalize",
                  color: "#6c757d",
                }}
              >
                {severity} Priority
              </div>
            </div>
          );
        })}
      </div>

      {/* Error List */}
      <div className="main-content">
        <div className="content-flex-1">
          <h3 className="section-header">Error Reports</h3>

          {filteredErrors.length === 0 ? (
            <div className="chart-container">
              {errors.length === 0 ? "No errors found!" : "No errors match your filters."}
            </div>
          ) : (
            <div className="error-list-container">
              {filteredErrors.map((error) => {
                const severity = getSeverity(error);
                const isSelected = selectedError?.id === error.id;

                return (
                  <div
                    key={error.id}
                    onClick={() => setSelectedError(error)}
                    style={{
                      padding: "1rem",
                      background: isSelected ? "#e3f2fd" : "white",
                      border: `1px solid ${isSelected ? "#2196f3" : "#dee2e6"}`,
                      borderRadius: "8px",
                      cursor: "pointer",
                      borderLeft: `4px solid ${getSeverityColor(severity)}`,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "start",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "bold",
                          color: "#212529",
                          flex: 1,
                          marginRight: "1rem",
                        }}
                      >
                        {error.message}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            background: getSeverityColor(severity),
                            color: "white",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            textTransform: "uppercase",
                          }}
                        >
                          {severity}
                        </span>

                        <span
                          style={{
                            background: "#6c757d",
                            color: "white",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                          }}
                        >
                          {error.count}x
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        fontSize: "0.875rem",
                        color: "#6c757d",
                      }}
                    >
                      {error.context.route && <span>Route: {error.context.route}</span>}
                      <span>Last seen: {formatDate(error.lastSeen)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Error Details Panel */}
        {selectedError && (
          <div
            style={{
              width: "400px",
              background: "white",
              border: "1px solid #dee2e6",
              borderRadius: "8px",
              padding: "1.5rem",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: "1rem",
                color: "#495057",
              }}
            >
              Error Details
            </h3>

            <div style={{ marginBottom: "1rem" }}>
              <strong>Message:</strong>
              <div
                style={{
                  background: "#f8f9fa",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  marginTop: "0.25rem",
                  wordBreak: "break-word",
                }}
              >
                {selectedError.message}
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <strong>Occurrences:</strong> {selectedError.count}
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <strong>First Seen:</strong> {formatDate(selectedError.firstSeen)}
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <strong>Last Seen:</strong> {formatDate(selectedError.lastSeen)}
            </div>

            {selectedError.context.route && (
              <div style={{ marginBottom: "1rem" }}>
                <strong>Route:</strong> {selectedError.context.route}
              </div>
            )}

            {selectedError.context.userId && (
              <div style={{ marginBottom: "1rem" }}>
                <strong>User ID:</strong> {selectedError.context.userId}
              </div>
            )}

            {selectedError.context.type && (
              <div style={{ marginBottom: "1rem" }}>
                <strong>Type:</strong> {selectedError.context.type}
              </div>
            )}

            {selectedError.stack && (
              <div style={{ marginBottom: "1rem" }}>
                <strong>Stack Trace:</strong>
                <pre
                  style={{
                    background: "#2d3748",
                    color: "#e2e8f0",
                    padding: "0.75rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    overflow: "auto",
                    marginTop: "0.25rem",
                    maxHeight: "200px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {selectedError.stack}
                </pre>
              </div>
            )}

            {selectedError.context.metadata && (
              <div>
                <strong>Additional Info:</strong>
                <pre
                  style={{
                    background: "#f8f9fa",
                    padding: "0.75rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    marginTop: "0.25rem",
                    maxHeight: "150px",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {JSON.stringify(selectedError.context.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorDashboard;
