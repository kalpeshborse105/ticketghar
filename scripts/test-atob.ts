const payload = JSON.stringify({ id: 12, email: 'test@example.com', fullName: 'कल्पेश बोरसे' });
const b64 = Buffer.from(payload).toString('base64url');
console.log('b64:', b64);
let b64std = b64.replace(/-/g, '+').replace(/_/g, '/');
while (b64std.length % 4) b64std += '=';
try {
  const atobResult = atob(b64std);
  console.log('atob raw:', atobResult);
  const parsed = JSON.parse(atobResult);
  console.log('parsed fullName:', parsed.fullName);
} catch (e: any) {
  console.log('FAILED:', e.message);
}

// Proper UTF-8 decode:
function decodeBase64Utf8(base64Str: string): string {
  const binary = atob(base64Str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

try {
  const fixed = decodeBase64Utf8(b64std);
  const parsedFixed = JSON.parse(fixed);
  console.log('FIXED parsed fullName:', parsedFixed.fullName);
} catch (e: any) {
  console.log('FIXED FAILED:', e.message);
}
