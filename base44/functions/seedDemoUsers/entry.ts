import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const results = [];

  // Invite admin demo user
  try {
    await base44.asServiceRole.users.inviteUser('admin@brilianhealth.demo', 'admin');
    results.push({ email: 'admin@brilianhealth.demo', status: 'invited', role: 'admin' });
  } catch (e) {
    results.push({ email: 'admin@brilianhealth.demo', status: 'skipped', reason: e.message });
  }

  // Invite nakes demo user
  try {
    await base44.asServiceRole.users.inviteUser('nakes@brilianhealth.demo', 'user');
    results.push({ email: 'nakes@brilianhealth.demo', status: 'invited', role: 'user' });
  } catch (e) {
    results.push({ email: 'nakes@brilianhealth.demo', status: 'skipped', reason: e.message });
  }

  // Invite user demo user
  try {
    await base44.asServiceRole.users.inviteUser('user@brilianhealth.demo', 'user');
    results.push({ email: 'user@brilianhealth.demo', status: 'invited', role: 'user' });
  } catch (e) {
    results.push({ email: 'user@brilianhealth.demo', status: 'skipped', reason: e.message });
  }

  return Response.json({ results });
});