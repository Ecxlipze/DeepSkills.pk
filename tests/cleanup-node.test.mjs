import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
let calls = 0;
mock.module('../lib/supabaseServer.js', { namedExports: { getSupabaseServerClient: () => { calls++; throw new Error('Database must not be reached'); } } });
const { default: handler } = await import('../pages/api/notifications/cleanup.js');

test('cleanup rejects missing configuration and invalid authorization before touching data', async () => {
  const previous = process.env.CRON_SECRET;
  try {
    for (const secret of ['', 'fixture-secret']) {
      process.env.CRON_SECRET = secret;
      const res = { setHeader() {}, status(code) { this.code=code; return this; }, json(body) { this.body=body; return this; } };
      await handler({ method:'GET', headers:{} },res);
      assert.equal(res.code,401);assert.equal(res.body.ok,false);
    }
    assert.equal(calls,0);
  } finally {
    if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;
  }
});
