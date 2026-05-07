import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DEMO_USERS = [
  { email: "admin@brilianhealth.demo", password: "Demo@Admin123", role: "admin" },
  { email: "nakes@brilianhealth.demo", password: "Demo@Nakes123", role: "user" },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const results = [];

    for (const u of DEMO_USERS) {
      try {
        // Check if user exists
        let users = await base44.asServiceRole.entities.User.filter({ email: u.email });
        
        // If doesn't exist, can't create via SDK - return error
        if (!users || users.length === 0) {
          results.push({ email: u.email, status: "notfound", reason: "User must be invited via dashboard" });
          continue;
        }

        const userId = users[0].id;

        // Set password using setUserPassword
        await base44.asServiceRole.auth.setUserPassword(userId, u.password);
        results.push({ email: u.email, status: "success", userId, passwordSet: true });
      } catch (e) {
        results.push({ email: u.email, status: "error", error: e.message });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});