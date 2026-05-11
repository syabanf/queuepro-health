import { entities, auth, functions, users } from '@/api/localDb';

export const base44 = {
  entities,
  auth,
  functions,
  users,
  asServiceRole: { entities, auth, users },
};