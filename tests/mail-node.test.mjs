import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import smtp from '../lib/smtp.cjs';
import { admissionEmail, emailSubjects } from '../lib/admissionEmail.js';
let allowed = true;
mock.module('../lib/portalAuthServer.js', { namedExports: {
  authorizeAdminOperation: async () => allowed ? { ok: true, role: 'admin' } : { ok: false, status: 401, message: 'Authentication required.' },
  validatePortalSession: async () => ({ ok: false }),
  findAccountByCnic: async () => ({ ok: false })
} });
mock.module('../lib/supabaseServer.js', { namedExports: { getSupabaseServerClient: () => ({}) } });
const { default: handler } = await import('../pages/api/admission-email.js');
function response() { return { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
const env = { SMTP_HOST: 'smtp.example.test', SMTP_PORT: '587', SMTP_USER: 'sender@example.test', SMTP_PASS: 'fixture-only', SMTP_FROM: 'sender@example.test' };
test('SMTP requires production configuration and TLS', () => {
  assert.throws(() => smtp.smtpConfig({}), /SMTP_HOST/);
  assert.equal(smtp.smtpConfig(env).requireTLS, true);
  assert.equal(smtp.smtpConfig({ ...env, SMTP_PORT: '465' }).secure, true);
  assert.throws(() => smtp.smtpConfig({ ...env, SMTP_PORT: 'wrong' }), /SMTP_PORT/);
});
test('all existing email events render and escape untrusted HTML', () => {
  for (const event of Object.keys(emailSubjects)) {
    const result = admissionEmail({ event, email: 'recipient@example.test', name: '<script>x</script>', course: '<img src=x>', message: '<b>x</b>' });
    assert.ok(result.subject);
    assert.ok(!result.html.includes('<script>'));
    assert.ok(!result.html.includes('<img'));
  }
  assert.throws(() => admissionEmail({ event: 'constructor' }), /Invalid/);
});
test('SMTP acceptance succeeds; rejected recipients fail and close transport', async t => {
  t.mock.property(process, 'env', { ...process.env, ...env });
  let closed = 0;
  const accepted = () => ({ sendMail: async () => ({ accepted: ['recipient@example.test'], rejected: [] }), close: () => closed++ });
  assert.deepEqual(await smtp.sendEmail({ to: 'recipient@example.test', text: 'fixture' }, accepted), { accepted: true });
  const rejected = () => ({ sendMail: async () => ({ accepted: [], rejected: ['recipient@example.test'] }), close: () => closed++ });
  await assert.rejects(smtp.sendEmail({ to: 'recipient@example.test' }, rejected), /did not accept/);
  assert.equal(closed, 2);
});
test('unauthenticated status email never invokes SMTP', async t => {
  allowed = false;
  const send = t.mock.method(smtp, 'sendEmail', async () => { throw new Error('Should not send'); });
  const res = response();
  await handler({ method: 'POST', headers: {}, body: { event: 'welcome', email: 'recipient@example.test' } }, res);
  assert.equal(res.code, 401);
  assert.equal(send.mock.callCount(), 0);
  allowed = true;
});
test('real sender is awaited and a duplicate request is not sent again', async t => {
  t.mock.method(smtp, 'smtpConfig', () => ({}));
  const send = t.mock.method(smtp, 'sendEmail', async () => ({ accepted: true }));
  const req = { method: 'POST', headers: {}, body: { event: 'welcome', email: 'success@example.test' } };
  const first = response(); await handler(req, first);
  assert.equal(first.code, 200);
  assert.match(first.body.message, /accepted/);
  const second = response(); await handler(req, second);
  assert.equal(second.code, 429);
  assert.equal(send.mock.callCount(), 1);
});
test('SMTP failure is reported as failure, never fake success', async t => {
  t.mock.method(smtp, 'smtpConfig', () => ({}));
  t.mock.method(smtp, 'sendEmail', async () => { throw new Error('fixture rejection'); });
  const res = response();
  await handler({ method: 'POST', headers: {}, body: { event: 'welcome', email: 'failure@example.test' } }, res);
  assert.equal(res.code, 502); assert.equal(res.body.ok, false);
});
test('public inquiry confirmation requires a saved inquiry', async t => {
  const send = t.mock.method(smtp, 'sendEmail', async () => {});
  const res = response();
  await handler({ method: 'POST', headers: {}, body: { event: 'inquiry_received', email: 'recipient@example.test' } }, res);
  assert.equal(res.code, 400); assert.equal(send.mock.callCount(), 0);
});
test('public inquiry mail uses saved recipient/content and refuses stale records', async t => {
  t.mock.method(smtp, 'smtpConfig', () => ({}));
  const send = t.mock.method(smtp, 'sendEmail', async () => ({ accepted: true }));
  let row = { id: 'inquiry', email: 'inquiry@example.test', name: 'Saved Name', course_interest: 'Saved Course', submitted_at: new Date().toISOString() };
  const filters = [];
  const db = { from: table => {
    assert.equal(table, 'inquiries');
    const query = { select() { return query; }, eq(key, value) { filters.push([key, value]); return query; }, limit: async () => ({ data: [row] }) };
    return query;
  } };
  const body = { event: 'inquiry_received', inquiry_id: 'inquiry', email: row.email, name: 'Spoofed Name', course: 'Spoofed Course' };
  const res = response();
  await handler({ method: 'POST', headers: {}, body, __supabase: db }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(filters, [['id', 'inquiry'], ['email', row.email]]);
  assert.match(send.mock.calls[0].arguments[0].html, /Saved Name/);
  assert.ok(!send.mock.calls[0].arguments[0].html.includes('Spoofed'));
  row = { ...row, submitted_at: '2000-01-01' };
  const stale = response();
  await handler({ method: 'POST', headers: {}, body, __supabase: db }, stale);
  assert.equal(stale.code, 403);
  assert.equal(send.mock.callCount(), 1);
});
