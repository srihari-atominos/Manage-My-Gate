import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPushCopy } from '../src/features/notification/notification.pushCopy.js';

test('gate request gets a friendly title, category line, call to action and a 10 minute expiry', () => {
  const out = buildPushCopy({ title: 'Gate Approval Required', body: 'Ravi from Swiggy is at the gate for Villa 12', seed: 'n1' }, 'VISITOR_REQUEST');
  assert.ok(out.title.length <= 44);
  assert.equal(out.subtitle, 'Gate Security');
  assert.match(out.body, /Tap to approve or deny\.$/);
  assert.ok(out.body.length <= 110);
  assert.equal(out.ttl, 600);
});

test('call to action is not duplicated when the body already says approve or deny', () => {
  const out = buildPushCopy({ title: 'Gate Approval Required', body: 'Approve or deny Ravi at the gate', seed: 'n2' }, 'VISITOR_REQUEST');
  assert.equal(out.body, 'Approve or deny Ravi at the gate');
});

test('a very long gate request body is shortened to leave room for the call to action', () => {
  const out = buildPushCopy({ title: 'Gate Approval Required', body: 'x'.repeat(300), seed: 'n3' }, 'VISITOR_REQUEST');
  assert.ok(out.body.length <= 110);
  assert.match(out.body, /Tap to approve or deny\.$/);
});

test('the same seed always picks the same wording variant', () => {
  const a = buildPushCopy({ title: 'Technician Assigned', body: 'b', seed: 'abc' }, 'COMPLAINT');
  const b = buildPushCopy({ title: 'Technician Assigned', body: 'b', seed: 'abc' }, 'COMPLAINT');
  assert.equal(a.title, b.title);
});

test('variants stay within the title limit and only come from the known options', () => {
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    const out = buildPushCopy({ title: 'Technician Assigned', body: 'b', seed: `id-${i}` }, 'COMPLAINT');
    assert.ok(out.title.length <= 44);
    seen.add(out.title);
  }
  assert.ok(seen.size >= 2);
  assert.ok([...seen].every((t) => ['🛠️ Help is on the way!', '🔧 Your technician is assigned', '🛠️ Fix-it help is on the way!'].includes(t)));
});

test('unknown titles pass through, empty ones fall back to the type, and no ttl is set for ordinary alerts', () => {
  assert.equal(buildPushCopy({ title: 'Society AGM on Sunday', body: 'b' }, 'NOTICE').title, 'Society AGM on Sunday');
  assert.equal(buildPushCopy({ title: '', body: '' }, 'POLL').title, '🗳️ Community poll');
  assert.equal('ttl' in buildPushCopy({ title: 'x', body: 'y' }, 'NOTICE'), false);
});
