## Security Policy

### Supported Versions
Currently supported: latest tagged release (v1.3.x). Older versions should be upgraded promptly.

### Reporting a Vulnerability
Email: security@poolsafeinc.com with subject: `PSP Vulnerability Report`.
Include:
1. Affected version
2. Reproduction steps
3. Expected vs actual behavior
4. Impact assessment

Please allow up to 5 business days for initial response.

### Handling & Disclosure
1. Triage & reproduce
2. Patch prepared in private branch
3. CVE (if applicable) requested
4. Coordinated release & public disclosure in `WHATS-NEW-vX.Y.Z.md`

### Secure Development Practices
- All dynamic output escaped with `esc_html`, `esc_attr`, `esc_url`
- Nonces & capability checks on state-changing actions
- Sanitization of lock info & user fields
- No secrets committed; Setup Wizard encrypts sensitive values
