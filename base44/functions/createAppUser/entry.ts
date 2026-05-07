import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const caller = await base44.auth.me();
    if (!caller || caller.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const email = body.email;
    const role = body.role || "user";
    const password = body.password;
    const full_name = body.full_name || "";

    if (!email || !password) {
      return Response.json({ error: "email dan password wajib diisi" }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }

    // Check if user already exists
    const allUsers = await base44.asServiceRole.entities.User.list();
    const existing = (allUsers || []).find(u => u.email === email);

    if (existing) {
      // Update password, role, and name on existing user
      await base44.asServiceRole.auth.setUserPassword(existing.id, password);
      const upd = { role };
      if (full_name) upd.full_name = full_name;
      await base44.asServiceRole.entities.User.update(existing.id, upd);
      return Response.json({ success: true, userId: existing.id, note: "updated" });
    }

    // Register new user directly with email + password
    await base44.auth.register({ email, password });

    // Find the newly created user
    let foundUser = null;
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 800));
      const all = await base44.asServiceRole.entities.User.list();
      const match = (all || []).find(u => u.email === email);
      if (match) { foundUser = match; break; }
    }

    if (!foundUser) {
      return Response.json({ error: "Gagal menemukan user setelah dibuat." }, { status: 500 });
    }

    // Set the correct role (register sets default role)
    const updates = { role };
    if (full_name) updates.full_name = full_name;
    await base44.asServiceRole.entities.User.update(foundUser.id, updates);

    return Response.json({ success: true, userId: foundUser.id });
  } catch (error) {
    const msg = error?.message || error?.response?.data?.message || JSON.stringify(error);
    return Response.json({ error: msg }, { status: 500 });
  }
});