import React from "react";
import styles from "./App.module.css";

export default function SummaryFlow({ role: _role }: { role: string }) {
  return (
    <div className={styles.card}>
      <h2>End-to-End Portal Flow</h2>
      <ol>
        <li>Login via SSO or local account</li>
        <li>Dashboard: role-based navigation (admin/support/partner)</li>
        <li>Partner management: view/edit/add partners</li>
        <li>Ticketing: create, filter, update, analytics</li>
        <li>Service logs: schedule, assign, track, analyze</li>
        <li>Calendar: view events, maintenance, training</li>
        <li>Knowledge base: search, view, feedback, videos</li>
        <li>Map: view partners, filter, tooltip, integration</li>
        <li>Notifications: real-time, email, integrations</li>
        <li>Security: permissions, audit, controls</li>
        <li>Reporting: analytics, export, summary</li>
      </ol>
      <div>All flows are role-based and integrated for seamless portal experience.</div>
    </div>
  );
}
