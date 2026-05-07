import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only admin can call this
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, role, password, full_name } = await req.json();

    if (!email || !password) {
      return Response.json({ error: "email dan password wajib diisi" }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }

    // Step 1: Invite user (creates account)
    try {
      await base44.users.inviteUser(email, role || "user");
    } catch (e) {
      const msg = e?.message || "";
      const alreadyExists = msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exist");
      if (!alreadyExists) {
        return Response.json({ error: `Gagal membuat user: ${msg}` }, { status: 400 });
      }
    }

    // Step 2: Find the user
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (!users || users.length === 0) {
      return Response.json({ error: "User tidak ditemukan setelah dibuat" }, { status: 500 });
    }

    const newUser = users[0];

    // Step 3: Set password immediately
    await base44.asServiceRole.auth.setUserPassword(newUser.id, password);

    // Step 4: Update full_name if provided
    if (full_name) {
      await base44.asServiceRole.entities.User.update(newUser.id, { full_name });
    }

    return Response.json({ success: true, userId: newUser.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});