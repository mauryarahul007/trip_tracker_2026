import { useRef, useState } from 'react';
import { IconExpenses, IconMembers, IconReceipt, IconSettings, IconPlus } from './Icons';
import { triggerHaptic } from '../utils/haptics';
import { FlightAddExpenseTooltip, STORAGE_KEY } from './FlightAddExpenseTooltip';

type Tab = 'expenses' | 'ledger' | 'members' | 'settings';

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
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const [showDeniedHint, setShowDeniedHint] = useState(false);
  const deniedHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = (tab: Tab) => {
    if (tab !== activeTab) triggerHaptic('light');
    setActiveTab(tab);
  };

  const handlePointerDown = () => {
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
    <nav className="nav-tabs" role="tablist" aria-label="Trip navigation tabs">
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
      </button>
      <div className="nav-tab-fab-wrap" role="presentation">

        {/* Renders contextual coachmark: "Add expense" on Summary & Expenses, "Add member" on Members, and hidden on Settings */}
        {activeTab !== 'settings' && (
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
        <button
          type="button"
          className={`nav-tab-fab ${isMembersTab ? 'mode-member' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerUp={clearLongPress}
          onPointerCancel={clearLongPress}
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
        aria-selected={activeTab === 'settings'}
        data-tab="settings"
        className={`nav-tab-item ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => goTo('settings')}
        aria-label="Settings"
      >
        <span className="nav-tab-icon"><IconSettings size={26} /></span>
        <span>Settings</span>
      </button>
    </nav>

  );
}
