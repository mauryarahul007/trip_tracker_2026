import type { Category, Member, SplitMode } from '../types';
import { autoSuggestCategory } from './categoryHelper';

const KNOWN_HEADERS = new Set([
  'date',
  'description',
  'category',
  'cost',
  'currency',
]);

export type SplitwiseNameAction = string | '__create__' | '__skip__';

export interface ParsedSplitwiseRow {
  date: string;
  description: string;
  categoryLabel: string;
  cost: number;
  currency: string;
  isPayment: boolean;
  nets: Record<string, number>;
}

export interface SplitwiseParseResult {
  rows: ParsedSplitwiseRow[];
  personNames: string[];
  errors: string[];
}

export interface ResolvedSplitwiseExpense {
  title: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  paidBy: string;
  splitMode: SplitMode;
  splitMemberIds: string[];
  splitConfig: Record<string, number>;
}

export function normalizePersonName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function parseCsvRecords(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

export function parseSplitwiseDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(value);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    let year = Number(slash[3]);
    if (year < 100) year += 2000;
    // Splitwise US exports are MM/DD/YYYY. If the first number is > 12 it must be D/M/Y.
    const month = a > 12 ? b : a;
    const day = a > 12 ? a : b;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return null;
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^0-9.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function isPaymentRow(categoryLabel: string, description: string): boolean {
  const hay = `${categoryLabel} ${description}`.toLowerCase();
  return /\bpayment\b/.test(hay) || /settled up/.test(hay) || /settle up/.test(hay);
}

function findHeaderIndex(records: string[][]): number {
  return records.findIndex((row) => {
    const cells = row.map((c) => c.trim().toLowerCase());
    return cells.includes('date') && cells.includes('description') && cells.includes('cost');
  });
}

export function parseSplitwiseCsv(csv: string): SplitwiseParseResult {
  const errors: string[] = [];
  const records = parseCsvRecords(csv);
  const headerIdx = findHeaderIndex(records);
  if (headerIdx < 0) {
    return { rows: [], personNames: [], errors: ['Could not find a Splitwise header row (Date, Description, Cost).'] };
  }

  const header = records[headerIdx].map((c) => c.trim());
  const lower = header.map((c) => c.toLowerCase());
  const dateIdx = lower.indexOf('date');
  const descIdx = lower.indexOf('description');
  const catIdx = lower.indexOf('category');
  const costIdx = lower.indexOf('cost');
  const currencyIdx = lower.indexOf('currency');

  const personCols: { name: string; index: number }[] = [];
  header.forEach((name, index) => {
    if (!name.trim()) return;
    if (KNOWN_HEADERS.has(name.trim().toLowerCase())) return;
    personCols.push({ name: name.trim(), index });
  });

  if (personCols.length === 0) {
    return { rows: [], personNames: [], errors: ['No member columns found after Date/Description/Cost.'] };
  }

  const rows: ParsedSplitwiseRow[] = [];
  records.slice(headerIdx + 1).forEach((record, offset) => {
    const lineNo = headerIdx + 2 + offset;
    const description = (record[descIdx] || '').trim();
    const cost = parseAmount(record[costIdx] || '');
    if (!description && cost === 0) return;
    const date = parseSplitwiseDate(record[dateIdx] || '');
    if (!date) {
      errors.push(`Row ${lineNo}: invalid date "${record[dateIdx] || ''}".`);
      return;
    }
    if (!(cost > 0)) {
      return;
    }

    const nets: Record<string, number> = {};
    personCols.forEach(({ name, index }) => {
      const net = parseAmount(record[index] || '');
      if (net !== 0) nets[name] = Number(net.toFixed(2));
    });

    rows.push({
      date,
      description: description || 'Untitled',
      categoryLabel: (record[catIdx] || '').trim(),
      cost: Number(cost.toFixed(2)),
      currency: (record[currencyIdx] || '').trim().toUpperCase() || 'INR',
      isPayment: isPaymentRow(record[catIdx] || '', description),
      nets,
    });
  });

  return { rows, personNames: personCols.map((p) => p.name), errors };
}

export function suggestMemberMatch(
  splitwiseName: string,
  members: Member[]
): string | null {
  const needle = normalizePersonName(splitwiseName);
  const exact = members.find((m) => normalizePersonName(m.name) === needle);
  if (exact) return exact.id;
  const first = needle.split(' ')[0];
  if (first.length < 2) return null;
  const firstHits = members.filter((m) => normalizePersonName(m.name).split(' ')[0] === first);
  return firstHits.length === 1 ? firstHits[0].id : null;
}

export function defaultNameMap(
  personNames: string[],
  members: Member[]
): Record<string, SplitwiseNameAction> {
  const map: Record<string, SplitwiseNameAction> = {};
  personNames.forEach((name) => {
    map[name] = suggestMemberMatch(name, members) ?? '__create__';
  });
  return map;
}

function mapCategory(categoryLabel: string, description: string, categories: Category[]): string {
  const needle = categoryLabel.trim().toLowerCase();
  if (needle) {
    const exact = categories.find((c) => c.name.trim().toLowerCase() === needle);
    if (exact) return exact.id;
    const partial = categories.find((c) => c.name.trim().toLowerCase().includes(needle) || needle.includes(c.name.trim().toLowerCase()));
    if (partial) return partial.id;
  }
  return autoSuggestCategory(`${description} ${categoryLabel}`.trim(), categories) || 'cat-misc';
}

export function resolveSplitwiseRow(
  row: ParsedSplitwiseRow,
  nameMap: Record<string, SplitwiseNameAction>,
  membersById: Record<string, string>,
  categories: Category[]
): { expense: ResolvedSplitwiseExpense } | { skip: true } | { error: string } {
  const payerCandidates: { memberId: string; net: number }[] = [];
  const shares: Record<string, number> = {};

  for (const [swName, net] of Object.entries(row.nets)) {
    const action = nameMap[swName];
    if (!action || action === '__skip__') continue;
    const memberId = action === '__create__' ? membersById[normalizePersonName(swName)] : action;
    if (!memberId) {
      return { error: `"${row.description}": member "${swName}" is not mapped yet.` };
    }
    if (net > 0) payerCandidates.push({ memberId, net });
    const share = net < 0 ? -net : 0;
    if (share > 0) shares[memberId] = Number(((shares[memberId] || 0) + share).toFixed(2));
  }

  if (payerCandidates.length === 0) {
    return { error: `"${row.description}": could not identify who paid.` };
  }
  payerCandidates.sort((a, b) => b.net - a.net);
  const paidBy = payerCandidates[0].memberId;
  const othersShare = Object.values(shares).reduce((s, n) => s + n, 0);
  const payerShare = Number((row.cost - othersShare).toFixed(2));
  if (payerShare < -0.05) {
    return { error: `"${row.description}": shares exceed cost.` };
  }
  if (payerShare > 0.005) {
    shares[paidBy] = Number(((shares[paidBy] || 0) + payerShare).toFixed(2));
  }

  const splitMemberIds = Object.keys(shares).filter((id) => shares[id] > 0.004);
  if (splitMemberIds.length === 0) {
    return { skip: true };
  }

  return {
    expense: {
      title: row.description,
      amount: row.cost,
      currency: row.currency,
      category: mapCategory(row.categoryLabel, row.description, categories),
      date: row.date,
      paidBy,
      splitMode: 'exact',
      splitMemberIds,
      splitConfig: shares,
    },
  };
}
