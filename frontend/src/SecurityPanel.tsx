import React from "react";
import styles from "./App.module.css";

export default function SecurityPanel({ role }: { role: string }) {
  return (
    <div className={styles.card}>
      <h2>Security & Permissions</h2>
      <ul>
        <li>SSO (Outlook) enabled for all roles</li>
        <li>Encrypted storage for sensitive fields</li>
        <li>Role-based operational controls (admin/support/partner)</li>
        <li>Secure password/code management</li>
        <li>Audit logs and access tracking</li>
        <li>Granular permission management</li>
      </ul>
      {role === "admin" && (
        <div>Admin controls: user management, access revocation, audit log review</div>
      )}
      {role === "support" && (
        <div>Support controls: ticket/service access, operational actions</div>
      )}
      {role === "partner" && (
        <div>Partner controls: view own data, submit tickets, access knowledge base</div>
      )}
    </div>
  );
}
