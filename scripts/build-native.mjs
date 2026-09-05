import { execSync } from 'node:child_process';

console.log('1. Building web bundle for native Capacitor (VITE_BASE_PATH=/)...');
execSync('npm run build', { stdio: 'inherit', env: { ...process.env, VITE_BASE_PATH: '/' } });

console.log('2. Running npx cap sync (Android & iOS)...');
execSync('npx cap sync', { stdio: 'inherit' });

console.log('3. Rebuilding standard web bundle for GitHub Pages (/trip_tracker_2026/)...');
const cleanEnv = { ...process.env };
delete cleanEnv.VITE_BASE_PATH;
execSync('npm run build', { stdio: 'inherit', env: cleanEnv });

console.log('Native sync and web bundle rebuild complete!');
