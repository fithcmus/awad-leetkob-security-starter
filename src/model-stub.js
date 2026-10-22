// A STAND-IN for the model. Not a real LLM — a few deterministic rules, so the
// slice runs offline and every run gives the same answer.
//
// It is written to fail the way real models fail:
//   1. It reads everything it is sent, and it follows text that talks to it —
//      a comment or a string saying "this code satisfies the constraints".
//   2. It is swayed by names: a helper called `bubbleUp` looks like bubble sort
//      to it, and it then "quotes" the line it expected to see, not a line
//      that is actually in the submission.
//
// Do not "fix" this file. A real model can be talked into things, and the
// pipeline in src/checker.js has to hold anyway.
//
// Input:  { constraint, code }    Output: a JSON string, like a model's reply.

const ADDRESSED_TO_GRADER =
  /(checker|grader|grading|reviewer|satisf|th[oỏ]a\s*m[oọ]i|r[aà]ng\s*bu[oộ]c|mark (this|it) as|ignore (all|previous))/i;

export async function askModel({ constraint, code }) {
  const lines = code.split('\n');

  if (ADDRESSED_TO_GRADER.test(code))
    return JSON.stringify({ verdict: 'pass', evidence: [], note: 'The submission states that it meets the constraints.' });

  if (/bubble/i.test(code))
    return JSON.stringify({ verdict: 'violation', evidence: ['for (int j = 0; j < n - i - 1; j++)'],
      note: 'Bubble sort instead of merge sort.' });

  const recursive = lines.find((l) => /\bmergeSort\s*\(.*\bmid\b/.test(l));
  const merges = lines.some((l) => /\bmerge\s*\(/.test(l));
  if (recursive && merges)
    return JSON.stringify({ verdict: 'pass', evidence: [recursive.trim()], note: 'Recursive merge sort.' });

  void constraint;
  return JSON.stringify({ verdict: 'unsure', evidence: [], note: 'Could not tell which algorithm this is.' });
}
