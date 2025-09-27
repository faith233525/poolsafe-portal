import React, { useState, useEffect } from "react";
import { accessibilityManager, AccessibilityPreferences } from "../utils/accessibility";
import "./AccessibilitySettings.css";

interface AccessibilitySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({ isOpen, onClose }) => {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    reducedMotion: false,
    highContrast: false,
    screenReader: false,
    largeText: false,
    colorBlindness: null,
  });

  useEffect(() => {
    setPreferences(accessibilityManager.getPreferences());
  }, []);

  const handlePreferenceChange = (key: keyof AccessibilityPreferences, value: any) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    accessibilityManager.updatePreference(key, value);
  };

  const resetToDefaults = () => {
    const defaults: AccessibilityPreferences = {
      reducedMotion: false,
      highContrast: false,
      screenReader: false,
      largeText: false,
      colorBlindness: null,
    };

    Object.entries(defaults).forEach(([key, value]) => {
      accessibilityManager.updatePreference(key as keyof AccessibilityPreferences, value);
    });

    setPreferences(defaults);
    accessibilityManager.announce("Accessibility settings reset to defaults", "polite");
  };

  useEffect(() => {
    if (isOpen) {
      accessibilityManager.announce("Accessibility settings opened", "polite");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="accessibility-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-title"
    >
      <div className="accessibility-modal">
        <header className="accessibility-header">
          <h2 id="accessibility-title">Accessibility Settings</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close accessibility settings"
          >
            ×
          </button>
        </header>

        <div className="accessibility-content">
          <section className="settings-section">
            <h3>Visual Preferences</h3>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={preferences.highContrast}
                  onChange={(e) => handlePreferenceChange("highContrast", e.target.checked)}
                  aria-describedby="high-contrast-desc"
                />
                <span className="checkmark"></span>
                High Contrast Mode
              </label>
              <p id="high-contrast-desc" className="setting-description">
                Increases contrast between text and background for better readability
              </p>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={preferences.largeText}
                  onChange={(e) => handlePreferenceChange("largeText", e.target.checked)}
                  aria-describedby="large-text-desc"
                />
                <span className="checkmark"></span>
                Large Text
              </label>
              <p id="large-text-desc" className="setting-description">
                Increases font size throughout the application
              </p>
            </div>

            <div className="setting-item">
              <label htmlFor="colorblind-select" className="setting-label-block">
                Color Blindness Support
              </label>
              <select
                id="colorblind-select"
                value={preferences.colorBlindness || ""}
                onChange={(e) => handlePreferenceChange("colorBlindness", e.target.value || null)}
                aria-describedby="colorblind-desc"
                className="setting-select"
              >
                <option value="">No color blindness adjustment</option>
                <option value="deuteranopia">Deuteranopia (Red-Green)</option>
                <option value="protanopia">Protanopia (Red-Green)</option>
                <option value="tritanopia">Tritanopia (Blue-Yellow)</option>
              </select>
              <p id="colorblind-desc" className="setting-description">
                Adjusts colors to be more distinguishable for different types of color blindness
              </p>
            </div>
          </section>

          <section className="settings-section">
            <h3>Motion Preferences</h3>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={preferences.reducedMotion}
                  onChange={(e) => handlePreferenceChange("reducedMotion", e.target.checked)}
                  aria-describedby="reduced-motion-desc"
                />
                <span className="checkmark"></span>
                Reduce Motion
              </label>
              <p id="reduced-motion-desc" className="setting-description">
                Minimizes animations and transitions that may cause discomfort
              </p>
            </div>
          </section>

          <section className="settings-section">
            <h3>Screen Reader</h3>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={preferences.screenReader}
                  onChange={(e) => handlePreferenceChange("screenReader", e.target.checked)}
                  aria-describedby="screen-reader-desc"
                />
                <span className="checkmark"></span>
                Screen Reader Optimizations
              </label>
              <p id="screen-reader-desc" className="setting-description">
                Enhances compatibility with screen reading software
              </p>
            </div>
          </section>

          <section className="settings-section">
            <h3>Keyboard Navigation</h3>
            <div className="info-box">
              <h4>Keyboard Shortcuts</h4>
              <ul className="keyboard-shortcuts">
                <li>
                  <kbd>Tab</kbd> - Navigate forward
                </li>
                <li>
                  <kbd>Shift + Tab</kbd> - Navigate backward
                </li>
                <li>
                  <kbd>Enter</kbd> or <kbd>Space</kbd> - Activate buttons
                </li>
                <li>
                  <kbd>Escape</kbd> - Close dialogs and menus
                </li>
                <li>
                  <kbd>Arrow Keys</kbd> - Navigate menus and lists
                </li>
              </ul>
            </div>
          </section>
        </div>

        <footer className="accessibility-footer">
          <button className="reset-button" onClick={resetToDefaults} type="button">
            Reset to Defaults
          </button>
          <button className="apply-button" onClick={onClose} type="button">
            Apply Settings
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AccessibilitySettings;
