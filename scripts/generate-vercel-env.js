const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateKey(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

const rootDir = path.resolve(__dirname, '..');
const vercelEnvPath = path.join(rootDir, '.env.vercel');

const jwtSecret = generateKey(32);
const credKey = generateKey(32);
const adminPassword = 'Admin_' + crypto.randomBytes(6).toString('hex') + '!';

const content = `# Vercel Environment Variables — Auto-generated
JWT_SECRET=${jwtSecret}
CREDENTIALS_ENCRYPTION_KEY=${credKey}
SUPER_ADMIN_USERNAME=superadmin
SUPER_ADMIN_PASSWORD=${adminPassword}
JWT_EXPIRES_IN=8h
`;

fs.writeFileSync(vercelEnvPath, content, 'utf8');

console.log('=== Vercel uchun yangi xavfsiz random kalitlar yaratildi ===');
console.log(`Fayl saqlandi: ${vercelEnvPath}\n`);
console.log(content);
console.log('Bu qiymatlar .env.vercel faylida saqlandi.');
