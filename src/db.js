import { DatabaseSync } from 'node:sqlite';

// An in-memory database, created and seeded on every start: the slice has no
// migrations to run and nothing to clean up.
//
//   class 1 "NMLT 23CTT1"   TA: ta_a    students: stu1, stu2   lab 1 "Merge sort"
//   class 2 "NMLT 23CTT2"   TA: ta_b    students: stu3         lab 2 "Merge sort"
//   admin: sees and does everything
//
// The bearer token of each user is printed by `npm start`.
export const USERS = [
  { id: 1, name: 'admin', role: 'admin', token: 'tok-admin' },
  { id: 2, name: 'ta_a', role: 'ta', token: 'tok-ta-a' },
  { id: 3, name: 'ta_b', role: 'ta', token: 'tok-ta-b' },
  { id: 4, name: 'stu1', role: 'student', token: 'tok-stu1' },
  { id: 5, name: 'stu2', role: 'student', token: 'tok-stu2' },
  { id: 6, name: 'stu3', role: 'student', token: 'tok-stu3' },
];

const SCHEMA = `
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin','ta','student')), token TEXT NOT NULL UNIQUE);
CREATE TABLE classes (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE class_staff (class_id INTEGER NOT NULL REFERENCES classes(id),
  user_id INTEGER NOT NULL REFERENCES users(id), PRIMARY KEY (class_id, user_id));
CREATE TABLE enrollments (class_id INTEGER NOT NULL REFERENCES classes(id),
  user_id INTEGER NOT NULL REFERENCES users(id), PRIMARY KEY (class_id, user_id));
CREATE TABLE labs (id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL REFERENCES classes(id),
  title TEXT NOT NULL, constraint_text TEXT NOT NULL, published_at TEXT);
CREATE TABLE submissions (id INTEGER PRIMARY KEY, lab_id INTEGER NOT NULL REFERENCES labs(id),
  student_id INTEGER NOT NULL REFERENCES users(id), code TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('pass','violation','unsure')),
  evidence TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL);
`;

export function open() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  const u = db.prepare('INSERT INTO users (id, name, role, token) VALUES (?, ?, ?, ?)');
  for (const x of USERS) u.run(x.id, x.name, x.role, x.token);
  db.exec(`
    INSERT INTO classes VALUES (1, 'NMLT 23CTT1'), (2, 'NMLT 23CTT2');
    INSERT INTO class_staff VALUES (1, 2), (2, 3);
    INSERT INTO enrollments VALUES (1, 4), (1, 5), (2, 6);
    INSERT INTO labs (id, class_id, title, constraint_text) VALUES
      (1, 1, 'Merge sort', 'Implement merge sort yourself. Do not call std::sort, std::stable_sort or qsort.'),
      (2, 2, 'Merge sort', 'Implement merge sort yourself. Do not call std::sort, std::stable_sort or qsort.');
  `);
  return db;
}
