#!/usr/bin/env node

/**
 * Trip Tracker 2026 - Unified Multi-Agent Bug Tracker CLI
 *
 * Supports:
 * - Antigravity AI Agent
 * - Claude CLI (Single sessions & Hive swarm)
 * - Human developers & QA testers
 *
 * Usage:
 *   node scripts/bug.mjs add --title "Title" --severity high --category navigation --by antigravity
 *   node scripts/bug.mjs list [--status open] [--severity critical]
 *   node scripts/bug.mjs show BUG-001
 *   node scripts/bug.mjs resolve BUG-001 --by claude-cli --fix "Fixed in commit 1234"
 *   node scripts/bug.mjs update BUG-001 --status in_progress
 *   node scripts/bug.mjs sync
 *   node scripts/bug.mjs stats
 *
 * bugs/bugs.json stays the offline, git-tracked source of truth for this
 * CLI. When SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set (see
 * .env.example), every mutating command also mirrors the change into the
 * same public.bugs table the deployed Bug Ledger UI reads (migration
 * 0055) -- so a bug filed here shows up there, and `sync` pulls back
 * anything filed there into this file. Missing/unreachable Supabase never
 * blocks a local command; it just skips the mirror with a warning.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BUGS_FILE = path.join(ROOT_DIR, 'bugs', 'bugs.json');
const BUGS_MD_FILE = path.join(ROOT_DIR, 'BUGS.md');

try {
  process.loadEnvFile(path.join(ROOT_DIR, '.env'));
} catch {
  // No .env (CI, fresh checkout without one) -- Supabase mirror just stays off.
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_CONFIGURED =
  Boolean(SUPABASE_URL) && Boolean(SUPABASE_SERVICE_ROLE_KEY) && !SUPABASE_URL.includes('dummy-project');

export const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'];
export const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'wont_fix'];
export const VALID_CATEGORIES = [
  'offline-sync',
  'splits-math',
  'ui-ux',
  'navigation',
  'auth',
  'receipts-camera',
  'p2p-sync',
  'performance',
  'general'
];

// ---------------------------------------------------------------------------
// Supabase mirror (public.bugs, RLS: superadmin-only via service_role)
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

function toDbRow(bug) {
  return {
    id: bug.id,
    title: bug.title,
    description: bug.description || '',
    severity: bug.severity,
    category: bug.category,
    status: bug.status,
    found_by: bug.foundBy || 'unknown',
    environment: bug.environment || {},
    repro_steps: bug.reproSteps || [],
    expected_behavior: bug.expectedBehavior || '',
    actual_behavior: bug.actualBehavior || '',
    diagnostics: bug.diagnostics || null,
    created_at: bug.createdAt,
    updated_at: bug.updatedAt,
    resolved_at: bug.resolvedAt || null,
    resolved_by: bug.resolvedBy || null,
    resolution_note: bug.resolutionNote || null,
  };
}

function fromDbRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    category: row.category,
    status: row.status,
    foundBy: row.found_by,
    environment: row.environment || {},
    reproSteps: row.repro_steps || [],
    expectedBehavior: row.expected_behavior || '',
    actualBehavior: row.actual_behavior || '',
    diagnostics: row.diagnostics || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at || undefined,
    resolvedBy: row.resolved_by || undefined,
    resolutionNote: row.resolution_note || undefined,
  };
}

async function pushBugToSupabase(bug) {
  if (!SUPABASE_CONFIGURED) return;
  try {
    await supabaseFetch('/bugs?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(toDbRow(bug)),
    });
  } catch (e) {
    console.warn(`⚠️  Supabase sync skipped for ${bug.id}: ${e.message}`);
  }
}

async function deleteBugFromSupabase(id) {
  if (!SUPABASE_CONFIGURED) return;
  try {
    await supabaseFetch(`/bugs?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (e) {
    console.warn(`⚠️  Supabase delete-sync skipped for ${id}: ${e.message}`);
  }
}

async function fetchAllBugsFromSupabase() {
  if (!SUPABASE_CONFIGURED) return null;
  try {
    const rows = await supabaseFetch('/bugs?select=*');
    return (rows || []).map(fromDbRow);
  } catch (e) {
    console.warn(`⚠️  Could not reach Supabase: ${e.message}`);
    return null;
  }
}

/**
 * Read bugs from storage
 */
export function readBugs() {
  try {
    if (!fs.existsSync(BUGS_FILE)) {
      fs.mkdirSync(path.dirname(BUGS_FILE), { recursive: true });
      fs.writeFileSync(BUGS_FILE, '[]\n', 'utf-8');
      return [];
    }
    const raw = fs.readFileSync(BUGS_FILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Error reading bugs.json:', err.message);
    return [];
  }
}

/**
 * Write bugs to storage and sync markdown
 */
export function writeBugs(bugs, autoSync = true) {
  try {
    fs.mkdirSync(path.dirname(BUGS_FILE), { recursive: true });
    fs.writeFileSync(BUGS_FILE, JSON.stringify(bugs, null, 2) + '\n', 'utf-8');
    if (autoSync) {
      syncMarkdown(bugs);
    }
  } catch (err) {
    console.error('Error writing bugs.json:', err.message);
    throw err;
  }
}

/**
 * Generate next sequential bug ID (BUG-001, BUG-002, ...). Pure/local-only
 * -- kept synchronous for scripts/bug.test.ts. handleAdd additionally
 * checks Supabase so a CLI add can't collide with an id the UI already
 * used (see getNextBugIdAcrossSources).
 */
export function getNextBugId(bugs) {
  let maxNum = 0;
  for (const b of bugs) {
    if (b.id && typeof b.id === 'string') {
      const match = b.id.match(/^BUG-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  const nextNum = maxNum + 1;
  return `BUG-${String(nextNum).padStart(3, '0')}`;
}

async function getNextBugIdAcrossSources(localBugs) {
  const remoteBugs = await fetchAllBugsFromSupabase();
  const combined = remoteBugs ? [...localBugs, ...remoteBugs] : localBugs;
  return getNextBugId(combined);
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
 * Sync BUGS.md file from bugs array
 */
export function syncMarkdown(bugs = readBugs()) {
  const total = bugs.length;
  const openBugs = bugs.filter(b => b.status === 'open');
  const inProgressBugs = bugs.filter(b => b.status === 'in_progress');
  const resolvedBugs = bugs.filter(b => b.status === 'resolved');
  const wontFixBugs = bugs.filter(b => b.status === 'wont_fix');
  const criticalOpen = openBugs.filter(b => b.severity === 'critical').length;
  const highOpen = openBugs.filter(b => b.severity === 'high').length;

  let md = `# 🐞 Trip Tracker Bug Tracker

*Unified multi-agent bug ledger for Antigravity, Claude CLI, and human testers.*
*Single Source of Truth: \`bugs/bugs.json\` (auto-synced).*

---

## 📊 Summary Metrics

| Metric | Count | Status Notes |
| :--- | :--- | :--- |
| **Total Tracked** | **${total}** | All recorded bugs across sessions |
| **🟢 Open** | **${openBugs.length}** | ${criticalOpen > 0 ? `🚨 **${criticalOpen} CRITICAL**` : 'No critical blockers'}, ${highOpen} High |
| **🟡 In Progress** | **${inProgressBugs.length}** | Active investigation or fix |
| **✅ Resolved** | **${resolvedBugs.length}** | Verified & closed |
| **⚪ Won't Fix** | **${wontFixBugs.length}** | Expected behavior / deferred |

---

## 🚨 Active Bugs (Open & In Progress)

`;

  const active = [...openBugs, ...inProgressBugs];
  if (active.length === 0) {
    md += `*🎉 No active open bugs! Great job team.* \n\n`;
  } else {
    md += `| ID | Severity | Category | Title | Found By | Status |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const b of active) {
      const sevIcon = b.severity === 'critical' ? '🔴 **CRITICAL**' : b.severity === 'high' ? '🟠 High' : b.severity === 'medium' ? '🟡 Medium' : '⚪ Low';
      const statusIcon = b.status === 'open' ? '🟢 Open' : '🟡 In Progress';
      md += `| **[${b.id}](#${b.id.toLowerCase()})** | ${sevIcon} | \`${b.category}\` | ${b.title} | \`${b.foundBy}\` | ${statusIcon} |\n`;
    }
    md += `\n`;
  }

  md += `---

## 📖 Detailed Active Bug Specs

`;

  if (active.length === 0) {
    md += `*No active bug details to display.*\n\n`;
  } else {
    for (const b of active) {
      md += `### ${b.id}: ${b.title}\n\n`;
      md += `- **Severity**: \`${b.severity.toUpperCase()}\` | **Category**: \`${b.category}\` | **Status**: \`${b.status}\`\n`;
      md += `- **Found By**: \`${b.foundBy}\` on ${new Date(b.createdAt).toLocaleDateString()} (${b.environment?.platform || 'web'})\n`;
      if (b.environment?.route) md += `- **Route**: \`${b.environment.route}\` (Online: \`${b.environment.isOnline}\`)\n`;
      md += `\n**Description**:\n${b.description}\n\n`;

      if (b.reproSteps && b.reproSteps.length > 0) {
        md += `**Steps to Reproduce**:\n`;
        b.reproSteps.forEach((s, idx) => {
          md += `${idx + 1}. ${s}\n`;
        });
        md += `\n`;
      }

      if (b.expectedBehavior) md += `**Expected**: ${b.expectedBehavior}\n\n`;
      if (b.actualBehavior) md += `**Actual**: ${b.actualBehavior}\n\n`;

      if (b.diagnostics?.stackTrace && b.diagnostics.stackTrace !== 'N/A') {
        md += `**Diagnostic Trace / Stack**:\n\`\`\`text\n${b.diagnostics.stackTrace}\n\`\`\`\n\n`;
      }
      md += `---\n\n`;
    }
  }

  md += `## ✅ Resolved Bugs History

| ID | Title | Category | Severity | Found By | Resolved By | Fix Note |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

  if (resolvedBugs.length === 0) {
    md += `| - | No resolved bugs yet | - | - | - | - | - |\n`;
  } else {
    for (const b of resolvedBugs) {
      md += `| **${b.id}** | ${b.title} | \`${b.category}\` | \`${b.severity}\` | \`${b.foundBy}\` | \`${b.resolvedBy || '-'}\` | ${b.resolutionNote || 'Resolved'} |\n`;
    }
  }

  md += `\n---

## 🛠️ CLI Reference for AI Agents & Developers

\`\`\`bash
# Add a new bug
npm run bug:add -- --title "Expense split discrepancy on offline reconnect" --severity high --category offline-sync --by claude-cli

# List open bugs
npm run bug:list

# View details for a bug
npm run bug -- show BUG-001

# Mark bug resolved
npm run bug:resolve -- BUG-001 --by antigravity --fix "Fixed in commit abc1234"

# Synchronize BUGS.md
npm run bug:sync
\`\`\`
`;

  fs.writeFileSync(BUGS_MD_FILE, md, 'utf-8');
  return md;
}

// -------------------------------------------------------------
// CLI Command Handlers
// -------------------------------------------------------------

export async function handleAdd(flags) {
  const bugs = readBugs();

  const title = flags.title || flags.t;
  if (!title) {
    console.error('❌ Error: --title is required to add a bug.');
    process.exit(1);
  }

  const severity = flags.severity || flags.s || 'medium';
  if (!VALID_SEVERITIES.includes(severity)) {
    console.error(`❌ Error: Invalid severity "${severity}". Valid options: ${VALID_SEVERITIES.join(', ')}`);
    process.exit(1);
  }

  const category = flags.category || flags.c || 'general';
  if (!VALID_CATEGORIES.includes(category)) {
    console.error(`❌ Error: Invalid category "${category}". Valid options: ${VALID_CATEGORIES.join(', ')}`);
    process.exit(1);
  }

  const id = await getNextBugIdAcrossSources(bugs);
  const foundBy = flags.by || process.env.AGENT_NAME || process.env.AGENT_ID || 'antigravity';
  const description = flags.desc || flags.description || title;
  const platform = flags.platform || 'web';
  const route = flags.route || '';
  const isOnline = flags.offline ? false : true;

  let reproSteps = [];
  if (flags.steps) {
    reproSteps = flags.steps.includes(';') ? flags.steps.split(';') : flags.steps.split('\n');
    reproSteps = reproSteps.map(s => s.trim()).filter(Boolean);
  } else {
    reproSteps = ['Navigate to application', 'Perform action that triggers bug'];
  }

  const expectedBehavior = flags.expected || '';
  const actualBehavior = flags.actual || '';
  const stackTrace = flags.trace || flags.stack || '';

  const newBug = {
    id,
    title,
    description,
    severity,
    category,
    status: 'open',
    foundBy,
    environment: {
      platform,
      isOnline,
      appVersion: '1.0.0',
      ...(route ? { route } : {})
    },
    reproSteps,
    expectedBehavior,
    actualBehavior,
    diagnostics: {
      ...(stackTrace ? { stackTrace } : {})
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  bugs.push(newBug);
  writeBugs(bugs, true);
  await pushBugToSupabase(newBug);

  console.log(`\n✅ Successfully created bug [${id}]`);
  console.log(`📌 Title:    ${title}`);
  console.log(`⚡ Severity: ${severity.toUpperCase()}`);
  console.log(`📂 Category: ${category}`);
  console.log(`👤 Found By: ${foundBy}`);
  console.log(`📄 Synced to: BUGS.md${SUPABASE_CONFIGURED ? ' + Supabase' : ''}\n`);
  return newBug;
}

export function handleList(flags) {
  const bugs = readBugs();
  const statusFilter = flags.status || (flags.all ? 'all' : (flags.open ? 'open' : 'open'));
  const severityFilter = flags.severity;
  const categoryFilter = flags.category;

  let filtered = bugs;
  if (statusFilter !== 'all') {
    if (statusFilter === 'open') {
      filtered = filtered.filter(b => b.status === 'open' || b.status === 'in_progress');
    } else {
      filtered = filtered.filter(b => b.status === statusFilter);
    }
  }
  if (severityFilter) {
    filtered = filtered.filter(b => b.severity.toLowerCase() === severityFilter.toLowerCase());
  }
  if (categoryFilter) {
    filtered = filtered.filter(b => b.category.toLowerCase() === categoryFilter.toLowerCase());
  }

  console.log(`\n📋 Trip Tracker Bug List (${filtered.length} bugs)\n`);
  if (filtered.length === 0) {
    console.log('  No matching bugs found.');
    return;
  }

  console.log(
    'ID'.padEnd(10) +
    'SEVERITY'.padEnd(12) +
    'CATEGORY'.padEnd(18) +
    'STATUS'.padEnd(14) +
    'FOUND BY'.padEnd(16) +
    'TITLE'
  );
  console.log('-'.repeat(90));

  for (const b of filtered) {
    const idStr = b.id.padEnd(10);
    const sevStr = b.severity.toUpperCase().padEnd(12);
    const catStr = b.category.padEnd(18);
    const statusStr = b.status.padEnd(14);
    const byStr = (b.foundBy || 'unknown').padEnd(16);
    const titleStr = b.title.length > 35 ? b.title.slice(0, 32) + '...' : b.title;

    console.log(`${idStr}${sevStr}${catStr}${statusStr}${byStr}${titleStr}`);
  }
  console.log('\nUse "npm run bug -- show <id>" to view complete details.\n');
}

export function handleShow(id) {
  if (!id) {
    console.error('❌ Error: Bug ID is required (e.g. BUG-001)');
    process.exit(1);
  }
  const bugs = readBugs();
  const bug = bugs.find(b => b.id.toUpperCase() === id.toUpperCase());
  if (!bug) {
    console.error(`❌ Bug "${id}" not found.`);
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`🐞 [${bug.id}] ${bug.title}`);
  console.log(`======================================================`);
  console.log(`Status:      ${bug.status.toUpperCase()}`);
  console.log(`Severity:    ${bug.severity.toUpperCase()}`);
  console.log(`Category:    ${bug.category}`);
  console.log(`Found By:    ${bug.foundBy} on ${bug.createdAt}`);
  console.log(`Platform:    ${bug.environment?.platform || 'web'} (Online: ${bug.environment?.isOnline ?? true})`);
  if (bug.environment?.route) console.log(`Route:       ${bug.environment.route}`);
  console.log(`\nDescription:\n${bug.description}`);

  if (bug.reproSteps && bug.reproSteps.length > 0) {
    console.log(`\nSteps to Reproduce:`);
    bug.reproSteps.forEach((s, idx) => console.log(`  ${idx + 1}. ${s}`));
  }

  if (bug.expectedBehavior) console.log(`\nExpected Behavior:\n${bug.expectedBehavior}`);
  if (bug.actualBehavior) console.log(`\nActual Behavior:\n${bug.actualBehavior}`);

  if (bug.diagnostics?.stackTrace) {
    console.log(`\nDiagnostics / Stack Trace:\n${bug.diagnostics.stackTrace}`);
  }

  if (bug.status === 'resolved') {
    console.log(`\nResolution:`);
    console.log(`  Resolved By:   ${bug.resolvedBy || '-'}`);
    console.log(`  Resolved At:   ${bug.resolvedAt || '-'}`);
    console.log(`  Fix Note:      ${bug.resolutionNote || '-'}`);
  }
  console.log(`======================================================\n`);
}

export async function handleResolve(id, flags) {
  if (!id) {
    console.error('❌ Error: Bug ID is required (e.g. BUG-001)');
    process.exit(1);
  }
  const bugs = readBugs();
  const bug = bugs.find(b => b.id.toUpperCase() === id.toUpperCase());
  if (!bug) {
    console.error(`❌ Bug "${id}" not found.`);
    process.exit(1);
  }

  const resolvedBy = flags.by || process.env.AGENT_NAME || process.env.AGENT_ID || 'antigravity';
  const resolutionNote = flags.fix || flags.note || flags.resolution || 'Resolved';

  bug.status = 'resolved';
  bug.resolvedBy = resolvedBy;
  bug.resolvedAt = new Date().toISOString();
  bug.updatedAt = new Date().toISOString();
  bug.resolutionNote = resolutionNote;

  writeBugs(bugs, true);
  await pushBugToSupabase(bug);

  console.log(`\n✅ Marked [${bug.id}] as RESOLVED`);
  console.log(`👤 Resolved By: ${resolvedBy}`);
  console.log(`📝 Fix Note:    ${resolutionNote}`);
  console.log(`📄 Synced to:   BUGS.md${SUPABASE_CONFIGURED ? ' + Supabase' : ''}\n`);
}

export async function handleUpdate(id, flags) {
  if (!id) {
    console.error('❌ Error: Bug ID is required (e.g. BUG-001)');
    process.exit(1);
  }
  const bugs = readBugs();
  const bug = bugs.find(b => b.id.toUpperCase() === id.toUpperCase());
  if (!bug) {
    console.error(`❌ Bug "${id}" not found.`);
    process.exit(1);
  }

  if (flags.status) {
    if (!VALID_STATUSES.includes(flags.status)) {
      console.error(`❌ Invalid status "${flags.status}". Options: ${VALID_STATUSES.join(', ')}`);
      process.exit(1);
    }
    bug.status = flags.status;
  }
  if (flags.severity) {
    if (!VALID_SEVERITIES.includes(flags.severity)) {
      console.error(`❌ Invalid severity "${flags.severity}". Options: ${VALID_SEVERITIES.join(', ')}`);
      process.exit(1);
    }
    bug.severity = flags.severity;
  }
  if (flags.category) {
    if (!VALID_CATEGORIES.includes(flags.category)) {
      console.error(`❌ Invalid category "${flags.category}". Options: ${VALID_CATEGORIES.join(', ')}`);
      process.exit(1);
    }
    bug.category = flags.category;
  }
  if (flags.note) {
    bug.resolutionNote = flags.note;
  }

  bug.updatedAt = new Date().toISOString();
  writeBugs(bugs, true);
  await pushBugToSupabase(bug);

  console.log(`\n✅ Updated [${bug.id}]`);
  console.log(`📄 Synced to: BUGS.md${SUPABASE_CONFIGURED ? ' + Supabase' : ''}\n`);
}

export async function handleDelete(id) {
  if (!id) {
    console.error('❌ Error: Bug ID is required to delete (e.g. BUG-001)');
    process.exit(1);
  }
  let bugs = readBugs();
  const exists = bugs.some(b => b.id.toUpperCase() === id.toUpperCase());
  if (!exists) {
    console.error(`❌ Bug "${id}" not found.`);
    process.exit(1);
  }

  bugs = bugs.filter(b => b.id.toUpperCase() !== id.toUpperCase());
  writeBugs(bugs, true);
  await deleteBugFromSupabase(id);

  console.log(`\n🗑️ Deleted bug [${id}]`);
  console.log(`📄 Synced to: BUGS.md${SUPABASE_CONFIGURED ? ' + Supabase' : ''}\n`);
}

export function handleStats() {
  const bugs = readBugs();
  const total = bugs.length;
  const open = bugs.filter(b => b.status === 'open').length;
  const inProgress = bugs.filter(b => b.status === 'in_progress').length;
  const resolved = bugs.filter(b => b.status === 'resolved').length;

  console.log(`\n📊 Bug Tracker Statistics`);
  console.log(`-----------------------------------`);
  console.log(`Total Tracked:   ${total}`);
  console.log(`Open:            ${open}`);
  console.log(`In Progress:     ${inProgress}`);
  console.log(`Resolved:        ${resolved}`);
  console.log(`-----------------------------------\n`);
}

/**
 * Two-way reconciliation with Supabase: remote is authoritative for any id
 * both sides have (reflects edits made in the UI), any bug that only
 * exists on one side gets pushed/pulled to the other. No-op, with a
 * warning, if Supabase isn't configured or unreachable.
 */
export async function handleSync() {
  if (!SUPABASE_CONFIGURED) {
    syncMarkdown();
    console.log('✅ Synchronized BUGS.md successfully. (Supabase not configured -- set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env to sync the shared ledger too.)');
    return;
  }

  const localBugs = readBugs();
  const remoteBugs = await fetchAllBugsFromSupabase();
  if (remoteBugs === null) {
    syncMarkdown(localBugs);
    console.log('✅ Synchronized BUGS.md successfully. (Supabase unreachable -- local file only.)');
    return;
  }

  const localById = new Map(localBugs.map((b) => [b.id.toUpperCase(), b]));
  const remoteById = new Map(remoteBugs.map((b) => [b.id.toUpperCase(), b]));

  const merged = [];
  for (const [id, remoteBug] of remoteById) {
    merged.push(remoteBug); // remote wins on shared ids
    localById.delete(id);
  }
  for (const localOnly of localById.values()) {
    merged.push(localOnly); // keep anything only the file has
  }
  merged.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  writeBugs(merged, true);

  const localOnlyIds = [...localById.keys()];
  for (const id of localOnlyIds) {
    const bug = merged.find((b) => b.id.toUpperCase() === id);
    if (bug) await pushBugToSupabase(bug);
  }

  console.log(`✅ Synchronized: ${merged.length} bugs (pulled ${remoteBugs.length} from Supabase, pushed ${localOnlyIds.length} local-only). BUGS.md updated.`);
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
    case 'resolve':
    case 'close':
    case 'fix':
      await handleResolve(positional[0], flags);
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
🐞 Trip Tracker Bug CLI Commands:
  npm run bug -- add --title "..." [--severity critical|high|medium|low] [--category navigation|splits-math|...] [--by agent]
  npm run bug -- list [--open] [--all] [--severity high] [--category ...]
  npm run bug -- show <BUG-ID>
  npm run bug -- resolve <BUG-ID> [--by agent] [--fix "notes"]
  npm run bug -- update <BUG-ID> [--status in_progress|open|resolved]
  npm run bug -- delete <BUG-ID>
  npm run bug -- sync
  npm run bug -- stats

Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env to mirror every
change into the same table the deployed Bug Ledger UI reads.
`);
      break;
    default:
      if (command.startsWith('BUG-')) {
        handleShow(command);
      } else {
        console.error(`❌ Unknown command "${command}". Run "npm run bug -- help" for usage.`);
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
