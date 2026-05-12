import { entities, auth, functions, users } from '@/api/supabaseDb';

export const base44 = {
  entities,
  auth,
  functions,
  users,
  asServiceRole: { entities, auth, users },
};