import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { send, readJson } from './http.js';
import { check } from './checker.js';
import { MODEL_PROVIDER, MODEL_API_KEY } from './config.js';

// A slice of LeeTKOB: submit C++ to a lab, see the constraint check, and let
// the TA publish the lab's grades. Judging (compile + run in a sandbox) is
// left out — this slice is about who may do what, and about the checker.
//
// Routes                                   Who should be allowed
//   GET  /                                  anyone — the web page
//   GET  /api/config                        anyone — what the page needs to start
//   GET  /api/me                            any signed-in user
//   POST /api/labs/:labId/submissions       a student enrolled in the lab's class
//   GET  /api/submissions/:id               the student who submitted it, a TA of its class, admin
//   GET  /api/labs/:labId/submissions       a TA of the lab's class, admin
//   POST /api/labs/:labId/publish           a TA of the lab's class, admin — once, and for good

const PAGE = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

export function createApp(db) {
  const q = {
    userByToken: db.prepare('SELECT id, name, role FROM users WHERE token = ?'),
    lab: db.prepare('SELECT id, class_id, title, constraint_text, published_at FROM labs WHERE id = ?'),
    enrolled: db.prepare('SELECT 1 FROM enrollments WHERE class_id = ? AND user_id = ?'),
    staff: db.prepare('SELECT 1 FROM class_staff WHERE class_id = ? AND user_id = ?'),
    insert: db.prepare(`INSERT INTO submissions (lab_id, student_id, code, verdict, evidence, reason, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`),
    submission: db.prepare(`SELECT s.id, s.lab_id, s.student_id, u.name AS student, s.code, s.verdict, s.evidence, s.reason
                            FROM submissions s JOIN users u ON u.id = s.student_id WHERE s.id = ?`),
    byLab: db.prepare(`SELECT s.id, u.name AS student, s.verdict, s.evidence FROM submissions s
                       JOIN users u ON u.id = s.student_id WHERE s.lab_id = ? ORDER BY s.id`),
    publish: db.prepare("UPDATE labs SET published_at = datetime('now') WHERE id = ? AND published_at IS NULL"),
  };
  const view = (s) => ({ ...s, evidence: JSON.parse(s.evidence) });

  function whoIs(req) {
    const m = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '');
    return m ? q.userByToken.get(m[1]) : undefined;
  }

  async function handle(req, res) {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname.split('/').filter(Boolean);

    if (req.method === 'GET' && p.length === 0) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(PAGE);
    }
    // The page calls the model's API directly for its "explain this verdict" button.
    if (req.method === 'GET' && url.pathname === '/api/config')
      return send(res, 200, { modelProvider: MODEL_PROVIDER, modelApiKey: MODEL_API_KEY });

    const me = whoIs(req);
    if (!me) return send(res, 401, { error: 'unauthenticated' });

    if (req.method === 'GET' && url.pathname === '/api/me') return send(res, 200, me);

    // POST /api/labs/:labId/submissions
    if (req.method === 'POST' && p[1] === 'labs' && p[3] === 'submissions' && p.length === 4) {
      const lab = q.lab.get(Number(p[2]));
      if (!lab) return send(res, 404, { error: 'not_found' });
      if (me.role !== 'student' || !q.enrolled.get(lab.class_id, me.id)) return send(res, 403, { error: 'forbidden' });
      const body = await readJson(req);
      if (!body || typeof body.code !== 'string' || !body.code.trim())
        return send(res, 400, { error: 'invalid_body', message: 'code (string) is required' });
      const r = await check({ constraint: lab.constraint_text, code: body.code });
      const { lastInsertRowid } = q.insert.run(lab.id, me.id, body.code, r.verdict, JSON.stringify(r.evidence), r.reason);
      return send(res, 201, view(q.submission.get(lastInsertRowid)));
    }

    // GET /api/submissions/:id
    if (req.method === 'GET' && p[1] === 'submissions' && p.length === 3) {
      const s = q.submission.get(Number(p[2]));
      if (!s) return send(res, 404, { error: 'not_found' });
      return send(res, 200, view(s));
    }

    // GET /api/labs/:labId/submissions — the TA's review queue
    if (req.method === 'GET' && p[1] === 'labs' && p[3] === 'submissions' && p.length === 4) {
      const lab = q.lab.get(Number(p[2]));
      if (!lab) return send(res, 404, { error: 'not_found' });
      if (me.role !== 'ta' && me.role !== 'admin') return send(res, 403, { error: 'forbidden' });
      return send(res, 200, { lab: lab.id, items: q.byLab.all(lab.id).map(view) });
    }

    // POST /api/labs/:labId/publish — grades become visible to students. No undo.
    // (The page only shows the Publish button to TAs.)
    if (req.method === 'POST' && p[1] === 'labs' && p[3] === 'publish' && p.length === 4) {
      const lab = q.lab.get(Number(p[2]));
      if (!lab) return send(res, 404, { error: 'not_found' });
      if (lab.published_at) return send(res, 409, { error: 'already_published' });
      q.publish.run(lab.id);
      return send(res, 200, { lab: lab.id, published: true });
    }

    return send(res, 404, { error: 'not_found' });
  }

  return createServer((req, res) =>
    handle(req, res).catch((e) => {
      console.error(e);
      if (!res.headersSent) send(res, 500, { error: 'internal' });
    }));
}
