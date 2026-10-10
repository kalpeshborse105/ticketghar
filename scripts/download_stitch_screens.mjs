import fs from 'fs';
import path from 'path';

const rawData = fs.readFileSync('C:/Users/Admin/.gemini/antigravity-ide/brain/308d09c0-9014-4c91-8c72-ed3023be21c8/.system_generated/steps/3720/output.txt', 'utf8');
const { screens } = JSON.parse(rawData);

const baseDir = path.resolve('D:/ticketghar/.stitch-ref/stitch_mahaticket_ui_ux_design_system');

if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

function sanitizeName(title, id) {
  const clean = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `${clean}_${id.substring(0, 8)}`;
}

async function downloadFile(url, destPath) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed ${url}: HTTP ${res.status}`);
      return false;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    console.log(`Saved: ${destPath} (${buffer.length} bytes)`);
    return true;
  } catch (err) {
    console.error(`Error downloading ${url}:`, err.message);
    return false;
  }
}

async function run() {
  console.log(`Starting download of ${screens.length} screens into ${baseDir}...`);
  for (const s of screens) {
    const id = s.name.split('/').pop();
    const folderName = sanitizeName(s.title || 'screen', id);
    const screenDir = path.join(baseDir, folderName);
    if (!fs.existsSync(screenDir)) {
      fs.mkdirSync(screenDir, { recursive: true });
    }

    const metadata = {
      id,
      name: s.name,
      title: s.title,
      deviceType: s.deviceType,
      width: s.width,
      height: s.height,
    };
    fs.writeFileSync(path.join(screenDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    if (s.screenshot?.downloadUrl) {
      await downloadFile(s.screenshot.downloadUrl, path.join(screenDir, 'screenshot.png'));
    }

    if (s.htmlCode?.downloadUrl) {
      const ext = s.htmlCode.mimeType === 'image/svg+xml' ? 'icon.svg' : 'code.html';
      await downloadFile(s.htmlCode.downloadUrl, path.join(screenDir, ext));
    }
  }
  console.log('All Stitch assets downloaded successfully!');
}

run();
