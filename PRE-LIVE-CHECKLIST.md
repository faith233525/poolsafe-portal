# Pre-Live Checklist (v1.3.1)

## 1. Version & Files
- [ ] Plugin header shows version 1.3.1
- [ ] `WHATS-NEW-v1.3.1.md` present
- [ ] README updated (bulk import, quick create, palette)

## 2. Required Pages
- [ ] Portal Page `[poolsafe_portal]`
- [ ] Login Page `[poolsafe_login]` (if separate)
- [ ] Knowledge Base `[poolsafe_kb]`
- [ ] Service Records `[poolsafe_service_records]`
- [ ] Tickets `[poolsafe_tickets]` (optional if portal consolidates)

## 3. Roles & Accounts
- [ ] Support user(s) have `psp_support`
- [ ] Test partner via Quick Create
- [ ] Import test (CSV + Excel) successful

## 4. Branding & Theme
- [ ] Colors inherit from Customizer
- [ ] Top Colour dropdown: Ice Blue, Classic Blue, Ducati Red, Yellow, Custom
- [ ] Welcome banner shows company, management company, units

## 5. Bulk Import
- [ ] CSV import works
- [ ] Excel import works
- [ ] Auto user creation works

## 6. Quick Create
- [ ] Partner post created
- [ ] User linked (`psp_partner_id`)

## 7. Visibility Rules
- [ ] Map hidden for partner role
- [ ] Lock info hidden for partners
- [ ] Full tickets & service records visible in profile (support)
- [ ] Filtered service records for partner own data

## 8. HubSpot (If Enabled)
- [ ] API key configured
- [ ] Partner sync test OK
- [ ] Ticket sync test OK

## 9. Security
- [ ] Nonces present in requests
- [ ] No sensitive lock codes shown to partner users

## 10. Final Smoke Test
- [ ] Partner login create ticket
- [ ] Support login bulk import & quick create
- [ ] Console error-free
- [ ] `/wp-json/poolsafe/v1/health` returns OK

Ready to launch when all items are checked.