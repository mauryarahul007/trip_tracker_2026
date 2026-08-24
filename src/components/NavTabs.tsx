import { IconExpenses, IconMembers, IconAnalytics, IconSettings, IconPlus } from './Icons';
import { triggerHaptic } from '../utils/haptics';
import { FlightAddExpenseTooltip } from './FlightAddExpenseTooltip';

type Tab = 'expenses' | 'members' | 'analytics' | 'settings';

type Props = {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onAddExpense: () => void;
  expenseCount?: number;
  tripDestination?: string;
};

export function NavTabs({ activeTab, setActiveTab, onAddExpense, expenseCount, tripDestination }: Props) {
  const goTo = (tab: Tab) => {
    if (tab !== activeTab) triggerHaptic('light');
    setActiveTab(tab);
  };

  return (
    <nav className="nav-tabs">
      <button data-tab="expenses" className={`nav-tab-item ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => goTo('expenses')} aria-label="Summary">
        <span className="nav-tab-icon"><IconExpenses size={26} /></span>
        <span>Summary</span>
      </button>
      <button data-tab="members" className={`nav-tab-item ${activeTab === 'members' ? 'active' : ''}`} onClick={() => goTo('members')} aria-label="Members & Groups">
        <span className="nav-tab-icon"><IconMembers size={26} /></span>
        <span>Members</span>
      </button>
      <div className="nav-tab-fab-wrap">
        <FlightAddExpenseTooltip
          onAddExpense={onAddExpense}
          expenseCount={expenseCount}
          tripDestination={tripDestination}
        />
        <button
          type="button"
          className="nav-tab-fab"
          onClick={() => {
            triggerHaptic('light');
            onAddExpense();
          }}
          aria-label="Add Expense"
          title="Add Expense"
        >
          <IconPlus size={24} />
        </button>
      </div>
      <button data-tab="analytics" className={`nav-tab-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => goTo('analytics')} aria-label="Analytics">
        <span className="nav-tab-icon"><IconAnalytics size={26} /></span>
        <span>Analytics</span>
      </button>
      <button data-tab="settings" className={`nav-tab-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => goTo('settings')} aria-label="Settings">
        <span className="nav-tab-icon"><IconSettings size={26} /></span>
        <span>Settings</span>
      </button>
    </nav>
  );
}
