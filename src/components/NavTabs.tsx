import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { IconExpenses, IconMembers, IconReceipt, IconClipboardList, IconPlus } from './Icons';
import { triggerHaptic } from '../utils/haptics';
import { withViewTransition } from '../utils/viewTransition';
import { FlightAddExpenseTooltip, STORAGE_KEY } from './FlightAddExpenseTooltip';

type Tab = 'expenses' | 'ledger' | 'members' | 'notes' | 'settings';

type Props = {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onAddExpense: () => void;
  onAddMember?: () => void;
  expenseCount?: number;
  tripDestination?: string;
};

export function NavTabs({ activeTab, setActiveTab, onAddExpense, onAddMember, expenseCount, tripDestination }: Props) {
  const isMembersTab = activeTab === 'members';
  const navRef = useRef<HTMLElement | null>(null);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const [showDeniedHint, setShowDeniedHint] = useState(false);
  const deniedHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Measure and position the active sliding pill indicator
  const updatePill = useCallback(() => {
    if (!navRef.current) return;
    const activeBtn = navRef.current.querySelector<HTMLButtonElement>(`[data-tab="${activeTab}"]`);
    if (activeBtn) {
      setPillStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [activeTab]);

  useLayoutEffect(() => {
    updatePill();
  }, [updatePill]);

  useEffect(() => {
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [updatePill]);

  const goTo = (tab: Tab) => {
    if (tab === activeTab) return;
    triggerHaptic('light');
    withViewTransition(() => setActiveTab(tab));
  };

  // Warms the ExpenseForm/SettingsTab lazy chunk on hover/press intent, so
  // the click that actually opens them doesn't pay the network+eval cost.
  // The browser dedupes repeat import() calls to the same module, so
  // firing this more than once is harmless.
  const prefetchExpenseForm = () => {
    import('./ExpenseForm');
  };

  const handlePointerDown = () => {
    if (!isMembersTab) prefetchExpenseForm();
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      triggerHaptic('medium');
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {}
      window.dispatchEvent(new CustomEvent('tt:reset-coachmarks'));
    }, 450);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleFabClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    // On the Members tab the FAB only ever adds a member (or explains why
    // it can't) -- it must never fall through to Add Expense just because
    // the viewer isn't an admin.
    if (isMembersTab) {
      if (onAddMember) {
        triggerHaptic('light');
        onAddMember();
      } else {
        triggerHaptic('warning');
        setShowDeniedHint(true);
        if (deniedHintTimer.current) clearTimeout(deniedHintTimer.current);
        deniedHintTimer.current = setTimeout(() => setShowDeniedHint(false), 2200);
      }
      return;
    }
    triggerHaptic('light');
    onAddExpense();
  };

  return (
    <nav ref={navRef} className="nav-tabs" role="tablist" aria-label="Trip navigation tabs">
      {pillStyle && (
        <div
          className="nav-tabs-pill"
          style={{
            left: `${pillStyle.left}px`,
            width: `${pillStyle.width}px`,
          }}
          aria-hidden="true"
        />
      )}
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'expenses'}
        data-tab="expenses"
        className={`nav-tab-item ${activeTab === 'expenses' ? 'active' : ''}`}
        onClick={() => goTo('expenses')}
        aria-label="Summary"
      >
        <span className="nav-tab-icon"><IconExpenses size={26} /></span>
        <span>Summary</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'ledger'}
        data-tab="ledger"
        className={`nav-tab-item ${activeTab === 'ledger' ? 'active' : ''}`}
        onClick={() => goTo('ledger')}
        aria-label="Expenses"
      >
        <span className="nav-tab-icon"><IconReceipt size={26} /></span>
        <span>Expenses</span>
        {expenseCount !== undefined && expenseCount > 0 && (
          <span className="nav-tab-badge" aria-label={`${expenseCount} expenses`}>{expenseCount > 99 ? '99+' : expenseCount}</span>
        )}
      </button>
      <div className="nav-tab-fab-wrap" role="presentation">

        {/* Renders contextual coachmark: "Add expense" on Summary & Expenses, "Add member" on Members, and hidden on Settings/Notes */}
        {activeTab !== 'settings' && activeTab !== 'notes' && (
          <FlightAddExpenseTooltip
            activeTab={activeTab}
            onAddExpense={onAddExpense}
            onAddMember={onAddMember}
            expenseCount={expenseCount}
            tripDestination={tripDestination}
          />
        )}


        {showDeniedHint && (
          <div className="nav-tab-fab-denied-hint" role="status">
            Only trip admins can add members
          </div>
        )}
        {/* The "+" button silently changes meaning on the Members tab (adds
            a member instead of an expense) with no visible cue beyond a
            color swap -- name it, so the switch isn't only communicated by
            hue. Skipped on the denied-hint case above so the two never
            overlap. */}
        {isMembersTab && !showDeniedHint && (
          <div className="nav-tab-fab-mode-label" aria-hidden="true">
            Add member
          </div>
        )}
        <button
          type="button"
          className={`nav-tab-fab ${isMembersTab ? 'mode-member' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerUp={clearLongPress}
          onPointerCancel={clearLongPress}
          onMouseEnter={isMembersTab ? undefined : prefetchExpenseForm}
          onClick={handleFabClick}
          aria-label={isMembersTab ? (onAddMember ? 'Add Member' : 'Add Member (admins only)') : 'Add expense'}
          title={isMembersTab ? (onAddMember ? 'Add Member' : 'Add Member (admins only)') : 'Add expense'}
        >
          <IconPlus size={24} />
        </button>
      </div>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'members'}
        data-tab="members"
        className={`nav-tab-item ${activeTab === 'members' ? 'active' : ''}`}
        onClick={() => goTo('members')}
        aria-label="Members & Groups"
      >
        <span className="nav-tab-icon"><IconMembers size={26} /></span>
        <span>Members</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'notes'}
        data-tab="notes"
        className={`nav-tab-item ${activeTab === 'notes' ? 'active' : ''}`}
        onClick={() => goTo('notes')}
        aria-label="Notes & Checklist"
      >
        <span className="nav-tab-icon"><IconClipboardList size={26} /></span>
        <span>Notes</span>
      </button>
    </nav>

  );
}
