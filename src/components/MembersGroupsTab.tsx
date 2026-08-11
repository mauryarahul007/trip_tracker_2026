import React from 'react';
import type { Group, Member } from '../types';
import type { MemberBalance } from '../utils/settlement';
import { initial } from '../utils/initials';
import { IconCheck, IconEdit, IconTrash } from './Icons';

type Props = {
  showMembersRequiredNotice: boolean;
  dismissMembersRequiredNotice: () => void;

  activeTripMembers: Member[];
  visibleMembers: Member[];
  archivedMembers: Member[];
  balances: MemberBalance[];
  currencySymbol: string;
  onToggleArchiveMember: (id: string) => void;
  onSaveMember: (name: string, id: string | null) => Promise<{ success: boolean; error?: string }>;
  onDeleteMember: (member: Member) => void;

  visibleTripGroups: Group[];
  onSaveGroup: (name: string, memberIds: string[], id: string | null) => Promise<{ success: boolean; error?: string }>;
  onDeleteGroup: (group: Group) => void;

  members: Record<string, Member>;
  isAdmin: boolean;
  tripOwnerId: string;
  currentUserId: string | null;
};

export function MembersGroupsTab({
  showMembersRequiredNotice,
  dismissMembersRequiredNotice,
  activeTripMembers,
  visibleMembers,
  archivedMembers,
  balances,
  currencySymbol,
  onToggleArchiveMember,
  onSaveMember,
  onDeleteMember,
  visibleTripGroups,
  onSaveGroup,
  onDeleteGroup,
  members,
  isAdmin,
  tripOwnerId,
  currentUserId,
}: Props) {
  // Member Form State
  const [newMemberName, setNewMemberName] = React.useState('');
  const [editingMember, setEditingMember] = React.useState<Member | null>(null);
  const [memberFormError, setMemberFormError] = React.useState('');

  // Group Form State
  const [showAddGroup, setShowAddGroup] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = React.useState<Record<string, boolean>>({});
  const [editingGroup, setEditingGroup] = React.useState<Group | null>(null);
  const [groupFormError, setGroupFormError] = React.useState('');
  const [isGroupNameAuto, setIsGroupNameAuto] = React.useState(true);

  // Auto-generate group name based on selected members
  React.useEffect(() => {
    if (isGroupNameAuto) {
      const selectedNames = visibleMembers
        .filter((m) => selectedGroupMembers[m.id])
        .map((m) => m.name);

      let autoName = '';
      if (selectedNames.length === 1) {
        autoName = selectedNames[0];
      } else if (selectedNames.length === 2) {
        autoName = `${selectedNames[0]} & ${selectedNames[1]}`;
      } else if (selectedNames.length > 2) {
        autoName = `${selectedNames.slice(0, -1).join(', ')} & ${selectedNames[selectedNames.length - 1]}`;
      }
      setNewGroupName(autoName);
    }
  }, [selectedGroupMembers, isGroupNameAuto, visibleMembers]);

  // Handlers
  const handleAddMemberLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await onSaveMember(newMemberName, editingMember ? editingMember.id : null);
    if (res.success) {
      setNewMemberName('');
      setEditingMember(null);
      setMemberFormError('');
    } else if (res.error) {
      setMemberFormError(res.error);
    }
  };

  const handleStartEditMemberLocal = (member: Member) => {
    setEditingMember(member);
    setNewMemberName(member.name);
    setMemberFormError('');
  };

  const handleCancelMemberEditLocal = () => {
    setNewMemberName('');
    setEditingMember(null);
    setMemberFormError('');
  };

  const handleCreateGroupLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    const memberIds = Object.keys(selectedGroupMembers).filter((id) => selectedGroupMembers[id]);
    const res = await onSaveGroup(newGroupName, memberIds, editingGroup ? editingGroup.id : null);
    if (res.success) {
      setNewGroupName('');
      setSelectedGroupMembers({});
      setEditingGroup(null);
      setGroupFormError('');
      setIsGroupNameAuto(true);
      setShowAddGroup(false);
    } else if (res.error) {
      setGroupFormError(res.error);
    }
  };

  const handleStartEditGroupLocal = (group: Group) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    const checkedMap: Record<string, boolean> = {};
    group.memberIds.forEach((id) => {
      checkedMap[id] = true;
    });
    setSelectedGroupMembers(checkedMap);

    const selectedNames = visibleMembers
      .filter((m) => checkedMap[m.id])
      .map((m) => m.name);
    let autoName = '';
    if (selectedNames.length === 1) autoName = selectedNames[0];
    else if (selectedNames.length === 2) autoName = `${selectedNames[0]} & ${selectedNames[1]}`;
    else if (selectedNames.length > 2) autoName = `${selectedNames.slice(0, -1).join(', ')} & ${selectedNames[selectedNames.length - 1]}`;

    setIsGroupNameAuto(group.name === autoName);
    setGroupFormError('');
    setShowAddGroup(true);
  };

  const handleCancelGroupFormLocal = () => {
    setNewGroupName('');
    setSelectedGroupMembers({});
    setEditingGroup(null);
    setGroupFormError('');
    setIsGroupNameAuto(true);
    setShowAddGroup(false);
  };

  const otherGroupMemberIds = new Set<string>();
  visibleTripGroups.forEach((grp) => {
    if (grp.id !== (editingGroup ? editingGroup.id : null)) {
      grp.memberIds.forEach((id) => otherGroupMemberIds.add(id));
    }
  });

  const availableMembers = visibleMembers.filter((m) => !otherGroupMemberIds.has(m.id));

  const memberInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editingMember) {
      const timer = setTimeout(() => {
        memberInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [editingMember]);

  return (
    <div className="fade-in">
      {showMembersRequiredNotice && (
        <div className="glass-card" style={{ padding: '12px 16px', marginBottom: '16px', border: '1px dashed var(--color-warning)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px' }}>Please add a member before recording expenses.</span>
          <button
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
            onClick={dismissMembersRequiredNotice}
          >
            &times;
          </button>
        </div>
      )}
      {/* 1. Add Members Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px' }}>Trip Members</h3>
      </div>

      {isAdmin ? (
        <form className="glass-card fade-in" onSubmit={handleAddMemberLocal} style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '14px', fontSize: '15px' }}>{editingMember ? 'Edit Member' : 'New Member'}</h4>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              ref={memberInputRef}
              type="text"
              required
              className="input-field"
              placeholder="Enter full name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
            />
          </div>
          {memberFormError && (
            <p style={{ color: 'var(--color-danger)', fontSize: '13px', marginTop: '4px', marginBottom: '8px' }}>{memberFormError}</p>
          )}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="submit" className="gradient-btn" style={{ flex: 1, padding: '10px' }}>
              {editingMember ? 'Update' : 'Add'}
            </button>
            {editingMember && (
              <button type="button" className="secondary-btn" style={{ flex: 1, padding: '10px' }} onClick={handleCancelMemberEditLocal}>Cancel</button>
            )}
          </div>
        </form>
      ) : (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Only the trip admin can add, edit, or remove members and groups.
        </p>
      )}

      {/* Members list */}
      {activeTripMembers.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '24px', borderStyle: 'dashed', marginBottom: '32px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No one's on this trip yet. Add the first member to start splitting costs.</p>
        </div>
      ) : (
        <div className="luggage-list">
          {visibleMembers.map((member) => {
            const balance = balances.find((b) => b.memberId === member.id)?.balance ?? 0;
            const owes = balance < -0.01;
            const amtLabel =
              balance > 0.01
                ? `owed ${currencySymbol}${balance.toFixed(2)}`
                : owes
                ? `owes ${currencySymbol}${Math.abs(balance).toFixed(2)}`
                : 'settled';
            return (
              <div key={member.id} className={`luggage-tag${owes ? ' lt-owe' : ''}`}>
                <div className="lt-hardware">
                  <div className="lt-hole" />
                  <div className="lt-string" />
                </div>
                <div className="lt-card">
                  <div className="lt-status" />
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="lt-initials" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="lt-initials">{initial(member.name)}</div>
                  )}
                  <div className="lt-body">
                    <div className="lt-name" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', whiteSpace: 'normal', overflow: 'visible' }}>
                      {member.name}
                      {member.linkedUserId === tripOwnerId && (
                        <span className="member-badge member-badge-admin">Admin</span>
                      )}
                      {currentUserId && member.linkedUserId === currentUserId && (
                        <span className="member-badge member-badge-you">You</span>
                      )}
                    </div>
                    <div className="lt-amt">{amtLabel}</div>
                  </div>
                  {isAdmin && (
                    <div className="lt-actions">
                      <button
                        className="secondary-btn"
                        style={{ padding: '6px' }}
                        aria-label="Edit member"
                        title="Edit member"
                        onClick={() => handleStartEditMemberLocal(member)}
                      >
                        <IconEdit size={14} className="icon-sm" />
                      </button>
                      <button
                        className="secondary-btn"
                        style={{ padding: '6px', color: 'var(--color-danger)', borderColor: 'rgba(184,69,46,0.2)' }}
                        aria-label="Delete member"
                        title="Delete member"
                        onClick={() => onDeleteMember(member)}
                      >
                        <IconTrash size={14} className="icon-sm" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Archived Members */}
          {archivedMembers.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Archived ({archivedMembers.length})
              </h4>
              {archivedMembers.map((member) => (
                <div key={member.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', opacity: 0.5 }}>
                  <span style={{ fontSize: '14px', textDecoration: 'line-through' }}>{member.name}</span>
                  {isAdmin && (
                    <button
                      className="secondary-btn"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => onToggleArchiveMember(member.id)}
                    >
                      Restore
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Group Management Section */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px' }}>Member Groups</h3>
          {isAdmin && !showAddGroup && visibleMembers.length > 0 && (
            <button className="gradient-btn" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setShowAddGroup(true)}>
              + Create Group
            </button>
          )}
        </div>

        {isAdmin && showAddGroup && (
          <form className="glass-card fade-in" onSubmit={handleCreateGroupLocal} style={{ marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '14px', fontSize: '15px' }}>{editingGroup ? 'Edit Group' : 'New Group'}</h4>

            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. Couple A & B or Family"
                value={newGroupName}
                onChange={(e) => {
                  setNewGroupName(e.target.value);
                  setIsGroupNameAuto(false);
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Group Members</label>
              {availableMembers.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  All active members are already assigned to other groups.
                </p>
              ) : (
                <div className="member-grid">
                  {availableMembers.map((m) => {
                    const isChecked = !!selectedGroupMembers[m.id];
                    return (
                      <div
                        key={m.id}
                        role="button"
                        tabIndex={0}
                        className="member-card"
                        style={isChecked ? { borderColor: 'var(--color-success)', background: 'rgba(44,122,75,0.07)' } : undefined}
                        aria-pressed={isChecked}
                        onClick={() => setSelectedGroupMembers({ ...selectedGroupMembers, [m.id]: !isChecked })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedGroupMembers({ ...selectedGroupMembers, [m.id]: !isChecked });
                          }
                        }}
                      >
                        <div className="member-avatar">
                          {initial(m.name)}
                          {isChecked && (
                            <span className="member-check-badge">
                              <IconCheck size={10} className="icon-sm" />
                            </span>
                          )}
                        </div>
                        <span className="member-name">{m.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {groupFormError && (
              <p style={{ color: 'var(--color-danger)', fontSize: '13px', marginTop: '4px' }}>{groupFormError}</p>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" className="gradient-btn" style={{ flex: 1, padding: '10px' }}>
                {editingGroup ? 'Update Group' : 'Save Group'}
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1, padding: '10px' }}
                onClick={handleCancelGroupFormLocal}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Groups list */}
        {visibleTripGroups.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '24px', borderStyle: 'dashed' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              No groups yet. Create one to split expenses across a few people in a single tap.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {visibleTripGroups.map((grp) => {
              const grpMemberNames = grp.memberIds
                .map((id) => members[id]?.name)
                .filter(Boolean)
                .join(', ');
              return (
                <div key={grp.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '600' }}>{grp.name}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Members: {grpMemberNames || 'None'}
                    </p>
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="secondary-btn"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => handleStartEditGroupLocal(grp)}
                      >
                        Edit
                      </button>
                      <button
                        className="secondary-btn"
                        style={{ padding: '4px 10px', fontSize: '11px', color: 'var(--color-danger)', borderColor: 'rgba(225,29,72,0.15)' }}
                        onClick={() => onDeleteGroup(grp)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
