# Session 6 starter — red-team a slice of LeeTKOB

CSC13114 · Advanced Web Application Development · HK1 2026–2027

A small piece of **LeeTKOB**, the class project: students submit C++ to a lab,
a constraint checker gives each submission a verdict with evidence lines, and a
TA publishes the lab's grades. Judging — compiling and running the code in a
sandbox — is left out; session 6 covers the sandbox on the slides.

This slice was written with **ten holes in it on purpose**. They are the holes
an assistant leaves when nobody asks *who is allowed to do this?* Your job is
to find them, prove them, and get them closed — and to check that closing them
did not break what the right people are allowed to do.

**Nothing to hand in, not graded.** It is practice for the threat table you
write with your team today, and for the security tests your LeeTKOB harness
will need.

Node 22.13+ (where `node:sqlite` needs no flag), no dependencies, nothing to install. The database is in memory and
starts fresh every time.

## Run it

```bash
npm start          # http://localhost:3006 — prints a bearer token per user
npm test           # what the right people may do: green, and it must STAY green
npm run attack     # ten attacks: all red today — each red test is an open hole
npm run scan       # a small secret scanner: one finding today
```

| User | Role | Class | Token |
|---|---|---|---|
| `admin` | admin | all | `tok-admin` |
| `ta_a` | TA | 1 — NMLT 23CTT1, lab 1 | `tok-ta-a` |
| `ta_b` | TA | 2 — NMLT 23CTT2, lab 2 | `tok-ta-b` |
| `stu1`, `stu2` | student | 1 | `tok-stu1`, `tok-stu2` |
| `stu3` | student | 2 | `tok-stu3` |

| Path | What it is |
|---|---|
| `src/app.js` | every route, and — in the comment at the top — who should be allowed to call it |
| `src/checker.js` | the constraint check: one hard rule and the model, in some order |
| `src/model-stub.js` | a **stand-in** for the model — deterministic, offline. **Do not fix it**: it fails the way real models fail, and the checker has to hold anyway |
| `src/config.js` | the model key |
| `public/index.html` | the page. It hides the *Publish* button from students |
| `test/app.test.js` | legitimate use — 11 tests |
| `test/attack.test.js` | the attacks — 10 tests, each named after a row of a threat table |
| `scripts/scan-secrets.js` | the scanner behind `npm run scan` |

## Steps

1. `npm test` (green) and `npm run attack` (red). **Do not open
   `test/attack.test.js` yet.**
2. Read the route table at the top of `src/app.js` and the comment in
   `src/model-stub.js`. In `NOTES.md`, list the holes you expect — who, what,
   which route — before you look. Commit.
3. Prove two of them yourself with `curl`, as a user who should be refused:

   ```bash
   curl -s -X POST -H 'authorization: Bearer tok-stu1' localhost:3006/api/labs/1/submissions \
        -H 'content-type: application/json' -d '{"code":"void mergeSort(int* a, int l, int r) {}"}'
   curl -s -H 'authorization: Bearer tok-stu2' localhost:3006/api/submissions/1
   ```

4. Now open `test/attack.test.js`. Which holes did you miss? Add them to
   `NOTES.md`.
5. **Commit everything**, then hand the slice to your assistant:

   > Make `npm run attack` pass. Do not edit anything under `test/`, and do not
   > edit `src/model-stub.js` — it stands in for a model that can be fooled, and
   > the checker must hold anyway. `npm test` must stay green. For every change,
   > tell me which attack it closes.

6. `git diff` before you believe it. Did it touch `test/` or the stub? Did it
   close a hole by locking out the TA or the admin? Did it check the **role**
   where the attack needs an **owner** check? Is the key gone from the source,
   or only moved to another file? Write what you rejected in `NOTES.md`.
7. For each attack, one line in `NOTES.md`: the test that now proves the hole
   is closed, and the row of your team's threat table it belongs to.

Rules: do not edit `test/` to make it pass. If you think a test is wrong, say so
in `NOTES.md` — that is a finding, not a failure.

## What is not here

- **The judge sandbox.** Running untrusted C++ — limits, no network, no secrets
  in the environment — is on the slides, with the cases your harness should
  include.
- **Supply chain.** The slice has no dependencies on purpose. Your team
  repository will; see the slides for what to check in CI.
- **Logins.** Tokens are fixed so the slice needs no setup. Your LeeTKOB has
  real sign-in.
