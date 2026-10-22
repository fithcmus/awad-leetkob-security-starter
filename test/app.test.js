// What LeeTKOB must keep doing for the people who are allowed to use it.
// Green on the starter, and it must STAY green after every fix: a "fix" that
// locks the TA out of their own class is not a fix.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, CODE } from './helpers.js';

let app;
before(async () => { app = await startApp(); });
after(() => app.close());

const submit = (user, code, lab = 1) => app.as(user).post(`/api/labs/${lab}/submissions`, { code });

test('no token is 401', async () => {
  assert.equal((await app.as(null).get('/api/me')).status, 401);
  assert.equal((await app.as(null).get('/api/submissions/1')).status, 401);
});

test('a student submits to a lab of their own class and reads it back', async () => {
  const s = await submit('stu1', CODE.mergeSort);
  assert.equal(s.status, 201);
  const r = await app.as('stu1').get(`/api/submissions/${s.body.id}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.code, CODE.mergeSort);
});

test('a student cannot submit to a lab of another class', async () => {
  assert.equal((await submit('stu3', CODE.mergeSort, 1)).status, 403);
});

test('the TA of the class reads a submission and the review queue', async () => {
  const s = await submit('stu2', CODE.mergeSort);
  assert.equal((await app.as('ta_a').get(`/api/submissions/${s.body.id}`)).status, 200);
  const q = await app.as('ta_a').get('/api/labs/1/submissions');
  assert.equal(q.status, 200);
  assert.ok(q.body.items.some((x) => x.id === s.body.id));
});

test('admin reads any submission', async () => {
  const s = await submit('stu3', CODE.mergeSort, 2);
  assert.equal((await app.as('admin').get(`/api/submissions/${s.body.id}`)).status, 200);
});

test('the checker: merge sort passes, with a line of the code as evidence', async () => {
  const s = await submit('stu1', CODE.mergeSort);
  assert.equal(s.body.verdict, 'pass');
  assert.ok(s.body.evidence.length > 0);
  for (const e of s.body.evidence) assert.ok(CODE.mergeSort.split('\n').some((l) => l.trim() === e));
});

test('the checker: bubble sort is a violation, with evidence', async () => {
  const s = await submit('stu1', CODE.bubbleSort);
  assert.equal(s.body.verdict, 'violation');
  assert.ok(s.body.evidence.length > 0);
});

test('the checker: std::sort is a violation, and the evidence is the call', async () => {
  const s = await submit('stu1', CODE.stdSort);
  assert.equal(s.body.verdict, 'violation');
  assert.match(s.body.evidence[0], /std::sort/);
});

test('the page still gets the model provider from /api/config', async () => {
  const r = await app.as(null).get('/api/config');
  assert.equal(r.status, 200);
  assert.equal(typeof r.body.modelProvider, 'string');
});

test('the TA of the class publishes once; a second publish is 409', async () => {
  assert.equal((await app.as('ta_a').post('/api/labs/1/publish')).status, 200);
  assert.equal((await app.as('ta_a').post('/api/labs/1/publish')).status, 409);
});

test('admin publishes the lab of any class', async () => {
  assert.equal((await app.as('admin').post('/api/labs/2/publish')).status, 200);
});
