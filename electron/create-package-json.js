import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist-electron');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

fs.writeFileSync(
    path.join(distDir, 'package.json'),
    JSON.stringify({ type: 'commonjs' }, null, 2)
);
