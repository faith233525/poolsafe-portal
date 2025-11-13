# Integration Testing Plan - Pool Safe Portal v1.3.0

## Overview
This document provides a comprehensive testing checklist for all integrations and features in the Pool Safe Portal WordPress plugin.

---

## 1. Microsoft Outlook/Graph Integration

### 1.1 Configuration Check
- [ ] Navigate to **Pool Safe → Email** settings page
- [ ] Verify **Azure AD Tenant ID** is configured
- [ ] Verify **Client ID** is configured
- [ ] Verify **Client Secret** is configured (shows as password field)
- [ ] Check that **Redirect URI** matches Azure AD app registration:
  - Expected: `https://your-site.com/wp-admin/admin-post.php?action=psp_graph_oauth_callback`

### 1.2 User OAuth Connection
- [ ] Login as support agent (role: `psp_support`)
- [ ] Navigate to **Users → Your Profile**
- [ ] Locate **Microsoft Email (Send as your Outlook)** section
- [ ] Click **"Connect Microsoft"** button
- [ ] Verify redirect to Microsoft login
- [ ] Authenticate with Outlook account (e.g., `agent@poolsafeinc.com`)
- [ ] Verify redirect back to WordPress profile
- [ ] Confirm status shows: **"Your Microsoft account is connected"**
- [ ] Verify **"Disconnect Microsoft"** button appears

### 1.3 Email Sending Test
- [ ] Create a test ticket or use existing ticket
- [ ] Add a reply as connected support agent
- [ ] Verify email sends from agent's Outlook address
- [ ] Check recipient receives email
- [ ] Verify email headers show correct "From" address
- [ ] Check Sent Items in Outlook to confirm message was sent

### 1.4 Token Refresh Test
- [ ] Wait 60 minutes (or force token expiration in database)
- [ ] Send another email reply
- [ ] Verify automatic token refresh occurs
- [ ] Confirm email still sends successfully

**Troubleshooting:**
- If connection fails: Check Azure AD app permissions include `Mail.Send` and `offline_access`
- If redirect fails: Verify redirect URI in Azure AD matches exactly
- If token refresh fails: Check Client Secret hasn't expired in Azure AD

---

## 2. HubSpot CRM Integration

### 2.1 Configuration Check
- [ ] Navigate to **Pool Safe → HubSpot** settings page
- [ ] Verify **API Key** is configured (private app token)
- [ ] Verify **Portal ID** is set (e.g., `21854204`)
- [ ] Check **Auto-sync Partners** checkbox status
- [ ] Check **Auto-sync Tickets** checkbox status

### 2.2 Manual Partner Sync Test
- [ ] Navigate to **Partners → All Partners**
- [ ] Open an existing partner
- [ ] Click **"Sync to HubSpot"** button (or save partner with auto-sync enabled)
- [ ] Verify success message appears
- [ ] Login to HubSpot CRM
- [ ] Navigate to **Contacts**
- [ ] Search for partner by company name or email
- [ ] Verify contact exists with correct data:
  - First Name
  - Last Name
  - Email
  - Company Name
  - Phone

### 2.3 Auto-Sync Partner Test
- [ ] Enable **Auto-sync Partners** in settings
- [ ] Create a new partner in WordPress
- [ ] Save partner
- [ ] Check HubSpot within 30 seconds
- [ ] Verify contact automatically created
- [ ] Update partner details in WordPress
- [ ] Save again
- [ ] Verify HubSpot contact updates automatically

### 2.4 Ticket Sync Test
- [ ] Enable **Auto-sync Tickets** in settings
- [ ] Create a new ticket in WordPress
- [ ] Assign to partner
- [ ] Save ticket
- [ ] Check HubSpot **Deals** section
- [ ] Verify deal created with:
  - Deal Name: Ticket title
  - Amount: 0 or configured value
  - Associated Contact: Linked partner
  - Pipeline Stage: Based on ticket status

### 2.5 API Connection Test
- [ ] Use REST endpoint: `GET /wp-json/poolsafe/v1/hubspot/test-connection`
- [ ] Verify response shows successful connection
- [ ] Check for any error messages in response

**Troubleshooting:**
- If API fails: Verify private app has scopes: `crm.objects.contacts.write`, `crm.objects.deals.write`
- If sync fails: Check Portal ID matches HubSpot account
- If 401 errors: Regenerate API key in HubSpot

---

## 3. Email-to-Ticket System

### 3.1 IMAP Configuration
- [ ] Navigate to **Pool Safe → Email → Email-to-Ticket** tab
- [ ] Verify **IMAP Host** is configured (e.g., `outlook.office365.com`)
- [ ] Verify **IMAP Port** is 993 (SSL) or 143 (TLS)
- [ ] Verify **Email Address** for monitored inbox
- [ ] Verify **Password/App Password** is set
- [ ] Check **Auto-create Tickets** is enabled

### 3.2 Manual Fetch Test
- [ ] Send test email to monitored inbox
- [ ] Subject: "Test Ticket from Email"
- [ ] Body: "This is a test ticket created via email"
- [ ] Wait 1 minute
- [ ] Navigate to **Tickets → All Tickets**
- [ ] Verify new ticket appears with:
  - Title: Email subject
  - Content: Email body
  - Author: Matched partner or default
  - Status: New

### 3.3 WP-Cron Test
- [ ] Verify cron job is scheduled: `wp cron event list`
- [ ] Look for `psp_fetch_emails_cron`
- [ ] Wait for next scheduled run (default: 5 minutes)
- [ ] Send another test email
- [ ] Verify ticket auto-creates within 5 minutes

### 3.4 Reply Threading Test
- [ ] Send email with subject: `Re: [Ticket #123] Original Subject`
- [ ] Verify reply attaches to existing ticket #123
- [ ] Check ticket activity log shows email reply
- [ ] Verify reply doesn't create duplicate ticket

**Troubleshooting:**
- If no connection: Test IMAP credentials with email client first
- If no tickets created: Check WP-Cron is running (`wp cron event run psp_fetch_emails_cron`)
- If SSL errors: Verify IMAP port and encryption settings

---

## 4. Service Records & Pagination

### 4.1 Frontend Display Test
- [ ] Login as partner user
- [ ] Navigate to portal page (shortcode: `[psp_portal]`)
- [ ] Click **Service Records** tab
- [ ] Verify service records display in timeline format
- [ ] Check for **"Load more"** button at bottom

### 4.2 Pagination Test
- [ ] Create 15+ service records for test partner
- [ ] Reload portal page
- [ ] Verify initial load shows 10 records (default)
- [ ] Click **"Load more"** button
- [ ] Verify next 5 records append to timeline
- [ ] Check button disappears when all records loaded
- [ ] Verify no duplicate records appear

### 4.3 API Pagination Test
- [ ] Use REST endpoint: `GET /wp-json/poolsafe/v1/service-records?partner_id=123&page=1&per_page=5`
- [ ] Verify response includes:
  - `records`: Array of 5 records
  - `page`: 1
  - `per_page`: 5
  - `total`: Total record count
  - `total_pages`: Calculated pages
  - `has_more`: true/false

**Troubleshooting:**
- If pagination fails: Check browser console for JS errors
- If "Load more" doesn't work: Verify `PSP_PORTAL.api` is defined in page source
- If records duplicate: Clear browser cache and test again

---

## 5. SLA Tracking & Settings

### 5.1 Admin Configuration
- [ ] Navigate to **Pool Safe → SLA Settings**
- [ ] Verify threshold fields display:
  - Urgent: ___ hours (default: 4)
  - High: ___ hours (default: 8)
  - Medium: ___ hours (default: 24)
  - Low: ___ hours (default: 72)
- [ ] Set custom values (e.g., Urgent: 2, High: 6)
- [ ] Save settings
- [ ] Reload page and verify values persist

### 5.2 Overdue Calculation Test
- [ ] Create ticket with priority: **Urgent**
- [ ] Set created date to 3 hours ago (manually in database if needed)
- [ ] Navigate to **Tickets → All Tickets**
- [ ] Verify ticket shows **overdue indicator** (e.g., red badge)
- [ ] Check dashboard widget shows ticket in "Overdue" count

### 5.3 Frontend SLA Display
- [ ] Login as partner
- [ ] View **My Tickets** tab
- [ ] Verify each ticket shows:
  - Priority badge (color-coded)
  - Time remaining or "Overdue" text
  - SLA deadline based on configured thresholds

### 5.4 Reminder Schedule (if implemented)
- [ ] Configure **Overdue Reminder Schedule** (e.g., `1,3,7`)
- [ ] Wait for WP-Cron to run
- [ ] Verify reminder emails sent at configured intervals
- [ ] Check email recipients match assigned agents

**Troubleshooting:**
- If SLA not calculating: Verify `PSP_PORTAL.sla` object in JS console
- If thresholds don't apply: Clear object cache and reload
- If reminders don't send: Check WP-Cron is enabled

---

## 6. File Attachments

### 6.1 Upload Test
- [ ] Create or edit ticket
- [ ] Scroll to **Attachments** meta box
- [ ] Click **"Add Attachment"** button
- [ ] Upload test file (PDF, image, .docx)
- [ ] Verify file appears in attachments list
- [ ] Save ticket
- [ ] Reload ticket edit screen
- [ ] Verify attachment persists

### 6.2 Download Test
- [ ] View ticket with attachments
- [ ] Click attachment filename
- [ ] Verify file downloads
- [ ] Check downloaded file opens correctly
- [ ] Verify access control (partner can only download their own attachments)

### 6.3 Security Test
- [ ] Logout and attempt direct URL access to attachment
- [ ] Expected: 403 Forbidden or redirect to login
- [ ] Login as different partner
- [ ] Attempt to download another partner's attachment
- [ ] Expected: Access denied

**Troubleshooting:**
- If upload fails: Check `uploads/` directory permissions (755)
- If download fails: Verify nonce validation isn't blocking legitimate requests
- If security bypass: Check `can_access_ticket()` logic in download handler

---

## 7. Search & Filters

### 7.1 Ticket Search Test
- [ ] Navigate to **Tickets → All Tickets**
- [ ] Enter search term in search box (e.g., "urgent issue")
- [ ] Press Enter
- [ ] Verify results show matching tickets by:
  - Title
  - Content
  - Ticket ID

### 7.2 Priority Filter Test
- [ ] Use priority dropdown filter
- [ ] Select **"Urgent"**
- [ ] Click **"Filter"**
- [ ] Verify only urgent tickets display
- [ ] Test with other priorities (High, Medium, Low)

### 7.3 Status Filter Test
- [ ] Use status dropdown filter
- [ ] Select **"Open"**
- [ ] Verify only open tickets display
- [ ] Test with: In Progress, Resolved, Closed

### 7.4 Assignee Filter Test
- [ ] Use assignee dropdown filter
- [ ] Select specific support agent
- [ ] Verify only tickets assigned to that agent display
- [ ] Test **"Unassigned"** option

### 7.5 Combined Filters Test
- [ ] Apply multiple filters simultaneously:
  - Priority: High
  - Status: Open
  - Assignee: Specific agent
- [ ] Verify results match all criteria

**Troubleshooting:**
- If search returns no results: Check database indexes on post_title/post_content
- If filters don't apply: Verify `pre_get_posts` hook is firing
- If dropdown empty: Check user roles have correct capabilities

---

## 8. Dashboard Widgets

### 8.1 Support Agent Dashboard
- [ ] Login as support agent
- [ ] Navigate to **Dashboard**
- [ ] Verify **"My Assigned Tickets"** widget displays
- [ ] Check widget shows:
  - Count of assigned tickets
  - List of recent tickets
  - Priority distribution chart (if implemented)

### 8.2 Partner Dashboard
- [ ] Login as partner user
- [ ] Navigate to portal dashboard tab
- [ ] Verify **"My Tickets Summary"** displays:
  - Total open tickets
  - Overdue count
  - Average response time
  - Recent ticket list

### 8.3 Admin Dashboard
- [ ] Login as administrator
- [ ] Navigate to **Dashboard**
- [ ] Verify **"Pool Safe Overview"** widget shows:
  - Total tickets
  - Open/Resolved breakdown
  - SLA compliance percentage
  - Recent activity

**Troubleshooting:**
- If widget doesn't appear: Check `wp_add_dashboard_widget()` is hooked
- If data incorrect: Verify WP_Query arguments and meta_query logic

---

## 9. Activity Log & Audit Trail

### 9.1 Ticket Activity Test
- [ ] Create new ticket
- [ ] Verify activity log entry: **"Ticket created"**
- [ ] Update ticket status to "In Progress"
- [ ] Verify log entry: **"Status changed from New to In Progress"**
- [ ] Assign ticket to agent
- [ ] Verify log entry: **"Assigned to [Agent Name]"**
- [ ] Add reply
- [ ] Verify log entry: **"Reply added by [User]"**

### 9.2 Activity Log Viewer
- [ ] Navigate to **Pool Safe → Activity Log**
- [ ] Verify all events display in chronological order
- [ ] Check each entry shows:
  - Timestamp
  - User (who performed action)
  - Action type
  - Related ticket/partner link

### 9.3 Filter Activity Test
- [ ] Use date range filter (e.g., "Last 7 days")
- [ ] Verify only recent entries display
- [ ] Filter by user
- [ ] Filter by action type (e.g., "Status Change")

**Troubleshooting:**
- If events missing: Check `do_action('psp_log_activity', ...)` is called
- If timestamps wrong: Verify timezone settings in WordPress

---

## 10. Bulk User Import

### 10.1 CSV Preparation
- [ ] Create CSV file with columns:
  - `email` (required)
  - `first_name`
  - `last_name`
  - `company_name`
  - `phone`
- [ ] Add 5-10 test rows
- [ ] Save as `test-partners.csv`

### 10.2 Import Test
- [ ] Navigate to **Pool Safe → Bulk Import**
- [ ] Upload `test-partners.csv`
- [ ] Click **"Import Partners"**
- [ ] Verify import summary shows:
  - Total rows processed
  - Successful imports
  - Skipped (duplicates)
  - Errors (if any)

### 10.3 Validation Test
- [ ] Navigate to **Partners → All Partners**
- [ ] Verify imported partners exist
- [ ] Check each partner has:
  - WordPress user account (role: `psp_partner`)
  - Partner custom post type entry
  - Correct metadata (company, phone)

### 10.4 Error Handling Test
- [ ] Create CSV with invalid email: `invalid-email`
- [ ] Import file
- [ ] Verify error message displays
- [ ] Check valid rows still imported successfully

**Troubleshooting:**
- If import fails: Check file upload size limits in `php.ini`
- If encoding errors: Save CSV as UTF-8
- If duplicates not detected: Verify email uniqueness check logic

---

## 11. Canned Responses

### 11.1 Create Response Template
- [ ] Navigate to **Pool Safe → Canned Responses**
- [ ] Click **"Add New"**
- [ ] Title: "Welcome Message"
- [ ] Content: "Thank you for contacting Pool Safe support..."
- [ ] Add placeholders: `{{partner_name}}`, `{{ticket_id}}`
- [ ] Save template

### 11.2 Use Template in Reply
- [ ] Edit ticket
- [ ] Click **"Add Reply"**
- [ ] Locate **"Insert Canned Response"** dropdown
- [ ] Select "Welcome Message"
- [ ] Verify placeholders replaced with actual values:
  - `{{partner_name}}` → Partner's name
  - `{{ticket_id}}` → Ticket number
- [ ] Submit reply

### 11.3 Template Management Test
- [ ] Edit canned response template
- [ ] Update content
- [ ] Save changes
- [ ] Use template again
- [ ] Verify updated content appears
- [ ] Delete template
- [ ] Verify it no longer appears in dropdown

**Troubleshooting:**
- If placeholders not replaced: Check `str_replace()` logic in reply handler
- If dropdown empty: Verify canned responses are published (not draft)

---

## 12. Accessibility & Keyboard Navigation

### 12.1 Focus Indicators Test
- [ ] Open portal page
- [ ] Press **Tab** key repeatedly
- [ ] Verify visible focus outline on:
  - Links
  - Buttons
  - Form inputs
  - Dropdown selects
- [ ] Check outline is **2px solid** and clearly visible

### 12.2 Keyboard-Only Navigation Test
- [ ] Use only keyboard (no mouse)
- [ ] Navigate to **Tickets** tab (Tab + Enter)
- [ ] Open ticket details (Tab to link + Enter)
- [ ] Submit reply form (Tab through fields + Enter on submit)
- [ ] Verify all actions work without mouse

### 12.3 Screen Reader Test (Optional)
- [ ] Enable NVDA or JAWS screen reader
- [ ] Navigate portal page
- [ ] Verify ARIA labels are announced:
  - `aria-label="Load more service records"`
  - Button labels and form field descriptions

**Troubleshooting:**
- If focus not visible: Check CSS `:focus-visible` is defined
- If keyboard nav breaks: Verify no `tabindex="-1"` on interactive elements

---

## 13. Performance & Load Testing

### 13.1 Large Dataset Test
- [ ] Create 100+ tickets in database
- [ ] Create 50+ partners
- [ ] Navigate to **Tickets → All Tickets**
- [ ] Measure page load time (should be < 2 seconds)
- [ ] Check for pagination on admin list tables

### 13.2 API Response Time Test
- [ ] Use browser DevTools Network tab
- [ ] Measure REST API endpoints:
  - `GET /poolsafe/v1/tickets` (should be < 500ms)
  - `GET /poolsafe/v1/service-records` (should be < 300ms)
  - `POST /poolsafe/v1/tickets` (should be < 1s)

### 13.3 Concurrent User Test
- [ ] Open portal in multiple browsers/incognito windows
- [ ] Login as different users simultaneously
- [ ] Create tickets, add replies, update statuses
- [ ] Verify no race conditions or data conflicts

**Troubleshooting:**
- If slow queries: Add database indexes on frequently queried meta_keys
- If timeout errors: Increase PHP `max_execution_time`

---

## 14. Security Testing

### 14.1 Nonce Validation Test
- [ ] Inspect form HTML and copy nonce value
- [ ] Wait 24 hours (or modify nonce in browser)
- [ ] Submit form with expired nonce
- [ ] Expected: Error message "Security check failed"

### 14.2 Capability Check Test
- [ ] Login as partner user (role: `psp_partner`)
- [ ] Attempt to access: `/wp-admin/edit.php?post_type=psp_ticket`
- [ ] Expected: Access denied (partners can't see admin area)
- [ ] Attempt REST API: `DELETE /poolsafe/v1/tickets/123`
- [ ] Expected: 403 Forbidden

### 14.3 SQL Injection Test
- [ ] Use search box with SQL injection attempt: `' OR 1=1 --`
- [ ] Verify no database errors
- [ ] Check results are properly sanitized
- [ ] Verify no sensitive data leaked

### 14.4 XSS Prevention Test
- [ ] Create ticket with title: `<script>alert('XSS')</script>`
- [ ] View ticket on frontend
- [ ] Verify script tag is escaped (not executed)
- [ ] Check HTML source shows: `&lt;script&gt;...`

**Troubleshooting:**
- If XSS vulnerability found: Use `esc_html()`, `esc_attr()`, `wp_kses_post()`
- If capability bypass: Review `current_user_can()` checks in all REST endpoints

---

## 15. End-to-End Workflow Test

### Complete Ticket Lifecycle
1. [ ] **Partner creates ticket** via portal
2. [ ] **Email notification** sent to support team
3. [ ] **Auto-sync to HubSpot** creates deal
4. [ ] **Support agent assigns** ticket to self
5. [ ] **Agent replies** via Outlook (Graph API)
6. [ ] **Partner receives email** notification
7. [ ] **Partner uploads attachment** (invoice, screenshot)
8. [ ] **Agent updates status** to "Resolved"
9. [ ] **Activity log** records all actions
10. [ ] **SLA metrics** calculated and displayed
11. [ ] **Dashboard widgets** update counts
12. [ ] **Partner confirms** resolution
13. [ ] **Ticket closed** automatically or manually

---

## Quick Test Script (PowerShell)

```powershell
# Save as test-integrations.ps1 in wp-poolsafe-portal directory

Write-Host "=== Pool Safe Portal Integration Tests ===" -ForegroundColor Cyan

# 1. Check configuration files
Write-Host "`n[1] Checking configuration..." -ForegroundColor Yellow
$settings = @(
    'psp_email_settings',
    'psp_hubspot_settings',
    'psp_hybrid_email_settings'
)

foreach ($setting in $settings) {
    Write-Host "  - Checking $setting..."
    # Add WP-CLI command to verify settings exist
}

# 2. Test REST API endpoints
Write-Host "`n[2] Testing REST API..." -ForegroundColor Yellow
$base_url = "https://your-site.com/wp-json/poolsafe/v1"

$endpoints = @(
    "$base_url/tickets",
    "$base_url/service-records",
    "$base_url/hubspot/test-connection"
)

foreach ($endpoint in $endpoints) {
    Write-Host "  - Testing $endpoint..."
    try {
        $response = Invoke-WebRequest -Uri $endpoint -Method GET -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "    ✓ OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "    ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 3. Check file permissions
Write-Host "`n[3] Checking file permissions..." -ForegroundColor Yellow
$upload_dir = ".\uploads"
if (Test-Path $upload_dir) {
    $acl = Get-Acl $upload_dir
    Write-Host "  - Upload directory exists: ✓" -ForegroundColor Green
    Write-Host "    Permissions: $($acl.Access | Select-Object IdentityReference, FileSystemRights)"
} else {
    Write-Host "  - Upload directory missing: ✗" -ForegroundColor Red
}

# 4. Check active WP-Cron jobs
Write-Host "`n[4] Checking WP-Cron jobs..." -ForegroundColor Yellow
# Add WP-CLI command: wp cron event list

Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Manual verification required for:"
Write-Host "  - Microsoft Graph OAuth flow"
Write-Host "  - HubSpot data sync"
Write-Host "  - Email-to-Ticket IMAP connection"
Write-Host "  - Frontend UI/UX testing"
Write-Host "`nRefer to INTEGRATION-TEST-PLAN.md for detailed checklist."
```

---

## Test Reporting Template

Use this template to document test results:

```markdown
# Test Execution Report
**Date:** YYYY-MM-DD  
**Tester:** [Your Name]  
**Version:** 1.3.0  
**Environment:** Production / Staging

## Results Summary
- **Total Tests:** 100
- **Passed:** 95
- **Failed:** 3
- **Skipped:** 2

## Failed Tests
1. **Test Name:** HubSpot Auto-sync Tickets
   - **Issue:** 401 Unauthorized error
   - **Root Cause:** API key expired
   - **Action:** Regenerate API key in HubSpot settings
   - **Status:** Fixed

## Notes
- All critical integrations (Outlook, HubSpot) operational
- SLA tracking working correctly
- Minor CSS issue on mobile (non-blocking)
```

---

## Automated Testing (Optional)

For CI/CD integration, consider:

1. **PHPUnit Tests:** Unit tests for core classes
2. **Cypress E2E:** Frontend user flows
3. **WP-CLI Scripts:** Automated configuration checks
4. **Postman Collections:** REST API endpoint testing

---

## Support & Troubleshooting

If tests fail, check:
1. **Error Logs:** `wp-content/debug.log` (enable `WP_DEBUG`)
2. **Browser Console:** JavaScript errors
3. **Network Tab:** Failed API requests
4. **Database:** Verify tables exist and have data
5. **PHP Version:** Ensure 7.4+ is active
6. **WordPress Version:** Ensure 6.0+ is active

For integration-specific issues, refer to:
- **Microsoft Graph:** https://docs.microsoft.com/graph
- **HubSpot API:** https://developers.hubspot.com/docs/api
- **WordPress REST API:** https://developer.wordpress.org/rest-api/

---

**Last Updated:** November 12, 2025  
**Plugin Version:** 1.3.0
