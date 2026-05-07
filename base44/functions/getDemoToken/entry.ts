import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DEMO_CREDENTIALS = {
  admin: { email: "admin@brilianhealth.demo", password: "admin123" },
  nakes: { email: "nakes@brilianhealth.demo", password: "nakes" },
};

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, password } = body;

    if (!username || !password) {
      return Response.json({ error: "Username and password required" }, { status: 400 });
    }

    const credentials = DEMO_CREDENTIALS[username];
    if (!credentials || credentials.password !== password) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    // Generate demo token (use base44's built-in token generation)
    const token = await base44.asServiceRole.auth.createDemoUserToken(credentials.email);

    return Response.json({ token });
  } catch (error) {
    console.error("getDemoToken error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});