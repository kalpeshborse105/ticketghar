const fs = require('fs');
const path = require('path');

const filesToPatch = [
  'node_modules/fontkit/src/opentype/GPOSProcessor.js',
  'node_modules/fontkit/dist/main.cjs',
  'node_modules/fontkit/dist/module.mjs',
  'node_modules/fontkit/dist/browser.cjs',
  'node_modules/fontkit/dist/browser-module.mjs',
  'node_modules/pdfkit/js/pdfkit.standalone.js',
];

let patchedCount = 0;

for (const relPath of filesToPatch) {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes('if (!anchor) return { x: 0, y: 0 };')) {
    // Already patched
    continue;
  }

  const target = 'getAnchor(anchor) {';
  if (content.includes(target)) {
    content = content.replace(
      target,
      'getAnchor(anchor) {\n        if (!anchor) return { x: 0, y: 0 };'
    );
    fs.writeFileSync(fullPath, content, 'utf8');
    patchedCount++;
    console.log(`[patch-fontkit] Patched ${relPath}`);
  }
}

if (patchedCount > 0) {
  console.log(`[patch-fontkit] Successfully patched ${patchedCount} file(s) for null anchor bug.`);
} else {
  console.log('[patch-fontkit] All files already patched or up to date.');
}
