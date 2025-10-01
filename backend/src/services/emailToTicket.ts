import Imap from "imap";
// import { simpleParser } from "mailparser";
import { prisma } from "../prismaClient";

// Configurable via env
const IMAP_CONFIG = {
  user: process.env.SUPPORT_EMAIL_USER || "default@example.com",
  password: process.env.SUPPORT_EMAIL_PASS || "defaultpass",
  host: process.env.SUPPORT_EMAIL_HOST || "imap.gmail.com",
  port: parseInt(process.env.SUPPORT_EMAIL_PORT || "993"),
  tls: true,
};

export function createTicketFromEmail({
  from,
  subject,
  text,
}: {
  from: string;
  subject: string;
  text: string;
}) {
  // Extract domain from sender email
  const domainMatch = from.match(/@([\w.-]+)/);
  const domain = domainMatch ? domainMatch[1].toLowerCase() : undefined;

  // Try to map partner by domain (using a custom field 'domain' in Partner model, or fallback to companyName contains)
  return prisma.partner
    .findFirst({
      where: domain ? { companyName: { contains: domain } } : {},
    })
    .then(async (domainPartner) => {
      let partnerId: string | undefined = domainPartner?.id;
      if (!partnerId) {
        // Fallback: try user email
        const user = await prisma.user.findFirst({ where: { email: from } });
        partnerId = user?.partnerId || undefined;
      }
      if (!partnerId) {
        // Fallback: first partner
        const fallbackPartner = await prisma.partner.findFirst();
        partnerId = fallbackPartner?.id || undefined;
      }
      return prisma.ticket.create({
        data: {
          subject: subject || "No Subject",
          description: text || "",
          createdByName: from,
          category: "General",
          priority: "MEDIUM",
          status: "OPEN",
          partnerId: partnerId as string,
        },
      });
    });
}

export function startEmailToTicketService() {
  const imap = new Imap(IMAP_CONFIG);

  function openInbox(cb: any) {
    imap.openBox("INBOX", false, cb);
  }

  imap.once("ready", () => {
    openInbox((err: any, _box: any) => {
      if (err) {
        throw err;
      }
      imap.on("mail", () => {
        // Search for unseen emails
        imap.search(["UNSEEN"], (err: any, results: any) => {
          if (err || !results || results.length === 0) {
            return;
          }
          const fetch = imap.fetch(results, { bodies: "" });
          fetch.on("message", (msg: any) => {
            msg.on("body", (_stream: any) => {
              // simpleParser(stream, async (err: any, parsed: any) => {
              //   if (err) {return;}
              //   await createTicketFromEmail({
              //     from: parsed.from.text,
              //     subject: parsed.subject,
              //     text: parsed.text,
              //   });
              // });
            });
          });
        });
      });
    });
  });

  imap.once("error", (err: any) => {
    console.error("IMAP error:", err);
  });

  imap.once("end", () => {
    console.log("IMAP connection ended");
  });

  imap.connect();
}

// Usage: import and call startEmailToTicketService() in your backend entrypoint
