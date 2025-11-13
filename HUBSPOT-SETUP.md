# HubSpot CRM Integration Setup Guide

## Overview
Sync partner companies, contacts, tickets, and service records between PoolSafe Portal and HubSpot CRM.

## Prerequisites
- HubSpot account (Marketing Hub, Sales Hub, or Service Hub)
- WordPress site with PoolSafe Portal plugin installed
- Admin access to both systems

## Step 1: Create HubSpot Private App

### 1.1 Access Private Apps
1. Log in to [HubSpot](https://app.hubspot.com)
2. Click **Settings** (gear icon, top right)
3. Navigate to **Integrations** → **Private Apps**
4. Click **Create a private app**

### 1.2 Configure App Details
- **Name:** PoolSafe Portal Integration
- **Description:** Syncs partner companies, tickets, and service records
- **Logo:** Upload PoolSafe logo (optional)

### 1.3 Configure Scopes
Select these permissions:

**CRM - Companies:**
- ✅ `crm.objects.companies.read`
- ✅ `crm.objects.companies.write`

**CRM - Contacts:**
- ✅ `crm.objects.contacts.read`
- ✅ `crm.objects.contacts.write`

**CRM - Deals (for tickets):**
- ✅ `crm.objects.deals.read`
- ✅ `crm.objects.deals.write`

**CRM - Custom Objects (for service records):**
- ✅ `crm.schemas.custom.read`
- ✅ `crm.objects.custom.read`
- ✅ `crm.objects.custom.write`

**Optional - Files:**
- ✅ `files` (if syncing attachments)

### 1.4 Create App
1. Click **Create app**
2. Review and confirm scopes
3. **Copy your access token** (starts with `pat-na1-...`)
4. Store securely (you can't view it again)

## Step 2: Get Your HubSpot Portal ID

### Method A: From URL
When logged into HubSpot, check URL:
```
https://app.hubspot.com/contacts/12345678/contacts/list/view/all/
                              ^^^^^^^^
                              Portal ID
```

### Method B: From Settings
1. **Settings** → **Account Setup** → **Account Defaults**
2. Find **Hub ID** (same as Portal ID)

## Step 3: Create Custom Properties

### 3.1 Company Properties (for Partners)
1. Go to **Settings** → **Properties** → **Company properties**
2. Click **Create property** for each:

| Property Name | Label | Type | Field Type |
|--------------|-------|------|------------|
| `poolsafe_partner_id` | PoolSafe Partner ID | Number | Number |
| `poolsafe_units` | Lounge Units | Number | Number |
| `poolsafe_top_colour` | Brand Color | Single-line text | Text |
| `poolsafe_management_company` | Management Company | Single-line text | Text |
| `poolsafe_lock_make` | Lock Make | Single-line text | Text |
| `poolsafe_master_code` | Master Code | Single-line text | Text |
| `poolsafe_last_sync` | Last Sync Date | Date picker | Date |

### 3.2 Contact Properties
1. Go to **Settings** → **Properties** → **Contact properties**
2. Create:

| Property Name | Label | Type |
|--------------|-------|------|
| `poolsafe_user_id` | PoolSafe User ID | Number |
| `poolsafe_company_id` | PoolSafe Company ID | Number |
| `poolsafe_role` | Portal Role | Single-line text |

### 3.3 Deal Properties (for Tickets)
1. Go to **Settings** → **Properties** → **Deal properties**
2. Create:

| Property Name | Label | Type |
|--------------|-------|------|
| `poolsafe_ticket_id` | Ticket ID | Number |
| `poolsafe_ticket_status` | Ticket Status | Dropdown (open, in_progress, resolved, closed) |
| `poolsafe_ticket_priority` | Priority | Dropdown (low, medium, high, critical) |
| `poolsafe_ticket_source` | Source | Dropdown (portal, email, phone, chat) |

### 3.4 Custom Object: Service Records (Optional)
1. Go to **Settings** → **Objects** → **Custom objects**
2. Click **Create custom object**
3. Configure:
   - **Name:** Service Records
   - **Primary property:** Record Title
   - **Secondary properties:**
     - `record_type` (Dropdown: maintenance, installation, repair, inspection)
     - `service_date` (Date)
     - `poolsafe_partner_id` (Number)
     - `technician` (Text)
     - `notes` (Multi-line text)

## Step 4: Configure WordPress Plugin

### 4.1 Add HubSpot Credentials to wp-config.php
```php
// HubSpot Integration
define('PSP_HUBSPOT_API_KEY', 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
define('PSP_HUBSPOT_PORTAL_ID', '12345678');
```

### 4.2 Enable HubSpot Sync in Plugin Settings
1. Go to **WordPress Admin** → Pool Safe → **Settings**
2. Navigate to **Integrations** tab
3. Check **Enable HubSpot Sync**
4. Configure sync options:
   - ✅ Sync partners to companies
   - ✅ Sync contacts
   - ✅ Sync tickets to deals
   - ✅ Sync service records (if custom object created)
   - Sync frequency: **Real-time** or **Hourly batch**
5. **Save changes**

### 4.3 Map Custom Properties
In **Settings** → **HubSpot Mapping**:

**Company Mapping:**
```json
{
  "company_name": "name",
  "company_email": "email",
  "phone": "phone",
  "units": "poolsafe_units",
  "top_colour": "poolsafe_top_colour",
  "management_company": "poolsafe_management_company",
  "lock_make": "poolsafe_lock_make"
}
```

**Contact Mapping:**
```json
{
  "user_email": "email",
  "first_name": "firstname",
  "last_name": "lastname",
  "phone": "phone",
  "role": "poolsafe_role"
}
```

## Step 5: Initial Sync

### 5.1 Run Full Sync
1. Go to **Pool Safe** → **HubSpot Sync**
2. Click **Run Full Sync**
3. Select:
   - ✅ Partners → Companies
   - ✅ Contacts
   - ✅ Tickets → Deals
   - ✅ Service Records
4. Click **Start Sync**
5. Monitor progress (may take 5-30 minutes depending on data volume)

### 5.2 Verify Sync
Check in HubSpot:
1. **Contacts** → **Companies** → verify partners appear
2. Check custom properties are populated
3. **Contacts** → verify user contacts linked to companies
4. **Sales** → **Deals** → verify tickets created
5. Custom object browser → verify service records

## Step 6: Configure Sync Triggers

### Real-Time Sync (Recommended)
Syncs immediately on change:
- Partner created/updated → HubSpot company created/updated
- Ticket created → HubSpot deal created
- Contact added → HubSpot contact created

### Scheduled Batch Sync
Runs hourly/daily:
1. **Settings** → **HubSpot** → **Sync Schedule**
2. Select frequency: **Hourly** or **Daily**
3. Time: `02:00 AM` (off-peak)
4. Save

### Manual Sync
Force sync anytime:
- Go to **Pool Safe** → **HubSpot Sync**
- Click **Sync Now**

## Step 7: Bidirectional Sync (Optional)

### Sync FROM HubSpot to WordPress
Update partners when company changes in HubSpot:

1. **HubSpot** → **Settings** → **Integrations** → **Webhooks**
2. Click **Create subscription**
3. Configure:
   - Event type: `company.propertyChange`
   - Webhook URL: `https://yoursite.com/wp-json/poolsafe/v1/hubspot-webhook`
   - Properties to monitor: `name`, `phone`, `poolsafe_units`
4. Add authentication header:
   ```
   X-HubSpot-Webhook-Token: YOUR_WEBHOOK_SECRET
   ```
5. Save subscription

In `wp-config.php`:
```php
define('PSP_HUBSPOT_WEBHOOK_SECRET', 'your-random-secure-token');
define('PSP_HUBSPOT_BIDIRECTIONAL_SYNC', true);
```

## Testing

### Test 1: Partner → Company Sync
1. Create new partner in WordPress
2. Go to HubSpot → Companies
3. Search for company name
4. Verify:
   - Company exists
   - Custom properties populated
   - Associated contacts linked

### Test 2: Ticket → Deal Sync
1. Create test ticket in WordPress portal
2. Go to HubSpot → Deals
3. Find deal with ticket ID
4. Verify:
   - Deal name matches ticket subject
   - Priority/status correct
   - Associated with correct company

### Test 3: Bidirectional Update
1. Update company phone in HubSpot
2. Wait 5 minutes (or trigger webhook manually)
3. Check partner in WordPress
4. Verify phone updated

### Test 4: API Connection
Run health check:
```bash
curl https://yoursite.com/wp-json/poolsafe/v1/hubspot/status
```

Expected response:
```json
{
  "connected": true,
  "portal_id": "12345678",
  "scopes": ["crm.objects.companies.read", "..."],
  "last_sync": "2025-01-15T10:30:00Z",
  "total_synced": 150
}
```

## Advanced Configuration

### Custom Workflows
Trigger HubSpot workflows on sync:

1. **HubSpot** → **Automation** → **Workflows**
2. Create workflow:
   - Trigger: Company property `poolsafe_last_sync` is updated
   - Actions:
     - Send internal notification to sales team
     - Create task for account manager
     - Enroll in onboarding email sequence

### Deal Pipelines
Map ticket statuses to deal stages:

1. **Settings** → **Objects** → **Deals** → **Pipelines**
2. Create pipeline: "Support Tickets"
3. Stages:
   - New Ticket (open)
   - In Progress (in_progress)
   - Resolved (resolved)
   - Closed Won (closed)

In WordPress settings:
```json
{
  "open": "new_ticket",
  "in_progress": "in_progress",
  "resolved": "resolved",
  "closed": "closed_won"
}
```

### Rate Limiting
HubSpot API limits:
- **Free/Starter:** 100 requests per 10 seconds
- **Professional:** 150 requests per 10 seconds
- **Enterprise:** 200 requests per 10 seconds

Configure in `wp-config.php`:
```php
define('PSP_HUBSPOT_RATE_LIMIT', 100); // Requests per 10 seconds
define('PSP_HUBSPOT_BATCH_SIZE', 50); // Records per batch
```

## Troubleshooting

### Error: "Invalid API key"
**Solution:**
1. Go to HubSpot → **Settings** → **Integrations** → **Private Apps**
2. Regenerate access token
3. Update `PSP_HUBSPOT_API_KEY` in `wp-config.php`

### Error: "Property not found"
**Solution:**
1. Verify custom properties created in HubSpot
2. Check exact property name (case-sensitive)
3. Update property mapping in plugin settings

### Sync not running
**Solution:**
1. Check **Pool Safe** → **Activity Log** for errors
2. Verify API key and portal ID
3. Test connection: `wp-json/poolsafe/v1/hubspot/status`
4. Check WP-Cron is enabled:
   ```bash
   wp cron event list
   ```

### Duplicate companies created
**Solution:**
1. Enable deduplication in plugin settings
2. Map unique identifier: `poolsafe_partner_id`
3. Run de-duplication tool:
   - **Pool Safe** → **HubSpot Sync** → **Remove Duplicates**

### Rate limit errors
**Solution:**
1. Reduce `PSP_HUBSPOT_BATCH_SIZE` to 25
2. Change sync frequency to **Daily** instead of **Hourly**
3. Upgrade HubSpot plan for higher limits

## Monitoring

### Sync Dashboard
Access at **Pool Safe** → **HubSpot Sync**:
- Total records synced
- Last sync time
- Failed sync count
- Error log

### Activity Log
Filter by:
- Action: `hubspot_sync_company`, `hubspot_sync_contact`
- Status: `success`, `error`
- Date range

### HubSpot Logs
Check **Settings** → **Integrations** → **Private Apps** → [Your App] → **Logs**:
- API request count
- Failed requests
- Rate limit warnings

## Best Practices

1. **Start with one-way sync** (WordPress → HubSpot) before enabling bidirectional
2. **Run initial sync during off-peak hours** (weekends/nights)
3. **Monitor sync logs daily** for first week
4. **Set up alerts** for sync failures (email notification)
5. **Regularly review property mappings** as schema evolves
6. **Document custom properties** in HubSpot descriptions
7. **Train team on sync behavior** (e.g., don't manually delete synced records)

## Next Steps

1. ✅ Create HubSpot private app
2. ✅ Copy API key and portal ID
3. ✅ Create custom properties
4. ✅ Add credentials to `wp-config.php`
5. ✅ Enable sync in plugin settings
6. ✅ Run initial full sync
7. ✅ Verify data in HubSpot
8. ✅ Test real-time sync (create test partner)
9. ✅ Configure workflows (optional)
10. ✅ Monitor for 1 week

---

**Resources:**
- [HubSpot API Docs](https://developers.hubspot.com/docs/api/overview)
- [Private Apps Guide](https://developers.hubspot.com/docs/api/private-apps)
- [Custom Objects](https://developers.hubspot.com/docs/api/crm/crm-custom-objects)
- PoolSafe Portal support: Email support with API key (redacted) and error logs
