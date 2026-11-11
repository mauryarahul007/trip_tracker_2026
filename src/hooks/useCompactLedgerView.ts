import { createLocalBoolPref } from './useLocalBoolPref';

const compactLedgerPref = createLocalBoolPref('tt-compact-ledger', { defaultValue: true });

export const getCompactLedgerView = compactLedgerPref.get;
export const setCompactLedgerView = compactLedgerPref.set;
export const useCompactLedgerView = compactLedgerPref.useValue;
