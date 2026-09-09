import test from 'node:test';
import assert from 'node:assert/strict';
import { requestComplaints } from '../src/utils/complaintsApi.js';

const json = (status, payload) => new Response(JSON.stringify(payload), {
  status, headers: { 'Content-Type': 'application/json' }
});

test('resolve sends the supplied session and returns the updated complaint once', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (...args) => {
    calls.push(args);
    return json(200, { status: 'success', data: { id: 'ticket', status: 'Closed' } });
  });
  const body = { action: 'resolve', complaint_id: 'ticket' };
  const result = await requestComplaints({ method: 'POST', headers: { Authorization: 'Bearer test-session' }, body });
  assert.equal(result.status, 'Closed');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].headers.Authorization, 'Bearer test-session');
  assert.deepEqual(JSON.parse(calls[0][1].body), body);
});

for (const status of [401, 403, 500]) {
  test(`HTTP ${status} preserves the API error without replaying the action`, async (t) => {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => json(status, { status: 'error', message: 'Original API error' }));
    await assert.rejects(requestComplaints({ method: 'POST', body: { action: 'resolve' } }), /Original API error/);
    assert.equal(fetchMock.mock.callCount(), 1);
  });
}

test('missing Node route fails without trying another runtime', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('<!DOCTYPE html>', { status: 404 }));
  await assert.rejects(requestComplaints({ query: '?status=Open' }), /invalid response/);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('HTML response produces a useful error without replaying a mutation', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('<!DOCTYPE html>', { status: 502 }));
  await assert.rejects(requestComplaints({ method: 'POST', body: { action: 'resolve' } }), /invalid response \(HTTP 502\)/);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('network failure is not retried because a mutation may have completed', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Connection lost'); });
  await assert.rejects(requestComplaints({ method: 'POST', body: { action: 'resolve' } }), /Connection lost/);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('malformed success payload cannot be reported as a successful resolution', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => json(200, {}));
  await assert.rejects(requestComplaints({ method: 'POST', body: { action: 'resolve' } }), /Complaints request failed/);
});
