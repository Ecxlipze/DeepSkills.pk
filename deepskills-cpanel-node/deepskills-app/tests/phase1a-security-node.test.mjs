import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

import { sendOtpEmail, authenticateBlogActor } from '../lib/portalAuthServer.js';
import sendOtpHandler from '../pages/api/auth/send-otp.js';
import blogIndexHandler from '../pages/api/blog/index.js';
import blogDeleteHandler from '../pages/api/blog/[id].js';

// Helper to mock req/res for Next.js API route handlers
function createMockReqRes({ method = 'POST', headers = {}, body = {}, query = {}, supabase = null } = {}) {
  let resStatus = 200;
  let resHeaders = {};
  let resBody = null;

  const req = {
    method,
    headers: { ...headers },
    body,
    query,
    __supabase: supabase
  };

  const res = {
    setHeader: (k, v) => { resHeaders[k] = v; },
    status: (code) => {
      resStatus = code;
      return res;
    },
    json: (data) => {
      resBody = data;
      return res;
    },
    getStatus: () => resStatus,
    getBody: () => resBody,
    getHeaders: () => resHeaders
  };

  return { req, res };
}

// In-memory mock database to simulate Supabase PostgREST queries safely
function createMockDatabase() {
  const state = {
    portal_sessions: [],
    login_otps: [],
    users: [],
    allowed_cnics: [],
    admissions: [],
    teachers: [],
    blog_posts: [],
    auth_users: []
  };

  const client = {
    _state: state,
    auth: {
      getUser: async (token) => {
        const found = state.auth_users.find((u) => u.token === token);
        if (found) {
          return { data: { user: found.user }, error: null };
        }
        return { data: { user: null }, error: new Error('Invalid token') };
      }
    },
    from: (tableName) => {
      let selectedFields = '*';
      let filters = [];
      let updatePayload = null;
      let isSingle = false;
      let limitCount = null;

      const builder = {
        select: (fields = '*') => {
          selectedFields = fields;
          return builder;
        },
        eq: (col, val) => {
          filters.push({ type: 'eq', col, val });
          return builder;
        },
        in: (col, vals) => {
          filters.push({ type: 'in', col, vals });
          return builder;
        },
        order: () => {
          return builder;
        },
        limit: (n) => {
          limitCount = n;
          return builder;
        },
        then: (onFulfilled, onRejected) => {
          return builder._execute().then(onFulfilled, onRejected);
        },
        single: async () => {
          isSingle = true;
          return builder._execute();
        },
        maybeSingle: async () => {
          isSingle = true;
          return builder._execute();
        },
        insert: (rows) => {
          const table = state[tableName] || [];
          const inserted = (Array.isArray(rows) ? rows : [rows]).map((r) => ({
            id: r.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            ...r
          }));
          table.push(...inserted);
          state[tableName] = table;

          return {
            select: () => ({
              single: async () => ({ data: inserted[0], error: null })
            }),
            then: (onFulfilled, onRejected) => {
              return Promise.resolve({ data: inserted, error: null }).then(onFulfilled, onRejected);
            }
          };
        },
        update: (fields) => {
          updatePayload = fields;
          return builder;
        },
        delete: () => {
          return {
            eq: async (col, val) => {
              const beforeLen = (state[tableName] || []).length;
              state[tableName] = (state[tableName] || []).filter((r) => r[col] !== val);
              return { error: null, count: beforeLen - state[tableName].length };
            }
          };
        },
        _execute: async () => {
          let rows = (state[tableName] || []).slice();
          for (const f of filters) {
            if (f.type === 'eq') {
              rows = rows.filter((r) => r[f.col] === f.val);
            } else if (f.type === 'in') {
              rows = rows.filter((r) => f.vals.includes(r[f.col]));
            }
          }

          if (updatePayload) {
            for (const r of rows) {
              Object.assign(r, updatePayload);
            }
            if (isSingle) {
              return { data: rows[0] || null, error: rows[0] ? null : new Error('Not found') };
            }
            return { data: rows, error: null };
          }

          if (limitCount !== null) {
            rows = rows.slice(0, limitCount);
          }

          if (isSingle) {
            return { data: rows[0] || null, error: rows[0] ? null : new Error('Not found') };
          }
          return { data: rows, error: null };
        }
      };

      return builder;
    }
  };

  return { client, state };
}

test('OTP Security: Production & Unknown Environments Fail Closed against Spoofed Headers', async () => {
  const origEnv = process.env.NODE_ENV;
  const logged = [];
  const origLog = console.log;
  console.log = (...args) => logged.push(args.join(' '));

  try {
    // 1. NODE_ENV = 'production' with spoofed Host / X-Forwarded-Host
    process.env.NODE_ENV = 'production';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const spoofedReq = {
      headers: {
        host: 'localhost',
        'x-forwarded-host': '127.0.0.1'
      },
      socket: { remoteAddress: '127.0.0.1' }
    };

    const resProd = await sendOtpEmail({
      email: 'victim@deepskills.pk',
      name: 'Victim User',
      code: '987654',
      cnic: '35201-1234567-1',
      req: spoofedReq
    });

    assert.equal(resProd.ok, false, 'Must fail closed when SMTP unconfigured');
    assert.equal(resProd.devOtp, undefined, 'Must NEVER return devOtp in production');
    assert.ok(!logged.some((msg) => msg.includes('987654')), 'Must NEVER log OTP code to terminal in production');

    // 2. NODE_ENV = undefined (unknown environment)
    delete process.env.NODE_ENV;
    const resUnknown = await sendOtpEmail({
      email: 'victim2@deepskills.pk',
      name: 'Victim User 2',
      code: '888888',
      cnic: '35201-1234567-2',
      req: spoofedReq
    });

    assert.equal(resUnknown.ok, false, 'Must fail closed when NODE_ENV is unset');
    assert.equal(resUnknown.devOtp, undefined, 'Must NEVER return devOtp when NODE_ENV is unset');
    assert.ok(!logged.some((msg) => msg.includes('888888')), 'Must NEVER log OTP code when NODE_ENV is unset');

    // 3. NODE_ENV = 'development' strictly allows devOtp
    process.env.NODE_ENV = 'development';
    const resDev = await sendOtpEmail({
      email: 'dev@deepskills.pk',
      name: 'Developer',
      code: '112233',
      cnic: '35201-0000000-1',
      req: {}
    });

    assert.equal(resDev.ok, true, 'Succeeds gracefully in explicit development mode');
    assert.equal(resDev.devOtp, '112233', 'Provides devOtp in explicit development mode');
    assert.ok(logged.some((msg) => msg.includes('112233')), 'Logs OTP in terminal in development mode');
  } finally {
    process.env.NODE_ENV = origEnv;
    console.log = origLog;
  }
});

test('Blog Security: Missing or Malformed Bearer Token is Rejected (401)', async () => {
  const { client, state } = createMockDatabase();
  const originalCount = state.blog_posts.length;

  // 1. Missing Authorization header on create
  const { req: req1, res: res1 } = createMockReqRes({
    method: 'POST',
    body: { title: 'Hack', slug: 'hack', contentHtml: '<p>test</p>' },
    supabase: client
  });
  await blogIndexHandler(req1, res1);
  assert.equal(res1.getStatus(), 401);
  assert.equal(state.blog_posts.length, originalCount, 'Database must have zero new posts');

  // 2. Malformed token on create
  const { req: req2, res: res2 } = createMockReqRes({
    method: 'POST',
    headers: { authorization: 'Bearer malformed.token.format.here' },
    body: { title: 'Hack2', slug: 'hack2', contentHtml: '<p>test</p>' },
    supabase: client
  });
  await blogIndexHandler(req2, res2);
  assert.equal(res2.getStatus(), 401);
  assert.equal(state.blog_posts.length, originalCount, 'Database must have zero new posts');

  // 3. Missing Authorization header on delete
  const { req: req3, res: res3 } = createMockReqRes({
    method: 'DELETE',
    query: { id: 'some-post-id' },
    supabase: client
  });
  await blogDeleteHandler(req3, res3);
  assert.equal(res3.getStatus(), 401);
});

test('Blog Security: Client-Supplied Actor Roles are Ignored and Forged Roles are Rejected', async () => {
  const { client, state } = createMockDatabase();

  // Attacker sends { actor: { role: 'admin' } } without valid Authorization header
  const { req, res } = createMockReqRes({
    method: 'POST',
    body: {
      title: 'Forged Admin Post',
      slug: 'forged-admin-post',
      contentHtml: '<p>Forged content</p>',
      actor: { role: 'admin', id: 'fake-admin-id' }
    },
    supabase: client
  });
  await blogIndexHandler(req, res);
  assert.equal(res.getStatus(), 401, 'Must reject forged body actor role without token');
  assert.equal(state.blog_posts.length, 0, 'No post created');

  // Attacker attempts delete with { actor: { role: 'admin' } } without valid token
  const { req: reqDel, res: resDel } = createMockReqRes({
    method: 'DELETE',
    query: { id: 'some-id' },
    body: { actor: { role: 'admin' } },
    supabase: client
  });
  await blogDeleteHandler(reqDel, resDel);
  assert.equal(resDel.getStatus(), 401, 'Must reject forged body actor role on delete');
});

test('Blog Security: Contributor Draft Workflow & Cross-Author Access Denial', async () => {
  const { client, state } = createMockDatabase();

  // Setup Contributor A
  const contribAId = 'a1111111-1111-1111-1111-111111111111';
  const sessionASecret = 'secretA123456789012345678901234';
  const sessionARowId = '22222222-2222-2222-2222-222222222222';
  state.portal_sessions.push({
    id: sessionARowId,
    cnic: '35201-1111111-1',
    role: 'custom',
    token_hash: bcrypt.hashSync(sessionASecret, 4),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    revoked_at: null
  });
  state.users.push({
    id: contribAId,
    cnic: '35201-1111111-1',
    full_name: 'Contributor Alice',
    status: 'active',
    custom_roles: { permissions: { blog: 'full' } }
  });
  const tokenA = `${sessionARowId}.${sessionASecret}`;

  // Setup Contributor B's existing draft
  const contribBId = 'b2222222-2222-2222-2222-222222222222';
  const draftBId = 'd3333333-3333-3333-3333-333333333333';
  state.blog_posts.push({
    id: draftBId,
    title: 'Bob Draft',
    slug: 'bob-draft',
    content_html: '<p>Bob content</p>',
    author_id: contribBId,
    author_name: 'Contributor Bob',
    status: 'draft',
    is_featured: false
  });

  // 1. Contributor A creates a post attempting to set published & featured
  const { req: reqCreate, res: resCreate } = createMockReqRes({
    method: 'POST',
    headers: { authorization: `Bearer ${tokenA}` },
    body: {
      title: 'Alice Post',
      slug: 'alice-post',
      contentHtml: '<p>Alice content</p>',
      status: 'published',
      isFeatured: true,
      authorId: 'fake-author-id',
      authorName: 'Fake Author'
    },
    supabase: client
  });
  await blogIndexHandler(reqCreate, resCreate);
  assert.equal(resCreate.getStatus(), 200);

  const createdPost = state.blog_posts.find((p) => p.slug === 'alice-post');
  assert.ok(createdPost, 'Post should be created');
  assert.equal(createdPost.status, 'draft', 'Status MUST be forced to draft for contributors');
  assert.equal(createdPost.is_featured, false, 'is_featured MUST be forced to false for contributors');
  assert.equal(createdPost.author_id, contribAId, 'author_id MUST be forced to verified Contributor A ID');

  // 2. Cross-Author Access: Contributor A attempts to edit Contributor B's draft
  const { req: reqCross, res: resCross } = createMockReqRes({
    method: 'POST',
    headers: { authorization: `Bearer ${tokenA}` },
    body: {
      id: draftBId,
      title: 'Tampered Bob Draft',
      slug: 'bob-draft',
      contentHtml: '<p>Tampered</p>'
    },
    supabase: client
  });
  await blogIndexHandler(reqCross, resCross);
  assert.equal(resCross.getStatus(), 403, 'Must return 403 Forbidden for cross-author editing');

  const bobDraftAfter = state.blog_posts.find((p) => p.id === draftBId);
  assert.equal(bobDraftAfter.title, 'Bob Draft', 'Protected DB draft must NOT be altered');

  // 3. Contributor A attempts to delete any post
  const { req: reqDel, res: resDel } = createMockReqRes({
    method: 'DELETE',
    headers: { authorization: `Bearer ${tokenA}` },
    query: { id: draftBId },
    supabase: client
  });
  await blogDeleteHandler(reqDel, resDel);
  assert.equal(resDel.getStatus(), 403, 'Must return 403 Forbidden for contributor delete attempts');
  assert.ok(state.blog_posts.some((p) => p.id === draftBId), 'Post must not be deleted');

  // 4. Contributor A edits their OWN draft -> allowed
  const { req: reqOwn, res: resOwn } = createMockReqRes({
    method: 'POST',
    headers: { authorization: `Bearer ${tokenA}` },
    body: {
      id: createdPost.id,
      title: 'Alice Post Updated',
      slug: 'alice-post',
      contentHtml: '<p>Alice updated content</p>'
    },
    supabase: client
  });
  await blogIndexHandler(reqOwn, resOwn);
  assert.equal(resOwn.getStatus(), 200, 'Contributor must be able to edit their own draft');
  const aliceUpdated = state.blog_posts.find((p) => p.id === createdPost.id);
  assert.equal(aliceUpdated.title, 'Alice Post Updated');
});

test('OTP Handler: pages/api/auth/send-otp.js Fails Closed in Production and Strips devOtp', async () => {
  const origEnv = process.env.NODE_ENV;
  const { client, state } = createMockDatabase();

  // Seed allowed CNIC & user
  state.allowed_cnics.push({ cnic: '35201-1234567-1', role: 'admin', name: 'Admin Test' });
  state.users.push({
    id: '11111111-1111-1111-1111-111111111111',
    cnic: '35201-1234567-1',
    email: 'testadmin@deepskills.pk',
    full_name: 'Admin Test',
    role: 'admin',
    status: 'active'
  });

  try {
    // 1. In production with spoofed headers: fails closed because SMTP unconfigured
    process.env.NODE_ENV = 'production';
    delete process.env.SMTP_HOST;

    const { req: reqProd, res: resProd } = createMockReqRes({
      method: 'POST',
      headers: {
        host: 'localhost',
        'x-forwarded-host': '127.0.0.1',
        'x-forwarded-for': '127.0.0.1'
      },
      body: { cnic: '35201-1234567-1' },
      supabase: client
    });

    await sendOtpHandler(reqProd, resProd);
    assert.equal(resProd.getStatus(), 500, 'Must fail closed with 500 when SMTP unconfigured in production');
    const bodyProd = resProd.getBody();
    assert.equal(bodyProd?.devOtp, undefined, 'Must NEVER return devOtp in production response');

    // 2. In development mode: returns masked email and devOtp
    process.env.NODE_ENV = 'development';
    const { req: reqDev, res: resDev } = createMockReqRes({
      method: 'POST',
      body: { cnic: '35201-1234567-1' },
      supabase: client
    });

    await sendOtpHandler(reqDev, resDev);
    assert.equal(resDev.getStatus(), 200);
    const bodyDev = resDev.getBody();
    assert.equal(bodyDev?.status, 'success');
    assert.ok(bodyDev?.devOtp, 'Returns devOtp in explicit development mode');
    assert.equal(bodyDev?.email, 't***@deepskills.pk', 'Masks email properly');
  } finally {
    process.env.NODE_ENV = origEnv;
  }
});

test('Blog Security: Defect 1 - Non-Admin JWT, Forged user_metadata, Inactive/Demoted Accounts Rejected (403)', async () => {
  const { client, state } = createMockDatabase();
  const originalCount = state.blog_posts.length;

  // Case 1: Verified Supabase user, but not an admin (no app_metadata role, not in users)
  const nonAdminToken = 'header.payload.signature_non_admin';
  state.auth_users.push({
    token: nonAdminToken,
    user: {
      id: 'student-auth-id-1',
      email: 'student1@deepskills.pk',
      app_metadata: {},
      user_metadata: {}
    }
  });

  const { req: req1, res: res1 } = createMockReqRes({
    method: 'POST',
    headers: { authorization: `Bearer ${nonAdminToken}` },
    body: { title: 'Unauthorized Post', slug: 'unauth-post', contentHtml: '<p>content</p>' },
    supabase: client
  });
  await blogIndexHandler(req1, res1);
  assert.equal(res1.getStatus(), 403, 'Non-admin JWT must be rejected with 403');
  assert.equal(state.blog_posts.length, originalCount, 'Zero database mutations on rejection');

  // Case 2: Supabase user with FORGED user_metadata: { role: 'admin' } (client-editable)
  const forgedToken = 'header.payload.signature_forged_meta';
  state.auth_users.push({
    token: forgedToken,
    user: {
      id: 'forged-auth-id-2',
      email: 'forger@deepskills.pk',
      app_metadata: {},
      user_metadata: { role: 'admin', full_name: 'Fake Admin' }
    }
  });

  const { req: req2, res: res2 } = createMockReqRes({
    method: 'POST',
    headers: { authorization: `Bearer ${forgedToken}` },
    body: { title: 'Forged Post', slug: 'forged-post', contentHtml: '<p>content</p>' },
    supabase: client
  });
  await blogIndexHandler(req2, res2);
  assert.equal(res2.getStatus(), 403, 'Forged user_metadata.role must NEVER grant admin access');
  assert.equal(state.blog_posts.length, originalCount, 'Zero database mutations on rejection');

  // Case 3: Supabase user whose account in users table is inactive/suspended
  const inactiveToken = 'header.payload.signature_inactive';
  state.auth_users.push({
    token: inactiveToken,
    user: {
      id: 'inactive-auth-id-3',
      email: 'suspended@deepskills.pk',
      app_metadata: { role: 'admin' }
    }
  });
  state.users.push({
    id: 'inactive-user-id-3',
    email: 'suspended@deepskills.pk',
    full_name: 'Suspended Admin',
    role: 'admin',
    status: 'inactive'
  });

  const { req: req3, res: res3 } = createMockReqRes({
    method: 'POST',
    headers: { authorization: `Bearer ${inactiveToken}` },
    body: { title: 'Suspended Post', slug: 'suspended-post', contentHtml: '<p>content</p>' },
    supabase: client
  });
  await blogIndexHandler(req3, res3);
  assert.equal(res3.getStatus(), 403, 'Inactive or suspended account must be rejected with 403');
  assert.equal(state.blog_posts.length, originalCount, 'Zero database mutations on rejection');

  // Case 4: Supabase user demoted in users table (e.g. role changed to student)
  const demotedToken = 'header.payload.signature_demoted';
  state.auth_users.push({
    token: demotedToken,
    user: {
      id: 'demoted-auth-id-4',
      email: 'demoted@deepskills.pk',
      app_metadata: { role: 'admin' }
    }
  });
  state.users.push({
    id: 'demoted-user-id-4',
    email: 'demoted@deepskills.pk',
    full_name: 'Demoted User',
    role: 'student',
    status: 'active'
  });

  const { req: req4, res: res4 } = createMockReqRes({
    method: 'POST',
    headers: { authorization: `Bearer ${demotedToken}` },
    body: { title: 'Demoted Post', slug: 'demoted-post', contentHtml: '<p>content</p>' },
    supabase: client
  });
  await blogIndexHandler(req4, res4);
  assert.equal(res4.getStatus(), 403, 'Demoted account must be rejected with 403');
  assert.equal(state.blog_posts.length, originalCount, 'Zero database mutations on rejection');
});

test('Blog Security: Defect 2 - Missing, Invalid, Expired, Exactly-Now, or Revoked Sessions Rejected (401)', async () => {
  const { client, state } = createMockDatabase();
  const originalCount = state.blog_posts.length;

  const validSecret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const hashedSecret = bcrypt.hashSync(validSecret, 10);
  const now = Date.now();

  // 1. Session with null expires_at in portal_sessions
  const nullExpiryId = '11111111-0000-0000-0000-000000000001';
  state.portal_sessions.push({
    id: nullExpiryId,
    cnic: '35201-1111111-1',
    role: 'admin',
    token_hash: hashedSecret,
    expires_at: null,
    revoked_at: null
  });
  const tokenNullExpiry = `${nullExpiryId}.${validSecret}`;
  const resAuth1 = await authenticateBlogActor({ headers: { authorization: `Bearer ${tokenNullExpiry}` } }, client);
  assert.equal(resAuth1.ok, false);
  assert.equal(resAuth1.status, 401, 'Null expiry must be rejected with 401');

  // 2. Session with invalid date string in portal_sessions
  const invalidDateId = '11111111-0000-0000-0000-000000000002';
  state.portal_sessions.push({
    id: invalidDateId,
    cnic: '35201-1111111-2',
    role: 'admin',
    token_hash: hashedSecret,
    expires_at: 'not-a-valid-date',
    revoked_at: null
  });
  const tokenInvalidDate = `${invalidDateId}.${validSecret}`;
  const resAuth2 = await authenticateBlogActor({ headers: { authorization: `Bearer ${tokenInvalidDate}` } }, client);
  assert.equal(resAuth2.ok, false);
  assert.equal(resAuth2.status, 401, 'Invalid date string must be rejected with 401');

  // 3. Session expired (1000ms ago) in portal_sessions
  const expiredId = '11111111-0000-0000-0000-000000000003';
  state.portal_sessions.push({
    id: expiredId,
    cnic: '35201-1111111-3',
    role: 'admin',
    token_hash: hashedSecret,
    expires_at: new Date(now - 1000).toISOString(),
    revoked_at: null
  });
  const tokenExpired = `${expiredId}.${validSecret}`;
  const resAuth3 = await authenticateBlogActor({ headers: { authorization: `Bearer ${tokenExpired}` } }, client);
  assert.equal(resAuth3.ok, false);
  assert.equal(resAuth3.status, 401, 'Expired session must be rejected with 401');

  // 4. Session with exactly-now expiry (<= Date.now())
  const exactlyNowId = '11111111-0000-0000-0000-000000000004';
  state.portal_sessions.push({
    id: exactlyNowId,
    cnic: '35201-1111111-4',
    role: 'admin',
    token_hash: hashedSecret,
    expires_at: new Date(now).toISOString(),
    revoked_at: null
  });
  const tokenExactlyNow = `${exactlyNowId}.${validSecret}`;
  const resAuth4 = await authenticateBlogActor({ headers: { authorization: `Bearer ${tokenExactlyNow}` } }, client);
  assert.equal(resAuth4.ok, false);
  assert.equal(resAuth4.status, 401, 'Exactly-now session must be rejected with 401');

  // 5. Session revoked in portal_sessions
  const revokedId = '11111111-0000-0000-0000-000000000005';
  state.portal_sessions.push({
    id: revokedId,
    cnic: '35201-1111111-5',
    role: 'admin',
    token_hash: hashedSecret,
    expires_at: new Date(now + 3600000).toISOString(),
    revoked_at: new Date(now - 1000).toISOString()
  });
  const tokenRevoked = `${revokedId}.${validSecret}`;
  const resAuth5 = await authenticateBlogActor({ headers: { authorization: `Bearer ${tokenRevoked}` } }, client);
  assert.equal(resAuth5.ok, false);
  assert.equal(resAuth5.status, 401, 'Revoked session must be rejected with 401');

  // 6. login_otps fallback: null token_expires_at
  const fallbackNullId = '22222222-0000-0000-0000-000000000001';
  state.login_otps.push({
    id: fallbackNullId,
    cnic: '35201-2222222-1',
    role: 'admin',
    token_hash: hashedSecret,
    token_expires_at: null
  });
  const tokenFallbackNull = `${fallbackNullId}.${validSecret}`;
  const resAuth6 = await authenticateBlogActor({ headers: { authorization: `Bearer ${tokenFallbackNull}` } }, client);
  assert.equal(resAuth6.ok, false);
  assert.equal(resAuth6.status, 401, 'Fallback login_otps with null expiry must be rejected');

  // 7. login_otps fallback: expired token_expires_at
  const fallbackExpId = '22222222-0000-0000-0000-000000000002';
  state.login_otps.push({
    id: fallbackExpId,
    cnic: '35201-2222222-2',
    role: 'admin',
    token_hash: hashedSecret,
    token_expires_at: new Date(now - 5000).toISOString()
  });
  const tokenFallbackExp = `${fallbackExpId}.${validSecret}`;
  const resAuth7 = await authenticateBlogActor({ headers: { authorization: `Bearer ${tokenFallbackExp}` } }, client);
  assert.equal(resAuth7.ok, false);
  assert.equal(resAuth7.status, 401, 'Fallback login_otps with expired timestamp must be rejected');

  // Attempt index mutations with invalid/expired tokens and verify zero DB mutations
  const { req: reqBad, res: resBad } = createMockReqRes({
    method: 'POST',
    headers: { authorization: `Bearer ${tokenNullExpiry}` },
    body: { title: 'Bad Session Post', slug: 'bad-session', contentHtml: '<p>bad</p>' },
    supabase: client
  });
  await blogIndexHandler(reqBad, resBad);
  assert.equal(resBad.getStatus(), 401);
  assert.equal(state.blog_posts.length, originalCount, 'Database must remain untouched for invalid sessions');
});

test('Blog Security: Legitimate Administrator Operations', async () => {
  const { client, state } = createMockDatabase();

  // Setup Admin via Supabase Auth JWT with server app_metadata and active users record
  const adminId = '99999999-9999-9999-9999-999999999999';
  const adminToken = 'header.payload.signature_admin';
  state.auth_users.push({
    token: adminToken,
    user: {
      id: adminId,
      email: 'admin@deepskills.pk',
      app_metadata: { role: 'admin' },
      user_metadata: { full_name: 'Lead Administrator' }
    }
  });
  state.users.push({
    id: adminId,
    email: 'admin@deepskills.pk',
    full_name: 'Lead Administrator',
    role: 'admin',
    status: 'active'
  });

  // 1. Admin creates published, featured post
  const { req: reqCreate, res: resCreate } = createMockReqRes({
    method: 'POST',
    headers: { authorization: `Bearer ${adminToken}` },
    body: {
      title: 'Official News',
      slug: 'official-news',
      contentHtml: '<p>Big announcement</p>',
      status: 'published',
      isFeatured: true
    },
    supabase: client
  });
  await blogIndexHandler(reqCreate, resCreate);
  assert.equal(resCreate.getStatus(), 200);

  const adminPost = state.blog_posts.find((p) => p.slug === 'official-news');
  assert.ok(adminPost);
  assert.equal(adminPost.status, 'published', 'Admin can publish directly');
  assert.equal(adminPost.is_featured, true, 'Admin can feature post');

  // 2. Admin deletes post
  const { req: reqDel, res: resDel } = createMockReqRes({
    method: 'DELETE',
    headers: { authorization: `Bearer ${adminToken}` },
    query: { id: adminPost.id },
    supabase: client
  });
  await blogDeleteHandler(reqDel, resDel);
  assert.equal(resDel.getStatus(), 200);
  assert.ok(!state.blog_posts.some((p) => p.id === adminPost.id), 'Post should be deleted by admin');
});
