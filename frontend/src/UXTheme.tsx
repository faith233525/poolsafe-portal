import React from "react";
import styles from "./App.module.css";

export default function UXTheme() {
  return (
    <div className={styles.card}>
      <h2>Portal Theme Preview</h2>
      <div className={styles.themePreview}>
        <div className={styles.primary}>Primary Color</div>
        <div className={styles.secondary}>Secondary Color</div>
        <div className={styles.accent}>Accent</div>
        <div className={styles.status}>Status Indicator</div>
        <div className={styles.darkMode}>Dark Mode Preview</div>
      </div>
      <div className={styles.typography}>
        <h3>Typography</h3>
        <p>Body text example. Responsive layout, tooltips, and palette applied.</p>
      </div>
    </div>
  );
}
