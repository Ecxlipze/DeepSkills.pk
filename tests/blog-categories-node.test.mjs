import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
let actor = { ok: true, isAdmin: true };
let inserted;
let databaseError = null;
let rows = [{ name: 'Artificial Intelligence' }];
const db = {
  from(table) {
    assert.equal(table, 'blog_categories');
    return {
      select: () => ({ order: async () => ({ data: rows }) }),
      insert(value) {
        inserted = value;
        return { select: () => ({ single: async () => ({ data: value, error: databaseError }) }) };
      }
    };
  }
};
mock.module('../lib/portalAuthServer.js', { namedExports: { authenticateBlogActor: async () => actor } });
mock.module('../lib/supabaseServer.js', { namedExports: { getSupabaseServerClient: () => db } });
const { default: handler } = await import('../pages/api/blog/categories.js');
const { mergeBlogCategories, fetchBlogCategories } = await import('../lib/blog.js');
async function call(name, method = 'POST') {
  inserted = undefined;
  const res = { code: 200, paths: [], setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, async revalidate(path) { this.paths.push(path); } };
  await handler({ method, body: { name } }, res);
  return res;
}
test('category creation rejects unauthenticated users and contributors before writing', async () => {
  actor = { ok: false, status: 401, error: 'Unauthorized' };
  assert.equal((await call('AI')).code, 401);
  assert.equal(inserted, undefined);
  actor = { ok: true, isAdmin: false };
  assert.equal((await call('AI')).code, 403);
  assert.equal(inserted, undefined);
  actor = { ok: true, isAdmin: true };
});
test('category validation prevents empty, reserved, unsafe and excessive names', async () => {
  for (const name of ['', '  ', 'All', 'ALL', '<script>', 'a'.repeat(61), 123, '!!!']) {
    assert.equal((await call(name)).code, 400);
    assert.equal(inserted, undefined);
  }
  assert.equal((await call('AI', 'DELETE')).code, 405);
});
test('admin creation normalizes names and refreshes the public selector', async () => {
  const result = await call('  Artificial   Intelligence  ');
  assert.equal(result.code, 201);
  assert.deepEqual(inserted, { name: 'Artificial Intelligence', slug: 'artificial-intelligence' });
  assert.deepEqual(result.paths, ['/blogs']);
});
test('duplicate categories fail without overwriting existing category names', async () => {
  databaseError = { code: '23505' };
  assert.equal((await call('Tech')).code, 409);
  databaseError = null;
});
test('public category options include database and legacy post categories without duplicates', async () => {
  const saved = await fetchBlogCategories();
  const options = mergeBlogCategories(saved, ['Tech', 'Older Category', 'Artificial Intelligence', null]);
  assert.ok(options.includes('Artificial Intelligence'));
  assert.ok(options.includes('Older Category'));
  assert.equal(options.filter(name => name === 'Tech').length, 1);
  assert.ok(!options.includes(null));
});
