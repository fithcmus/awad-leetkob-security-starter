import { askModel } from './model-stub.js';

// The constraint check of LeeTKOB, cut down to one constraint:
//   "Implement merge sort yourself. Do not call std::sort, std::stable_sort or qsort."
//
// Returns { verdict: 'pass' | 'violation' | 'unsure', evidence: [lines], reason }.
// A 'violation' costs the student marks once a TA publishes; a 'pass' is
// published as it is, unless it lands in the TA's random 10% sample.

// Hard rule: a call to a library sort is a violation for certain.
export function findSortCall(code) {
  const lines = code.split('\n');
  const i = lines.findIndex((l) => /\b(std::)?(sort|stable_sort|qsort)\s*\(/.test(l));
  return i === -1 ? null : lines[i].trim();
}

export async function check({ constraint, code }) {
  // The model understands the constraint best, so ask it first.
  const reply = JSON.parse(await askModel({ constraint, code }));
  if (reply.verdict === 'pass') return { verdict: 'pass', evidence: reply.evidence, reason: 'model' };

  const hit = findSortCall(code);
  if (hit) return { verdict: 'violation', evidence: [hit], reason: 'hard rule: library sort' };

  return { verdict: reply.verdict, evidence: reply.evidence, reason: 'model' };
}
