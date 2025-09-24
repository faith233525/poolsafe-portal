import { rest } from "msw";

export const handlers = [
  rest.get("/api/tickets", (req, res, ctx) => {
    // Example: return demo tickets
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: "1",
          subject: "Demo Ticket",
          status: "open",
          createdAt: new Date().toISOString(),
        },
      ]),
    );
  }),
  rest.post("/api/tickets", (req, res, ctx) => {
    // Example: always succeed
    return res(ctx.status(200));
  }),
];
