// PWA utilities for Pool Safe Inc Portal
// Handles service worker registration, app installation, and offline detection

export interface PWAInstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export class PWAManager {
  private static instance: PWAManager;
  private installPrompt: PWAInstallEvent | null = null;
  private isOnline = navigator.onLine;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  private constructor() {
    this.init();
  }

  public static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager();
    }
    return PWAManager.instance;
  }

  private async init(): Promise<void> {
    // Register service worker
    await this.registerServiceWorker();

    // Set up PWA installation handling
    this.setupInstallHandling();

    // Set up online/offline detection
    this.setupOfflineDetection();

    // Set up push notifications
    this.setupPushNotifications();
  }

  // Service Worker Registration
  private async registerServiceWorker(): Promise<void> {
    if ("serviceWorker" in navigator) {
      try {
        // Use relative path/scope so it works when hosted in a subfolder (e.g., HostPapa)
        this.serviceWorkerRegistration = await navigator.serviceWorker.register("sw.js", {
          scope: "./",
        });

        console.log("[PWA] Service worker registered:", this.serviceWorkerRegistration);

        // Handle service worker updates
        this.serviceWorkerRegistration.addEventListener("updatefound", () => {
          const newWorker = this.serviceWorkerRegistration?.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                this.showUpdateNotification();
              }
            });
          }
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener("message", (event) => {
          console.log("[PWA] Message from service worker:", event.data);
        });
      } catch (error) {
        console.error("[PWA] Service worker registration failed:", error);
      }
    }
  }

  // PWA Installation Handling
  private setupInstallHandling(): void {
    window.addEventListener("beforeinstallprompt", (event: Event) => {
      event.preventDefault();
      this.installPrompt = event as PWAInstallEvent;
      this.showInstallButton();
    });

    window.addEventListener("appinstalled", () => {
      console.log("[PWA] App installed successfully");
      this.hideInstallButton();
      this.trackInstallation();
    });
  }

  // Online/Offline Detection
  private setupOfflineDetection(): void {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.showOnlineStatus();
      this.syncOfflineData();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      this.showOfflineStatus();
    });
  }

  // Push Notifications Setup
  private async setupPushNotifications(): Promise<void> {
    if ("Notification" in window && this.serviceWorkerRegistration) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        console.log("[PWA] Notification permission granted");
        await this.subscribeToPushNotifications();
      }
    }
  }

  // Public Methods

  // Install PWA
  public async installApp(): Promise<boolean> {
    if (!this.installPrompt) {
      console.log("[PWA] Install prompt not available");
      return false;
    }

    try {
      await this.installPrompt.prompt();
      const result = await this.installPrompt.userChoice;

      if (result.outcome === "accepted") {
        console.log("[PWA] User accepted installation");
        this.installPrompt = null;
        return true;
      } else {
        console.log("[PWA] User dismissed installation");
        return false;
      }
    } catch (error) {
      console.error("[PWA] Error during installation:", error);
      return false;
    }
  }

  // Check if app can be installed
  public canInstall(): boolean {
    return this.installPrompt !== null;
  }

  // Check online status
  public isAppOnline(): boolean {
    return this.isOnline;
  }

  // Update service worker
  public async updateServiceWorker(): Promise<void> {
    if (this.serviceWorkerRegistration) {
      await this.serviceWorkerRegistration.update();
    }
  }

  // Subscribe to push notifications
  public async subscribeToPushNotifications(): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      console.error("[PWA] Service worker not registered");
      return;
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          // Replace with your VAPID public key
          "YOUR_VAPID_PUBLIC_KEY_HERE",
        ).buffer as ArrayBuffer,
      });

      // Send subscription to backend
      await this.sendSubscriptionToServer(subscription);
      console.log("[PWA] Push notification subscription successful");
    } catch (error) {
      console.error("[PWA] Push notification subscription failed:", error);
    }
  }

  // Cache important data for offline use
  public async cacheImportantData(): Promise<void> {
    if (this.serviceWorkerRegistration) {
      this.serviceWorkerRegistration.active?.postMessage({
        type: "CACHE_URLS",
        urls: ["/api/auth/me", "/api/dashboard/stats", "/api/partners", "/api/tickets?limit=50"],
      });
    }
  }

  // Add to offline queue (for form submissions when offline)
  public async addToOfflineQueue(data: any, endpoint: string): Promise<void> {
    if (!this.isOnline) {
      try {
        const cache = await caches.open("offline-submissions");
        const request = new Request(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const response = new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        });

        await cache.put(request, response);
        console.log("[PWA] Data added to offline queue");

        // Register for background sync if available
        if ("serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
          await (this.serviceWorkerRegistration as any)?.sync?.register("ticket-submission");
        }
      } catch (error) {
        console.error("[PWA] Error adding to offline queue:", error);
      }
    }
  }

  // Private Helper Methods

  private showInstallButton(): void {
    const installButton = document.getElementById("pwa-install-button");
    if (installButton) {
      installButton.style.display = "block";
      installButton.addEventListener("click", () => this.installApp());
    }
  }

  private hideInstallButton(): void {
    const installButton = document.getElementById("pwa-install-button");
    if (installButton) {
      installButton.style.display = "none";
    }
  }

  private showUpdateNotification(): void {
    // Show a toast or modal to inform user of available update
    const updateMessage = document.createElement("div");
    updateMessage.className = "pwa-update-notification";
    updateMessage.innerHTML = `
      <div class="update-content">
        <span>A new version is available!</span>
        <button id="update-app" class="update-button">Update</button>
        <button id="dismiss-update" class="dismiss-button">Later</button>
      </div>
    `;

    document.body.appendChild(updateMessage);

    // Handle update button click
    document.getElementById("update-app")?.addEventListener("click", () => {
      if (this.serviceWorkerRegistration?.waiting) {
        this.serviceWorkerRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
        window.location.reload();
      }
    });

    // Handle dismiss button click
    document.getElementById("dismiss-update")?.addEventListener("click", () => {
      document.body.removeChild(updateMessage);
    });
  }

  private showOnlineStatus(): void {
    const statusElement = document.getElementById("connection-status");
    if (statusElement) {
      statusElement.className = "status-online";
      statusElement.textContent = "Online";
    }

    // Show success message
    this.showStatusMessage("Connection restored", "success");
  }

  private showOfflineStatus(): void {
    const statusElement = document.getElementById("connection-status");
    if (statusElement) {
      statusElement.className = "status-offline";
      statusElement.textContent = "Offline";
    }

    // Show warning message
    this.showStatusMessage("Working offline - Some features may be limited", "warning");
  }

  private showStatusMessage(message: string, type: "success" | "warning" | "error"): void {
    const statusMessage = document.createElement("div");
    statusMessage.className = `status-message ${type}`;
    statusMessage.textContent = message;

    document.body.appendChild(statusMessage);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(statusMessage)) {
        document.body.removeChild(statusMessage);
      }
    }, 5000);
  }

  private async syncOfflineData(): Promise<void> {
    // Trigger background sync for any pending data
    if (this.serviceWorkerRegistration) {
      try {
        await (this.serviceWorkerRegistration as any).sync?.register("ticket-submission");
        await (this.serviceWorkerRegistration as any).sync?.register("notification-read");
      } catch (error) {
        console.error("[PWA] Error registering background sync:", error);
      }
    }
  }

  private trackInstallation(): void {
    // Send installation analytics to backend
    fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "pwa_installed",
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }),
    }).catch((error) => console.error("[PWA] Error tracking installation:", error));
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("[PWA] Error sending subscription to server:", error);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }
}

// Export singleton instance
export const pwaManager = PWAManager.getInstance();

// Auto-initialize PWA features when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    pwaManager.cacheImportantData();
  });
} else {
  pwaManager.cacheImportantData();
}
