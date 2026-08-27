import { useEffect, useRef } from 'react';
import type { Category, Member } from '../types';
import { IconClose } from './Icons';
import { CategoryIcon } from './CategoryIcon';
import { triggerHaptic } from '../utils/haptics';

type Props = {
  categories: Category[];
  members: Member[];
  resultCount: number;

  filterCategory: string;
  setFilterCategory: (v: string) => void;
  filterMember: string;
  setFilterMember: (v: string) => void;
  filterDateFrom: string;
  setFilterDateFrom: (v: string) => void;
  filterDateTo: string;
  setFilterDateTo: (v: string) => void;
  filterAmountMin: string;
  setFilterAmountMin: (v: string) => void;
  filterAmountMax: string;
  setFilterAmountMax: (v: string) => void;
  filterRelation: '' | 'paidByMe' | 'involvesMe';
  setFilterRelation: (v: '' | 'paidByMe' | 'involvesMe') => void;
  filterLocation: string;
  setFilterLocation: (v: string) => void;
  locations: string[];
  // Hidden entirely for a viewer with no linked member in this trip --
  // "paid by me"/"involves me" have no meaning without a "me".
  showRelationFilters: boolean;

  onClearFilters: () => void;
  onClose: () => void;
};

// Full-screen advanced filter sheet -- the Amazon/Myntra/Zomato pattern of
// one persistent "Filters" entry point covering every facet at once,
// instead of the quick chip row's one-at-a-time toggles. Filters apply
// live as they're changed (same state the quick chips write to); the
// footer is a plain "Done", not a separate "Apply" step.
export function ExpenseFilterDrawer({
  categories,
  members,
  resultCount,
  filterCategory,
  setFilterCategory,
  filterMember,
  setFilterMember,
  filterDateFrom,
  setFilterDateFrom,
  filterDateTo,
  setFilterDateTo,
  filterAmountMin,
  setFilterAmountMin,
  filterAmountMax,
  setFilterAmountMax,
  filterRelation,
  setFilterRelation,
  filterLocation,
  setFilterLocation,
  locations,
  showRelationFilters,
  onClearFilters,
  onClose,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  const hasAnyFilter = Boolean(
    filterCategory || filterMember || filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax || filterRelation || filterLocation
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-filter-title"
        className="modal-sheet expense-filter-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="app-header" style={{ margin: '-20px -20px 20px', paddingTop: 'max(20px, var(--safe-top, 0px))' }}>
          <div className="app-header-top">
            <div className="app-title-group">
              <h2 id="expense-filter-title" className="app-logo" style={{ fontSize: '22px', color: '#FFFFFF' }}>Filters</h2>
            </div>
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '7px 8px', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
              aria-label="Close"
              title="Close"
              onClick={onClose}
            >
              <IconClose size={16} className="icon-sm" />
            </button>
          </div>
        </header>

        <div className="expense-filter-body">
          {showRelationFilters && (
            <div className="settings-group">
              <h4 className="settings-group-title">My expenses</h4>
              <div className="filter-chips-track" style={{ overflowX: 'visible', flexWrap: 'wrap', padding: '2px 0 0' }}>
                <button
                  type="button"
                  className={`filter-chip ${filterRelation === 'paidByMe' ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic('light');
                    setFilterRelation(filterRelation === 'paidByMe' ? '' : 'paidByMe');
                  }}
                >
                  <span>Paid by me</span>
                </button>
                <button
                  type="button"
                  className={`filter-chip ${filterRelation === 'involvesMe' ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic('light');
                    setFilterRelation(filterRelation === 'involvesMe' ? '' : 'involvesMe');
                  }}
                >
                  <span>I'm included in</span>
                </button>
              </div>
            </div>
          )}

          <div className="settings-group">
            <h4 className="settings-group-title">Category</h4>
            <div className="filter-chips-track" style={{ overflowX: 'visible', flexWrap: 'wrap', padding: '2px 0 0' }}>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`filter-chip ${filterCategory === c.id ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic('light');
                    setFilterCategory(filterCategory === c.id ? '' : c.id);
                  }}
                >
                  <CategoryIcon categoryId={c.id} fallbackEmoji={c.icon} size={13} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <h4 className="settings-group-title">Paid by</h4>
            <div className="filter-chips-track" style={{ overflowX: 'visible', flexWrap: 'wrap', padding: '2px 0 0' }}>
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`filter-chip ${filterMember === m.id ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic('light');
                    setFilterMember(filterMember === m.id ? '' : m.id);
                  }}
                >
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>

          {locations.length > 0 && (
            <div className="settings-group">
              <h4 className="settings-group-title">Location</h4>
              <div className="filter-chips-track" style={{ overflowX: 'visible', flexWrap: 'wrap', padding: '2px 0 0' }}>
                {locations.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    className={`filter-chip ${filterLocation === loc ? 'active' : ''}`}
                    onClick={() => {
                      triggerHaptic('light');
                      setFilterLocation(filterLocation === loc ? '' : loc);
                    }}
                  >
                    <span>{loc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="settings-group">
            <h4 className="settings-group-title">Date range</h4>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                className="input-field"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                className="input-field"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div className="settings-group">
            <h4 className="settings-group-title">Amount range</h4>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                className="input-field"
                placeholder="Min"
                value={filterAmountMin}
                onChange={(e) => setFilterAmountMin(e.target.value)}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>to</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                className="input-field"
                placeholder="Max"
                value={filterAmountMax}
                onChange={(e) => setFilterAmountMax(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </div>

        <div className="expense-filter-footer">
          <button
            type="button"
            className="secondary-btn"
            disabled={!hasAnyFilter}
            onClick={() => {
              triggerHaptic('light');
              onClearFilters();
            }}
          >
            Clear all
          </button>
          <button type="button" className="gradient-btn" onClick={onClose}>
            Show {resultCount} {resultCount === 1 ? 'expense' : 'expenses'}
          </button>
        </div>
      </div>
    </div>
  );
}
