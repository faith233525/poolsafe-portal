// Accessibility utilities for Pool Safe Inc Portal
// Implements WCAG 2.1 AA compliance features

export interface AccessibilityPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  screenReader: boolean;
  largeText: boolean;
  colorBlindness: string | null;
}

export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private preferences: AccessibilityPreferences;
  private focusHistory: HTMLElement[] = [];
  private skipLinkTarget: HTMLElement | null = null;

  private constructor() {
    this.preferences = this.loadPreferences();
    this.init();
  }

  public static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  private init(): void {
    // In non-browser testing/SSR contexts, window/document may be undefined
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    this.setupSkipLinks();
    this.setupFocusManagement();
    this.setupKeyboardNavigation();
    this.setupScreenReaderSupport();
    this.setupMotionPreferences();
    this.setupContrastPreferences();
    this.setupFontSizePreferences();
    this.announcePageChanges();
  }

  // Skip Links Implementation
  private setupSkipLinks(): void {
    const skipLinks = document.createElement("nav");
    skipLinks.className = "skip-links";
    skipLinks.setAttribute("aria-label", "Skip navigation");

    skipLinks.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#primary-navigation" class="skip-link">Skip to navigation</a>
      <a href="#search" class="skip-link">Skip to search</a>
    `;

    // Insert skip links at the beginning of body
    document.body.insertBefore(skipLinks, document.body.firstChild);

    // Handle skip link clicks
    skipLinks.addEventListener("click", (event) => {
      const target = event.target as HTMLAnchorElement;
      const href = target.getAttribute("href");

      if (href && href.startsWith("#")) {
        const targetElement = document.querySelector(href);
        if (targetElement) {
          this.focusElement(targetElement as HTMLElement);
        }
      }
    });
  }

  // Focus Management
  private setupFocusManagement(): void {
    // Track focus history for modal/dialog management
    document.addEventListener("focusin", (event) => {
      const target = event.target as HTMLElement;
      if (target && !target.closest(".modal, .dialog")) {
        this.focusHistory.push(target);
        // Keep history manageable
        if (this.focusHistory.length > 10) {
          this.focusHistory.shift();
        }
      }
    });

    // Handle escape key for modals
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.handleEscapeKey(event);
      }
    });
  }

  // Keyboard Navigation
  private setupKeyboardNavigation(): void {
    // Arrow key navigation for menus and lists
    document.addEventListener("keydown", (event) => {
      const target = event.target as HTMLElement;

      if (
        target.getAttribute("role") === "menuitem" ||
        target.closest('[role="menu"], [role="listbox"], [role="tablist"]')
      ) {
        this.handleArrowKeyNavigation(event);
      }
    });

    // Tab trap for modals
    document.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        const modal = document.querySelector(".modal:not([hidden])");
        if (modal) {
          this.trapFocus(event, modal as HTMLElement);
        }
      }
    });
  }

  // Screen Reader Support
  private setupScreenReaderSupport(): void {
    // Create live region for announcements
    const liveRegion = document.createElement("div");
    liveRegion.id = "live-region";
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    liveRegion.className = "sr-only";
    document.body.appendChild(liveRegion);

    // Create alert region for urgent announcements
    const alertRegion = document.createElement("div");
    alertRegion.id = "alert-region";
    alertRegion.setAttribute("aria-live", "assertive");
    alertRegion.setAttribute("aria-atomic", "true");
    alertRegion.className = "sr-only";
    document.body.appendChild(alertRegion);
  }

  // Motion Preferences
  private setupMotionPreferences(): void {
    if (typeof window === "undefined") return;
    const mq =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const reducedMotion = (mq?.matches ?? false) || this.preferences.reducedMotion;

    if (reducedMotion) {
      document.documentElement.classList.add("reduce-motion");
      this.updatePreference("reducedMotion", true);
    }

    // Listen for system preference changes
    mq?.addEventListener?.("change", (e) => {
      if (e.matches) {
        document.documentElement.classList.add("reduce-motion");
        this.updatePreference("reducedMotion", true);
      } else {
        document.documentElement.classList.remove("reduce-motion");
        this.updatePreference("reducedMotion", false);
      }
    });
  }

  // Contrast Preferences
  private setupContrastPreferences(): void {
    if (typeof window === "undefined") return;
    const mq =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-contrast: high)")
        : null;
    const highContrast = (mq?.matches ?? false) || this.preferences.highContrast;

    if (highContrast) {
      document.documentElement.classList.add("high-contrast");
      this.updatePreference("highContrast", true);
    }

    // Listen for system preference changes
    mq?.addEventListener?.("change", (e) => {
      if (e.matches) {
        document.documentElement.classList.add("high-contrast");
        this.updatePreference("highContrast", true);
      } else {
        document.documentElement.classList.remove("high-contrast");
        this.updatePreference("highContrast", false);
      }
    });
  }

  // Font Size Preferences
  private setupFontSizePreferences(): void {
    if (this.preferences.largeText) {
      document.documentElement.classList.add("large-text");
    }
  }

  // Page Change Announcements
  private announcePageChanges(): void {
    if (
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      typeof MutationObserver === "undefined"
    )
      return;
    // Announce route changes for SPAs
    let currentPath = window.location.pathname;

    let observer: MutationObserver | null = null;
    try {
      observer = new MutationObserver(() => {
        if (typeof window === "undefined" || typeof document === "undefined") return;
        if (window.location.pathname !== currentPath) {
          currentPath = window.location.pathname;
          const title = document.title;
          this.announce(`Navigated to ${title}`, "polite");
        }
      });
    } catch {
      // In some jsdom versions, MutationObserver may not behave as expected; skip announcements.
      return;
    }

    if (observer && document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  // Public Methods

  // Announce to screen readers
  public announce(message: string, priority: "polite" | "assertive" = "polite"): void {
    if (typeof document === "undefined") return;
    const regionId = priority === "assertive" ? "alert-region" : "live-region";
    const region = document.getElementById(regionId);

    if (region) {
      // Clear and set message
      region.textContent = "";
      setTimeout(() => {
        region.textContent = message;
      }, 100);

      // Clear after announcement
      setTimeout(() => {
        region.textContent = "";
      }, 5000);
    }
  }

  // Focus element with proper handling
  public focusElement(element: HTMLElement): void {
    if (!element.hasAttribute("tabindex") && !this.isFocusable(element)) {
      element.setAttribute("tabindex", "-1");
    }

    element.focus();

    // Scroll element into view if needed
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Open modal with proper accessibility
  public openModal(modalElement: HTMLElement): void {
    // Store current focus
    const currentFocus = document.activeElement as HTMLElement;
    if (currentFocus) {
      this.focusHistory.push(currentFocus);
    }

    // Set modal attributes
    modalElement.setAttribute("role", "dialog");
    modalElement.setAttribute("aria-modal", "true");

    // Find and set aria-labelledby if title exists
    const title = modalElement.querySelector("h1, h2, h3, .modal-title");
    if (title && !title.id) {
      title.id = `modal-title-${Date.now()}`;
    }
    if (title) {
      modalElement.setAttribute("aria-labelledby", title.id);
    }

    // Show modal and focus first focusable element
    modalElement.removeAttribute("hidden");
    modalElement.style.display = "block";

    const firstFocusable = this.getFirstFocusableElement(modalElement);
    if (firstFocusable) {
      this.focusElement(firstFocusable);
    }

    // Announce modal opening
    const titleText = title?.textContent || "Modal dialog opened";
    this.announce(titleText, "assertive");
  }

  // Close modal with proper cleanup
  public closeModal(modalElement: HTMLElement): void {
    modalElement.setAttribute("hidden", "");
    modalElement.style.display = "none";

    // Restore focus to previous element
    const previousFocus = this.focusHistory.pop();
    if (previousFocus && document.contains(previousFocus)) {
      this.focusElement(previousFocus);
    }

    this.announce("Modal closed", "polite");
  }

  // Update accessibility preferences
  public updatePreference<K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K],
  ): void {
    this.preferences[key] = value;
    this.savePreferences();
    this.applyPreferences();
  }

  // Get current preferences
  public getPreferences(): AccessibilityPreferences {
    return { ...this.preferences };
  }

  // Add accessible loading state
  public setLoadingState(element: HTMLElement, loading: boolean, loadingText = "Loading..."): void {
    if (typeof document === "undefined") return;
    if (loading) {
      element.setAttribute("aria-busy", "true");
      element.setAttribute("aria-describedby", "loading-description");

      let loadingDesc = document.getElementById("loading-description");
      if (!loadingDesc) {
        loadingDesc = document.createElement("div");
        loadingDesc.id = "loading-description";
        loadingDesc.className = "sr-only";
        document.body.appendChild(loadingDesc);
      }
      loadingDesc.textContent = loadingText;
    } else {
      element.removeAttribute("aria-busy");
      element.removeAttribute("aria-describedby");

      const loadingDesc = document.getElementById("loading-description");
      if (loadingDesc) {
        loadingDesc.remove();
      }
    }
  }

  // Form validation accessibility
  public setFormFieldError(fieldElement: HTMLElement, errorMessage: string): void {
    const fieldId = fieldElement.id || `field-${Date.now()}`;
    fieldElement.id = fieldId;

    const errorId = `${fieldId}-error`;
    let errorElement = document.getElementById(errorId);

    if (!errorElement) {
      errorElement = document.createElement("div");
      errorElement.id = errorId;
      errorElement.className = "field-error";
      errorElement.setAttribute("role", "alert");
      fieldElement.parentNode?.insertBefore(errorElement, fieldElement.nextSibling);
    }

    errorElement.textContent = errorMessage;
    fieldElement.setAttribute("aria-describedby", errorId);
    fieldElement.setAttribute("aria-invalid", "true");

    // Announce error
    this.announce(
      `Error in ${fieldElement.getAttribute("aria-label") || "field"}: ${errorMessage}`,
      "assertive",
    );
  }

  // Clear form field error
  public clearFormFieldError(fieldElement: HTMLElement): void {
    const fieldId = fieldElement.id;
    const errorId = `${fieldId}-error`;
    const errorElement = document.getElementById(errorId);

    if (errorElement) {
      errorElement.remove();
    }

    fieldElement.removeAttribute("aria-describedby");
    fieldElement.removeAttribute("aria-invalid");
  }

  // Private Helper Methods

  private loadPreferences(): AccessibilityPreferences {
    if (typeof localStorage === "undefined") {
      return {
        reducedMotion: false,
        highContrast: false,
        screenReader: false,
        largeText: false,
        colorBlindness: null,
      };
    }
    const stored = localStorage.getItem("accessibility-preferences");
    return stored
      ? JSON.parse(stored)
      : {
          reducedMotion: false,
          highContrast: false,
          screenReader: false,
          largeText: false,
          colorBlindness: null,
        };
  }

  private savePreferences(): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem("accessibility-preferences", JSON.stringify(this.preferences));
  }

  private applyPreferences(): void {
    document.documentElement.classList.toggle("reduce-motion", this.preferences.reducedMotion);
    document.documentElement.classList.toggle("high-contrast", this.preferences.highContrast);
    document.documentElement.classList.toggle("large-text", this.preferences.largeText);

    if (this.preferences.colorBlindness) {
      document.documentElement.setAttribute(
        "data-color-blindness",
        this.preferences.colorBlindness,
      );
    }
  }

  private isFocusable(element: HTMLElement): boolean {
    const focusableSelectors = [
      "a[href]",
      "button",
      "input",
      "textarea",
      "select",
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ];

    return (
      focusableSelectors.some((selector) => element.matches(selector)) &&
      !element.hasAttribute("disabled") &&
      element.offsetParent !== null
    );
  }

  private getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
    const focusableElements = container.querySelectorAll(
      'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
    );

    return (focusableElements[0] as HTMLElement) || null;
  }

  private getLastFocusableElement(container: HTMLElement): HTMLElement | null {
    const focusableElements = container.querySelectorAll(
      'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
    );

    return (focusableElements[focusableElements.length - 1] as HTMLElement) || null;
  }

  private trapFocus(event: KeyboardEvent, container: HTMLElement): void {
    const focusableElements = container.querySelectorAll(
      'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
    );

    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  }

  private handleArrowKeyNavigation(event: KeyboardEvent): void {
    const { key } = event;
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) return;

    event.preventDefault();

    const currentElement = event.target as HTMLElement;
    const container = currentElement.closest('[role="menu"], [role="listbox"], [role="tablist"]');

    if (!container) return;

    const items = Array.from(
      container.querySelectorAll('[role="menuitem"], [role="option"], [role="tab"]'),
    );
    const currentIndex = items.indexOf(currentElement);

    let nextIndex: number;

    if (key === "ArrowDown" || key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % items.length;
    } else {
      nextIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
    }

    (items[nextIndex] as HTMLElement).focus();
  }

  private handleEscapeKey(_event: KeyboardEvent): void {
    // Close any open modals, menus, or popups
    const openModal = document.querySelector(".modal:not([hidden])");
    const openMenu = document.querySelector('.menu[aria-expanded="true"]');
    const openPopup = document.querySelector(".popup:not([hidden])");

    if (openModal) {
      this.closeModal(openModal as HTMLElement);
    } else if (openMenu) {
      (openMenu as HTMLElement).setAttribute("aria-expanded", "false");
      const trigger = document.querySelector(`[aria-controls="${openMenu.id}"]`) as HTMLElement;
      if (trigger) {
        this.focusElement(trigger);
      }
    } else if (openPopup) {
      (openPopup as HTMLElement).setAttribute("hidden", "");
    }
  }
}

// Export singleton instance
export const accessibilityManager = AccessibilityManager.getInstance();

// Initialize accessibility features when DOM is ready
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      accessibilityManager.announce("Pool Safe Inc Portal loaded", "polite");
    });
  } else {
    accessibilityManager.announce("Pool Safe Inc Portal loaded", "polite");
  }
}
