import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DEMO_USERS = [
  { email: "admin@brilianhealth.demo", password: "Demo@Admin123", role: "admin" },
  { email: "nakes@brilianhealth.demo", password: "Demo@Nakes123", role: "user" },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only allow admin to call this
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const results = [];

    for (const u of DEMO_USERS) {
      // Step 1: Invite user (creates if not exists)
      try {
        await base44.users.inviteUser(u.email, u.role);
        results.push({ email: u.email, invited: true });
      } catch {
        results.push({ email: u.email, invited: false, note: "already exists or error" });
      }

      // Step 2: Set password via service role
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email: u.email });
        if (users && users.length > 0) {
          await base44.asServiceRole.auth.setUserPassword(users[0].id, u.password);
          results[results.length - 1].passwordSet = true;
        }
      } catch (e) {
        results[results.length - 1].passwordSet = false;
        results[results.length - 1].passwordError = e.message;
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});