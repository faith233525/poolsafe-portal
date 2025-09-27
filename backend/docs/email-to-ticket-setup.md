# Email-to-Ticket Integration Setup

This service automatically creates support tickets from incoming emails to your support inbox.

## Requirements

- Node.js backend
- IMAP access to your support inbox (e.g., Gmail, Outlook, custom SMTP/IMAP)
- Environment variables for email credentials
- `imap` and `mailparser` npm packages

## Installation

```
npm install imap mailparser
```

## Configuration

Add the following environment variables to your `.env` file:

```
SUPPORT_EMAIL_USER=your-email@domain.com
SUPPORT_EMAIL_PASS=your-email-password
SUPPORT_EMAIL_HOST=imap.your-email-provider.com
SUPPORT_EMAIL_PORT=993
```

## Usage

Import and start the service in your backend entrypoint (e.g., `app.ts`):

```ts
import { startEmailToTicketService } from "./services/emailToTicket";
startEmailToTicketService();
```

## How It Works

- Polls the inbox for new (unseen) emails.
- Parses sender, subject, and body.
- Creates a ticket in the database, assigning to a default partner if sender is unknown.
- You can enhance partner mapping by matching sender email to a partner record.

## Customization

- To map sender emails to specific partners, update the logic in `createTicketFromEmail`.
- To change ticket field mapping, edit the same function.

## Troubleshooting

- Ensure IMAP credentials are correct and inbox is accessible.
- Check logs for errors (IMAP connection, ticket creation).
- Make sure required npm packages are installed.

## Security

- Store credentials securely and restrict access to the `.env` file.
- Use app passwords or OAuth for Gmail/Outlook if possible.

---

For advanced features (attachments, partner mapping, etc.), contact your developer or extend the service logic.
