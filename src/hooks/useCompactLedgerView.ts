import { createLocalBoolPref } from './useLocalBoolPref';

const compactLedgerPref = createLocalBoolPref('tt-compact-ledger');

export const getCompactLedgerView = compactLedgerPref.get;
export const setCompactLedgerView = compactLedgerPref.set;
export const useCompactLedgerView = compactLedgerPref.useValue;
