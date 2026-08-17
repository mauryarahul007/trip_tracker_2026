import { IconExpenses, IconMembers, IconAnalytics, IconSettings } from './Icons';

type Tab = 'expenses' | 'members' | 'analytics' | 'settings';

type Props = {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
};

export function NavTabs({ activeTab, setActiveTab }: Props) {
  return (
    <nav className="nav-tabs">
      <button className={`nav-tab-item ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')} aria-label="Expenses">
        <span className="nav-tab-icon"><IconExpenses size={26} /></span>
        <span>Expenses</span>
      </button>
      <button className={`nav-tab-item ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')} aria-label="Members & Groups">
        <span className="nav-tab-icon"><IconMembers size={26} /></span>
        <span>Members</span>
      </button>
      <button className={`nav-tab-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')} aria-label="Analytics">
        <span className="nav-tab-icon"><IconAnalytics size={26} /></span>
        <span>Analytics</span>
      </button>
      <button className={`nav-tab-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} aria-label="Settings">
        <span className="nav-tab-icon"><IconSettings size={26} /></span>
        <span>Settings</span>
      </button>
    </nav>
  );
}
