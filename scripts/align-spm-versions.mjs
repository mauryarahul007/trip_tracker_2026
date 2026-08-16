// scripts/align-spm-versions.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TARGET_VERSION = '8.2.0';

function findPackageSwiftFiles(dir) {
  let results = [];
  try {
    const list = readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory()) {
        results = results.concat(findPackageSwiftFiles(fullPath));
      } else if (item.name === 'Package.swift') {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

const nodeModulesCapacitor = join(process.cwd(), 'node_modules', '@capacitor');
const files = findPackageSwiftFiles(nodeModulesCapacitor);

let modifiedCount = 0;
for (const file of files) {
  let content = readFileSync(file, 'utf8');
  if (content.includes('from: "8.0.0"') || content.includes('from: "8.1.0"') || content.includes('from: "8.2.0"')) {
    content = content.replace(/from:\s*"8\.[0-9]+\.[0-9]+"/g, `exact: "${TARGET_VERSION}"`);
    writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
}

console.log(`Aligned ${modifiedCount} plugin Package.swift files to exact: "${TARGET_VERSION}"`);
