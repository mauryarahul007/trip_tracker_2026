import { IconExpenses, IconMembers, IconAnalytics, IconSettings } from './Icons';

type Tab = 'expenses' | 'members' | 'analytics' | 'settings';

type Props = {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
};

export function NavTabs({ activeTab, setActiveTab }: Props) {
  return (
    <nav className="nav-tabs">
      <button className={`nav-tab-item ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
        <span className="nav-tab-icon"><IconExpenses /></span>
        <span>Expenses</span>
      </button>
      <button className={`nav-tab-item ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
        <span className="nav-tab-icon"><IconMembers /></span>
        <span>Members & Groups</span>
      </button>
      <button className={`nav-tab-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
        <span className="nav-tab-icon"><IconAnalytics /></span>
        <span>Analytics</span>
      </button>
      <button className={`nav-tab-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
        <span className="nav-tab-icon"><IconSettings /></span>
        <span>Settings</span>
      </button>
    </nav>
  );
}
