import fs from 'fs';

const content = fs.readFileSync('.env', 'utf8');
const lines = content.split('\n');
for (const line of lines) {
  if (line.startsWith('SMTP_') || line.startsWith('EMAIL_')) {
    const parts = line.split('=');
    const k = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    if (k.includes('PASS')) {
      const isQuoted = (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"));
      const rawVal = isQuoted ? val.slice(1, -1) : val;
      console.log(k, {
        length: rawVal.length,
        isQuoted,
        hasWhitespace: /\s/.test(rawVal),
        firstChar: rawVal[0],
        lastChar: rawVal[rawVal.length - 1],
      });
    } else {
      console.log(k, '=', val);
    }
  }
}
