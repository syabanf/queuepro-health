import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only admin can call this
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, password } = await req.json();

    if (!userId || !password) {
      return Response.json({ error: "userId and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }

    await base44.asServiceRole.auth.setUserPassword(userId, password);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});