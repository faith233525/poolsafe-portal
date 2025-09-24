import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/tickets", () => {
    return HttpResponse.json([
      {
        id: "1",
        subject: "Demo Ticket",
        status: "open",
        createdAt: new Date().toISOString(),
      },
    ]);
  }),
  http.post("/api/tickets", () => {
    return new HttpResponse(null, { status: 200 });
  }),
];
