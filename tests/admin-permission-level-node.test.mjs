import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { authorizeAdminOperation, hashPassword } from '../lib/portalAuthServer.js';

const SESSION_ID = crypto.randomUUID();
const SECRET = 'portal-session-secret';
const TOKEN_HASH = hashPassword(SECRET);

// Minimal Supabase stub for the portal-session (<uuid>.<secret>) path.
function createSupabase(permissions) {
  const tables = {
    portal_sessions: [{
      id: SESSION_ID,
      cnic: '3520112345671',
      role: 'custom',
      token_hash: TOKEN_HASH,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      revoked_at: null,
    }],
    users: [{ cnic: '3520112345671', role: 'custom', status: 'active', custom_roles: { permissions } }],
  };
  return {
    from(table) {
      const query = {
        select: () => query,
        eq: () => query,
        limit: () => Object.assign(Promise.resolve({ data: tables[table] || [] }), {
          single: async () => ({ data: (tables[table] || [])[0] || null }),
        }),
      };
      return query;
    },
  };
}

function authorize(method, permissions, key = 'students') {
  return authorizeAdminOperation({
    method,
    headers: { authorization: `Bearer ${SESSION_ID}.${SECRET}` },
    __supabase: createSupabase(permissions),
  }, key);
}

test('portal session with view permission can read but not write', async () => {
  const read = await authorize('GET', { students: 'view' });
  assert.equal(read.ok, true);
  assert.equal(read.role, 'custom');

  const write = await authorize('POST', { students: 'view' });
  assert.equal(write.ok, false);
  assert.equal(write.status, 403);
  assert.match(write.message, /requires full on students/);
});

test('portal session with full permission can write', async () => {
  const write = await authorize('POST', { students: 'full' });
  assert.equal(write.ok, true);
});

test('portal session without the permission is denied even for reads', async () => {
  const read = await authorize('GET', { finance: 'full' });
  assert.equal(read.ok, false);
  assert.equal(read.status, 403);
  assert.match(read.message, /requires view on students/);
});
