import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DEMO_USERS = [
  { email: "admin@brilianhealth.demo", role: "admin" },
  { email: "nakes@brilianhealth.demo", role: "user" },
];

// Auto-invite demo users if they don't exist yet
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const results = [];

    for (const u of DEMO_USERS) {
      try {
        await base44.users.inviteUser(u.email, u.role);
        results.push({ email: u.email, status: "invited" });
      } catch (e) {
        const msg = e?.message || "";
        results.push({ email: u.email, status: msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exist") ? "exists" : "error", message: msg });
      }
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});