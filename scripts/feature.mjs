#!/usr/bin/env node

/**
 * Trip Tracker 2026 - Feature Additions Tracker CLI
 *
 * Parallel system to scripts/bug.mjs (same shape, same conventions) for
 * tracking feature requests and shipped work instead of defects.
 *
 * Usage:
 *   node scripts/feature.mjs add --title "Title" --category admin --by claude-cli
 *   node scripts/feature.mjs list [--status shipped] [--category admin]
 *   node scripts/feature.mjs show FEAT-001
 *   node scripts/feature.mjs ship FEAT-001 --by claude-cli --note "Shipped in commit 1234"
 *   node scripts/feature.mjs update FEAT-001 --status planned
 *   node scripts/feature.mjs sync
 *   node scripts/feature.mjs stats
 *
 * features/features.json stays the offline, git-tracked source of truth
 * for this CLI. When SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
 * (see .env.example), every mutating command also mirrors the change into
 * the same public.features table the deployed Ops Deck "Features" tab
 * reads (migration 0063) -- so an entry logged here shows up there, and
 * `sync` pulls back anything filed there (e.g. a user's in-app request)
 * into this file. Missing/unreachable Supabase never blocks a local
 * command; it just skips the mirror with a warning.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const FEATURES_FILE = path.join(ROOT_DIR, 'features', 'features.json');
const FEATURES_MD_FILE = path.join(ROOT_DIR, 'FEATURES.md');

try {
  process.loadEnvFile(path.join(ROOT_DIR, '.env'));
} catch {
  // No .env (CI, fresh checkout without one) -- Supabase mirror just stays off.
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_CONFIGURED =
  Boolean(SUPABASE_URL) && Boolean(SUPABASE_SERVICE_ROLE_KEY) && !SUPABASE_URL.includes('dummy-project');

export const VALID_STATUSES = ['requested', 'planned', 'in_progress', 'shipped', 'wont_do'];
export const VALID_CATEGORIES = [
  'ui-ux',
  'analytics',
  'admin',
  'sync',
  'notifications',
  'security',
  'performance',
  'native',
  'general'
];

// ---------------------------------------------------------------------------
// Supabase mirror (public.features, RLS: superadmin-only via service_role)
// ---------------------------------------------------------------------------

async function supabaseFetch(pathAndQuery, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${pathAndQuery}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase ${options.method || 'GET'} ${pathAndQuery} -> ${res.status}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function toDbRow(feature) {
  return {
    id: feature.id,
    title: feature.title,
    description: feature.description || '',
    category: feature.category,
    status: feature.status,
    requested_by: feature.requestedBy || 'unknown',
    environment: feature.environment || {},
    created_at: feature.createdAt,
    updated_at: feature.updatedAt,
    shipped_at: feature.shippedAt || null,
    shipped_by: feature.shippedBy || null,
    shipped_note: feature.shippedNote || null,
  };
}

function fromDbRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    requestedBy: row.requested_by,
    environment: row.environment || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shippedAt: row.shipped_at || undefined,
    shippedBy: row.shipped_by || undefined,
    shippedNote: row.shipped_note || undefined,
  };
}

async function pushFeatureToSupabase(feature) {
  if (!SUPABASE_CONFIGURED) return;
  try {
    await supabaseFetch('/features?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(toDbRow(feature)),
    });
  } catch (e) {
    console.warn(`⚠️  Supabase sync skipped for ${feature.id}: ${e.message}`);
  }
}

async function deleteFeatureFromSupabase(id) {
  if (!SUPABASE_CONFIGURED) return;
  try {
    await supabaseFetch(`/features?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (e) {
    console.warn(`⚠️  Supabase delete-sync skipped for ${id}: ${e.message}`);
  }
}

async function fetchAllFeaturesFromSupabase() {
  if (!SUPABASE_CONFIGURED) return null;
  try {
    const rows = await supabaseFetch('/features?select=*');
    return (rows || []).map(fromDbRow);
  } catch (e) {
    console.warn(`⚠️  Could not reach Supabase: ${e.message}`);
    return null;
  }
}

/**
 * Read features from storage
 */
export function readFeatures() {
  try {
    if (!fs.existsSync(FEATURES_FILE)) {
      fs.mkdirSync(path.dirname(FEATURES_FILE), { recursive: true });
      fs.writeFileSync(FEATURES_FILE, '[]\n', 'utf-8');
      return [];
    }
    const raw = fs.readFileSync(FEATURES_FILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Error reading features.json:', err.message);
    return [];
  }
}

/**
 * Write features to storage and sync markdown
 */
export function writeFeatures(features, autoSync = true) {
  try {
    fs.mkdirSync(path.dirname(FEATURES_FILE), { recursive: true });
    fs.writeFileSync(FEATURES_FILE, JSON.stringify(features, null, 2) + '\n', 'utf-8');
    if (autoSync) {
      syncMarkdown(features);
    }
  } catch (err) {
    console.error('Error writing features.json:', err.message);
    throw err;
  }
}

/**
 * Generate next sequential feature ID (FEAT-001, FEAT-002, ...). Pure/
 * local-only. handleAdd additionally checks Supabase so a CLI add can't
 * collide with an id the UI already used.
 */
export function getNextFeatureId(features) {
  let maxNum = 0;
  for (const f of features) {
    if (f.id && typeof f.id === 'string') {
      const match = f.id.match(/^FEAT-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  const nextNum = maxNum + 1;
  return `FEAT-${String(nextNum).padStart(3, '0')}`;
}

async function getNextFeatureIdAcrossSources(localFeatures) {
  const remoteFeatures = await fetchAllFeaturesFromSupabase();
  const combined = remoteFeatures ? [...localFeatures, ...remoteFeatures] : localFeatures;
  return getNextFeatureId(combined);
}

/**
 * Parse CLI command line arguments
 */
function parseArgs(args) {
  const flags = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

/**
 * Sync FEATURES.md file from features array
 */
export function syncMarkdown(features = readFeatures()) {
  const total = features.length;
  const requested = features.filter(f => f.status === 'requested');
  const planned = features.filter(f => f.status === 'planned');
  const inProgress = features.filter(f => f.status === 'in_progress');
  const shipped = features.filter(f => f.status === 'shipped');
  const wontDo = features.filter(f => f.status === 'wont_do');

  let md = `# ✨ Trip Tracker Feature Tracker

*Feature additions log -- parallel to BUGS.md, tracks requests and shipped work instead of defects.*
*Single Source of Truth: \`features/features.json\` (auto-synced).*

---

## 📊 Summary Metrics

| Metric | Count |
| :--- | :--- |
| **Total Tracked** | **${total}** |
| **💡 Requested** | **${requested.length}** |
| **📋 Planned** | **${planned.length}** |
| **🟡 In Progress** | **${inProgress.length}** |
| **✅ Shipped** | **${shipped.length}** |
| **⚪ Won't Do** | **${wontDo.length}** |

---

## 🚧 Active (Requested, Planned & In Progress)

`;

  const active = [...requested, ...planned, ...inProgress];
  if (active.length === 0) {
    md += `*Nothing in the queue right now.*\n\n`;
  } else {
    md += `| ID | Category | Title | Requested By | Status |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const f of active) {
      const statusIcon = f.status === 'requested' ? '💡 Requested' : f.status === 'planned' ? '📋 Planned' : '🟡 In Progress';
      md += `| **[${f.id}](#${f.id.toLowerCase()})** | \`${f.category}\` | ${f.title} | \`${f.requestedBy}\` | ${statusIcon} |\n`;
    }
    md += `\n`;
  }

  md += `---

## 📖 Active Feature Details

`;

  if (active.length === 0) {
    md += `*Nothing to detail.*\n\n`;
  } else {
    for (const f of active) {
      md += `### ${f.id}: ${f.title}\n\n`;
      md += `- **Category**: \`${f.category}\` | **Status**: \`${f.status}\`\n`;
      md += `- **Requested By**: \`${f.requestedBy}\` on ${new Date(f.createdAt).toLocaleDateString()} (${f.environment?.platform || 'web'})\n`;
      if (f.environment?.route) md += `- **Route**: \`${f.environment.route}\`\n`;
      md += `\n${f.description}\n\n---\n\n`;
    }
  }

  md += `## ✅ Shipped History

| ID | Title | Category | Requested By | Shipped By | Note |
| :--- | :--- | :--- | :--- | :--- | :--- |
`;

  if (shipped.length === 0) {
    md += `| - | Nothing shipped yet | - | - | - | - |\n`;
  } else {
    for (const f of shipped) {
      md += `| **${f.id}** | ${f.title} | \`${f.category}\` | \`${f.requestedBy}\` | \`${f.shippedBy || '-'}\` | ${f.shippedNote || 'Shipped'} |\n`;
    }
  }

  md += `\n---

## 🛠️ CLI Reference

\`\`\`bash
# Log a new feature (request or already-shipped work)
npm run feature:add -- --title "Ops Deck mobile responsiveness" --category admin --by claude-cli --status shipped

# List active (requested/planned/in-progress) features
npm run feature:list

# View details for a feature
npm run feature -- show FEAT-001

# Mark a feature shipped
npm run feature:ship -- FEAT-001 --by claude-cli --note "Shipped in commit abc1234"

# Synchronize FEATURES.md
npm run feature:sync
\`\`\`
`;

  fs.writeFileSync(FEATURES_MD_FILE, md, 'utf-8');
  return md;
}

// -------------------------------------------------------------
// CLI Command Handlers
// -------------------------------------------------------------

export async function handleAdd(flags) {
  const features = readFeatures();

  const title = flags.title || flags.t;
  if (!title) {
    console.error('❌ Error: --title is required to add a feature.');
    process.exit(1);
  }

  const category = flags.category || flags.c || 'general';
  if (!VALID_CATEGORIES.includes(category)) {
    console.error(`❌ Error: Invalid category "${category}". Valid options: ${VALID_CATEGORIES.join(', ')}`);
    process.exit(1);
  }

  const status = flags.status || 'requested';
  if (!VALID_STATUSES.includes(status)) {
    console.error(`❌ Error: Invalid status "${status}". Valid options: ${VALID_STATUSES.join(', ')}`);
    process.exit(1);
  }

  const id = await getNextFeatureIdAcrossSources(features);
  const requestedBy = flags.by || process.env.AGENT_NAME || process.env.AGENT_ID || 'claude-cli';
  const description = flags.desc || flags.description || title;
  const platform = flags.platform || 'web';
  const route = flags.route || '';
  const now = new Date().toISOString();

  const newFeature = {
    id,
    title,
    description,
    category,
    status,
    requestedBy,
    environment: {
      platform,
      ...(route ? { route } : {})
    },
    createdAt: now,
    updatedAt: now,
    ...(status === 'shipped' ? { shippedAt: now, shippedBy: requestedBy, shippedNote: flags.note || 'Shipped' } : {}),
  };

  features.push(newFeature);
  writeFeatures(features, true);
  await pushFeatureToSupabase(newFeature);

  console.log(`\n✅ Successfully created feature [${id}]`);
  console.log(`📌 Title:        ${title}`);
  console.log(`📂 Category:     ${category}`);
  console.log(`🚦 Status:       ${status}`);
  console.log(`👤 Requested By: ${requestedBy}`);
  console.log(`📄 Synced to: FEATURES.md${SUPABASE_CONFIGURED ? ' + Supabase' : ''}\n`);
  return newFeature;
}

export function handleList(flags) {
  const features = readFeatures();
  const statusFilter = flags.status || (flags.all ? 'all' : 'active');
  const categoryFilter = flags.category;

  let filtered = features;
  if (statusFilter !== 'all') {
    if (statusFilter === 'active') {
      filtered = filtered.filter(f => f.status === 'requested' || f.status === 'planned' || f.status === 'in_progress');
    } else {
      filtered = filtered.filter(f => f.status === statusFilter);
    }
  }
  if (categoryFilter) {
    filtered = filtered.filter(f => f.category.toLowerCase() === categoryFilter.toLowerCase());
  }

  console.log(`\n📋 Trip Tracker Feature List (${filtered.length} features)\n`);
  if (filtered.length === 0) {
    console.log('  No matching features found.');
    return;
  }

  console.log(
    'ID'.padEnd(10) +
    'CATEGORY'.padEnd(18) +
    'STATUS'.padEnd(14) +
    'REQUESTED BY'.padEnd(18) +
    'TITLE'
  );
  console.log('-'.repeat(90));

  for (const f of filtered) {
    const idStr = f.id.padEnd(10);
    const catStr = f.category.padEnd(18);
    const statusStr = f.status.padEnd(14);
    const byStr = (f.requestedBy || 'unknown').padEnd(18);
    const titleStr = f.title.length > 35 ? f.title.slice(0, 32) + '...' : f.title;

    console.log(`${idStr}${catStr}${statusStr}${byStr}${titleStr}`);
  }
  console.log('\nUse "npm run feature -- show <id>" to view complete details.\n');
}

export function handleShow(id) {
  if (!id) {
    console.error('❌ Error: Feature ID is required (e.g. FEAT-001)');
    process.exit(1);
  }
  const features = readFeatures();
  const feature = features.find(f => f.id.toUpperCase() === id.toUpperCase());
  if (!feature) {
    console.error(`❌ Feature "${id}" not found.`);
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`✨ [${feature.id}] ${feature.title}`);
  console.log(`======================================================`);
  console.log(`Status:        ${feature.status.toUpperCase()}`);
  console.log(`Category:      ${feature.category}`);
  console.log(`Requested By:  ${feature.requestedBy} on ${feature.createdAt}`);
  console.log(`Platform:      ${feature.environment?.platform || 'web'}`);
  if (feature.environment?.route) console.log(`Route:         ${feature.environment.route}`);
  console.log(`\nDescription:\n${feature.description}`);

  if (feature.status === 'shipped') {
    console.log(`\nShipped:`);
    console.log(`  Shipped By:  ${feature.shippedBy || '-'}`);
    console.log(`  Shipped At:  ${feature.shippedAt || '-'}`);
    console.log(`  Note:        ${feature.shippedNote || '-'}`);
  }
  console.log(`======================================================\n`);
}

export async function handleShip(id, flags) {
  if (!id) {
    console.error('❌ Error: Feature ID is required (e.g. FEAT-001)');
    process.exit(1);
  }
  const features = readFeatures();
  const feature = features.find(f => f.id.toUpperCase() === id.toUpperCase());
  if (!feature) {
    console.error(`❌ Feature "${id}" not found.`);
    process.exit(1);
  }

  const shippedBy = flags.by || process.env.AGENT_NAME || process.env.AGENT_ID || 'claude-cli';
  const shippedNote = flags.note || flags.fix || 'Shipped';

  feature.status = 'shipped';
  feature.shippedBy = shippedBy;
  feature.shippedAt = new Date().toISOString();
  feature.updatedAt = new Date().toISOString();
  feature.shippedNote = shippedNote;

  writeFeatures(features, true);
  await pushFeatureToSupabase(feature);

  console.log(`\n✅ Marked [${feature.id}] as SHIPPED`);
  console.log(`👤 Shipped By: ${shippedBy}`);
  console.log(`📝 Note:       ${shippedNote}`);
  console.log(`📄 Synced to:  FEATURES.md${SUPABASE_CONFIGURED ? ' + Supabase' : ''}\n`);
}

export async function handleUpdate(id, flags) {
  if (!id) {
    console.error('❌ Error: Feature ID is required (e.g. FEAT-001)');
    process.exit(1);
  }
  const features = readFeatures();
  const feature = features.find(f => f.id.toUpperCase() === id.toUpperCase());
  if (!feature) {
    console.error(`❌ Feature "${id}" not found.`);
    process.exit(1);
  }

  if (flags.status) {
    if (!VALID_STATUSES.includes(flags.status)) {
      console.error(`❌ Invalid status "${flags.status}". Options: ${VALID_STATUSES.join(', ')}`);
      process.exit(1);
    }
    feature.status = flags.status;
  }
  if (flags.category) {
    if (!VALID_CATEGORIES.includes(flags.category)) {
      console.error(`❌ Invalid category "${flags.category}". Options: ${VALID_CATEGORIES.join(', ')}`);
      process.exit(1);
    }
    feature.category = flags.category;
  }
  if (flags.note) {
    feature.shippedNote = flags.note;
  }

  feature.updatedAt = new Date().toISOString();
  writeFeatures(features, true);
  await pushFeatureToSupabase(feature);

  console.log(`\n✅ Updated [${feature.id}]`);
  console.log(`📄 Synced to: FEATURES.md${SUPABASE_CONFIGURED ? ' + Supabase' : ''}\n`);
}

export async function handleDelete(id) {
  if (!id) {
    console.error('❌ Error: Feature ID is required to delete (e.g. FEAT-001)');
    process.exit(1);
  }
  let features = readFeatures();
  const exists = features.some(f => f.id.toUpperCase() === id.toUpperCase());
  if (!exists) {
    console.error(`❌ Feature "${id}" not found.`);
    process.exit(1);
  }

  features = features.filter(f => f.id.toUpperCase() !== id.toUpperCase());
  writeFeatures(features, true);
  await deleteFeatureFromSupabase(id);

  console.log(`\n🗑️ Deleted feature [${id}]`);
  console.log(`📄 Synced to: FEATURES.md${SUPABASE_CONFIGURED ? ' + Supabase' : ''}\n`);
}

export function handleStats() {
  const features = readFeatures();
  const total = features.length;
  const requested = features.filter(f => f.status === 'requested').length;
  const planned = features.filter(f => f.status === 'planned').length;
  const inProgress = features.filter(f => f.status === 'in_progress').length;
  const shipped = features.filter(f => f.status === 'shipped').length;

  console.log(`\n📊 Feature Tracker Statistics`);
  console.log(`-----------------------------------`);
  console.log(`Total Tracked:   ${total}`);
  console.log(`Requested:       ${requested}`);
  console.log(`Planned:         ${planned}`);
  console.log(`In Progress:     ${inProgress}`);
  console.log(`Shipped:         ${shipped}`);
  console.log(`-----------------------------------\n`);
}

/**
 * Two-way reconciliation with Supabase: remote is authoritative for any id
 * both sides have (reflects edits made in the UI, or a user's in-app
 * request), any feature that only exists on one side gets pushed/pulled
 * to the other. No-op, with a warning, if Supabase isn't configured or
 * unreachable.
 */
export async function handleSync() {
  if (!SUPABASE_CONFIGURED) {
    syncMarkdown();
    console.log('✅ Synchronized FEATURES.md successfully. (Supabase not configured -- set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env to sync the shared ledger too.)');
    return;
  }

  const localFeatures = readFeatures();
  const remoteFeatures = await fetchAllFeaturesFromSupabase();
  if (remoteFeatures === null) {
    syncMarkdown(localFeatures);
    console.log('✅ Synchronized FEATURES.md successfully. (Supabase unreachable -- local file only.)');
    return;
  }

  const localById = new Map(localFeatures.map((f) => [f.id.toUpperCase(), f]));
  const remoteById = new Map(remoteFeatures.map((f) => [f.id.toUpperCase(), f]));

  const merged = [];
  for (const [id, remoteFeature] of remoteById) {
    merged.push(remoteFeature); // remote wins on shared ids
    localById.delete(id);
  }
  for (const localOnly of localById.values()) {
    merged.push(localOnly); // keep anything only the file has
  }
  merged.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  writeFeatures(merged, true);

  const localOnlyIds = [...localById.keys()];
  for (const id of localOnlyIds) {
    const feature = merged.find((f) => f.id.toUpperCase() === id);
    if (feature) await pushFeatureToSupabase(feature);
  }

  console.log(`✅ Synchronized: ${merged.length} features (pulled ${remoteFeatures.length} from Supabase, pushed ${localOnlyIds.length} local-only). FEATURES.md updated.`);
}

// -------------------------------------------------------------
// CLI Dispatcher
// -------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';
  const { flags, positional } = parseArgs(args.slice(1));

  switch (command.toLowerCase()) {
    case 'add':
      await handleAdd(flags);
      break;
    case 'list':
    case 'ls':
      handleList(flags);
      break;
    case 'show':
    case 'get':
    case 'view':
      handleShow(positional[0]);
      break;
    case 'ship':
    case 'resolve':
    case 'close':
      await handleShip(positional[0], flags);
      break;
    case 'update':
      await handleUpdate(positional[0], flags);
      break;
    case 'delete':
    case 'rm':
      await handleDelete(positional[0]);
      break;
    case 'sync':
      await handleSync();
      break;
    case 'stats':
      handleStats();
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log(`
✨ Trip Tracker Feature CLI Commands:
  npm run feature -- add --title "..." [--category ui-ux|analytics|admin|...] [--status requested|planned|shipped] [--by agent]
  npm run feature -- list [--status active|requested|planned|shipped|wont_do] [--all] [--category ...]
  npm run feature -- show <FEAT-ID>
  npm run feature -- ship <FEAT-ID> [--by agent] [--note "notes"]
  npm run feature -- update <FEAT-ID> [--status planned|in_progress|wont_do]
  npm run feature -- delete <FEAT-ID>
  npm run feature -- sync
  npm run feature -- stats

Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env to mirror every
change into the same table the Ops Deck "Features" tab reads.
`);
      break;
    default:
      if (command.startsWith('FEAT-')) {
        handleShow(command);
      } else {
        console.error(`❌ Unknown command "${command}". Run "npm run feature -- help" for usage.`);
        process.exit(1);
      }
  }
}

// Run main if called directly from CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  });
}
