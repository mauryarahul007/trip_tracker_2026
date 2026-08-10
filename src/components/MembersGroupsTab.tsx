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
  showAddMember: boolean;
  setShowAddMember: (v: boolean) => void;
  newMemberName: string;
  setNewMemberName: (v: string) => void;
  onAddMember: (e: React.FormEvent) => void;
  onToggleArchiveMember: (id: string) => void;
  editingMemberId: string | null;
  onStartEditMember: (member: Member) => void;
  memberFormError: string;
  onDeleteMember: (member: Member) => void;

  visibleTripGroups: Group[];
  showAddGroup: boolean;
  setShowAddGroup: (v: boolean) => void;
  newGroupName: string;
  setNewGroupName: (v: string) => void;
  selectedGroupMembers: Record<string, boolean>;
  setSelectedGroupMembers: (v: Record<string, boolean>) => void;
  editingGroupId: string | null;
  groupFormError: string;
  onCreateGroup: (e: React.FormEvent) => void;
  onCancelGroupForm: () => void;
  onStartEditGroup: (group: Group) => void;
  onDeleteGroup: (group: Group) => void;

  members: Record<string, Member>;
  isAdmin: boolean;
};

export function MembersGroupsTab({
  showMembersRequiredNotice,
  dismissMembersRequiredNotice,
  activeTripMembers,
  visibleMembers,
  archivedMembers,
  balances,
  currencySymbol,
  showAddMember,
  setShowAddMember,
  newMemberName,
  setNewMemberName,
  onAddMember,
  onToggleArchiveMember,
  editingMemberId,
  onStartEditMember,
  memberFormError,
  onDeleteMember,
  visibleTripGroups,
  showAddGroup,
  setShowAddGroup,
  newGroupName,
  setNewGroupName,
  selectedGroupMembers,
  setSelectedGroupMembers,
  editingGroupId,
  groupFormError,
  onCreateGroup,
  onCancelGroupForm,
  onStartEditGroup,
  onDeleteGroup,
  members,
  isAdmin,
}: Props) {
  const otherGroupMemberIds = new Set<string>();
  visibleTripGroups.forEach((grp) => {
    if (grp.id !== editingGroupId) {
      grp.memberIds.forEach((id) => otherGroupMemberIds.add(id));
    }
  });

  const availableMembers = visibleMembers.filter((m) => !otherGroupMemberIds.has(m.id));

  const memberInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (showAddMember) {
      const timer = setTimeout(() => {
        memberInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showAddMember, editingMemberId]);

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
        <form className="glass-card fade-in" onSubmit={onAddMember} style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '14px', fontSize: '15px' }}>{editingMemberId ? 'Edit Member' : 'New Member'}</h4>
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
              {editingMemberId ? 'Update' : 'Add'}
            </button>
            {editingMemberId && (
              <button type="button" className="secondary-btn" style={{ flex: 1, padding: '10px' }} onClick={() => setShowAddMember(false)}>Cancel</button>
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
                  <div className="lt-initials">{initial(member.name)}</div>
                  <div className="lt-body">
                    <div className="lt-name">{member.name}</div>
                    <div className="lt-amt">{amtLabel}</div>
                  </div>
                  {isAdmin && (
                    <div className="lt-actions">
                      <button
                        className="secondary-btn"
                        style={{ padding: '6px' }}
                        aria-label="Edit member"
                        title="Edit member"
                        onClick={() => onStartEditMember(member)}
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
          <form className="glass-card fade-in" onSubmit={onCreateGroup} style={{ marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '14px', fontSize: '15px' }}>{editingGroupId ? 'Edit Group' : 'New Group'}</h4>

            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. Couple A & B or Family"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
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
                {editingGroupId ? 'Update Group' : 'Save Group'}
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1, padding: '10px' }}
                onClick={onCancelGroupForm}
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
                        onClick={() => onStartEditGroup(grp)}
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
