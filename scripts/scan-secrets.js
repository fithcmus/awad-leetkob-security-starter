// A small secret scanner, so the slice needs nothing installed. In your team
// repository use a real one in CI — gitleaks, or GitHub secret scanning with
// push protection — and scan the whole history, not only the files of today.
//
// Exit code 1 when anything key-shaped is found outside test/.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SKIP = new Set(['.git', 'node_modules', 'test']);
const RULES = [
  ['model key (lk_live_…)', /lk_live_[A-Za-z0-9]{16,}/],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['OpenAI-style key', /sk-[A-Za-z0-9_-]{20,}/],
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['key or secret assigned a literal', /(api[_-]?key|secret|password)\s*[:=]\s*['"][^'"\s]{16,}['"]/i],
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else yield path;
  }
}

export function scan(root = ROOT) {
  const found = [];
  for (const path of files(root)) {
    readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
      for (const [rule, re] of RULES)
        if (re.test(line)) found.push({ file: relative(root, path), line: i + 1, rule });
    });
  }
  return found;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const found = scan();
  for (const f of found) console.log(`${f.file}:${f.line}  ${f.rule}`);
  console.log(found.length ? `${found.length} finding(s)` : 'no secrets found');
  process.exit(found.length ? 1 : 0);
}
