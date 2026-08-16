// scripts/sync-native-version.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url)) + '/..';
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const version = pkg.version;
const buildNumber = process.env.CM_BUILD_NUMBER || '1';

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`package.json version "${version}" is not a plain semver x.y.z string.`);
}

// Android: android/app/build.gradle
const gradlePath = join(rootDir, 'android/app/build.gradle');
let gradle = readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode \d+/, `versionCode ${buildNumber}`);
gradle = gradle.replace(/versionName "[^"]*"/, `versionName "${version}"`);
writeFileSync(gradlePath, gradle);

// iOS: ios/App/App.xcodeproj/project.pbxproj
const pbxprojPath = join(rootDir, 'ios/App/App.xcodeproj/project.pbxproj');
let pbxproj = readFileSync(pbxprojPath, 'utf8');
pbxproj = pbxproj.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`);
pbxproj = pbxproj.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`);
writeFileSync(pbxprojPath, pbxproj);

console.log(`Synced native versions: version=${version} buildNumber=${buildNumber}`);
