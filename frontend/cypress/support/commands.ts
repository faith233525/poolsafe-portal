// Cypress types are available via global in test runtime
// Declare Cypress to avoid TS namespace runtime usage errors
// eslint-disable-next-line no-var
declare var Cypress: any;

// Real login helper: calls backend auth endpoints and stores JWT in localStorage
function apiLogin(username: string, password: string) {
  const isEmail = username.includes("@");
  const endpoint = isEmail ? "/api/auth/login" : "/api/auth/login/partner";
  // Prefer Cypress env if provided to point at backend base
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const base = (Cypress.env && Cypress.env("API_BASE")) || "http://localhost:4000";
  const attempt = (retries = 2): any =>
    (cy as any)
      .request({
        method: "POST",
        url: `${base}${endpoint}`,
        headers: { "x-bypass-ratelimit": "true" },
        body: { username, password },
        failOnStatusCode: false,
      })
      .then((resp: any) => {
        if (![200, 201].includes(resp.status)) {
          if (retries > 0 && (resp.status === 401 || resp.status === 429 || resp.status === 503)) {
            // Brief backoff then retry
            return (cy as any).wait(200).then(() => attempt(retries - 1));
          }
          throw new Error(`Login failed: ${resp.status}`);
        }
        const token = resp.body?.token as string;
        if (!token) throw new Error("No token returned from login");
        // Save token for app to pick up
        window.localStorage.setItem("jwt", token);
        return token;
      });

  return attempt();
}

Cypress.Commands.add("loginAs", (role: string) => {
  // Map roles to credentials aligned with backend seed
  const creds: Record<string, { username: string; password: string }> = {
    admin: { username: "admin@poolsafe.com", password: "admin123" },
    support: { username: "support@poolsafe.com", password: "LounGenie123!!" },
    partner: { username: "Test Resort 1", password: "partner123" },
  };
  const c = creds[role] || creds.partner;
  return apiLogin(c.username, c.password).then(() => {
    // Visit app root after setting JWT
    cy.visit("/");
  });
});
