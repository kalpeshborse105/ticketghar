/**
 * Escape $ in SQL_PASSWORD for Next.js dotenv-expand ($$ => literal $).
 * Safe to re-run: skips if already doubled.
 */
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
let env = fs.readFileSync(envPath, 'utf8');

env = env.replace(/^SQL_PASSWORD=(.*)$/m, (_m, raw) => {
  let v = String(raw).trim();
  const quoted =
    (v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"));
  if (quoted) v = v.slice(1, -1);
  // Un-escape once if someone used backslash form, then double for dotenv-expand
  v = v.replace(/\\\$/g, '$');
  // In String.replace, '$$' in the replacement is a single '$'. Use '$$$$' => '$$'.
  if (!/\$\$/.test(v) && /\$/.test(v)) {
    v = v.replace(/\$/g, '$$$$');
  }
  return `SQL_PASSWORD="${v}"`;
});

fs.writeFileSync(envPath, env);
const line = env.split(/\r?\n/).find((l) => l.startsWith('SQL_PASSWORD='));
const val = line ? line.slice('SQL_PASSWORD='.length) : '';
console.log(
  JSON.stringify({
    ok: true,
    quotedLen: val.length,
    dollarPairs: (val.match(/\$\$/g) || []).length,
  })
);
