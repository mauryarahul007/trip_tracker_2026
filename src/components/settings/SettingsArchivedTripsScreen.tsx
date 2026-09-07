import type { Member, Trip } from '../../types';
import { IconArchive, IconTrash } from '../Icons';
import { formatDateRange } from '../../utils/dateRange';
import { SettingsSubscreenFrame } from './SettingsNavHeader';

type Props = {
  parentTitle: string;
  onBack: () => void;
  archivedTrips: Trip[];
  userId?: string | null;
  members: Record<string, Member>;
  onRestoreTrip?: (trip: Trip) => void;
  onDeleteTrip?: (trip: Trip) => void;
};

export function SettingsArchivedTripsScreen({
  parentTitle,
  onBack,
  archivedTrips,
  userId,
  members,
  onRestoreTrip,
  onDeleteTrip,
}: Props) {
  return (
    <SettingsSubscreenFrame
      parentTitle={parentTitle}
      onBack={onBack}
      title="Archived Trips"
      subtitle="Past trips you've archived. You can restore them anytime or permanently delete them."
    >
      <div className="settings-group">
        <div className="settings-group-card">
          {archivedTrips.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13.5px' }}>
              No archived trips. Archive a trip from the Trips list to tuck it away without deleting it.
            </div>
          ) : (
            archivedTrips.map((trip) => (
              <div
                key={trip.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color-subtle, rgba(15,23,42,0.06))',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trip.name}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{formatDateRange(trip.startDate, trip.endDate)}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    onClick={() => onRestoreTrip?.(trip)}
                  >
                    <IconArchive size={13} className="icon-sm" /> Restore
                  </button>
                  {(!trip.ownerId || !userId || trip.ownerId === userId || Boolean(trip.adminMemberIds?.length && trip.memberIds?.some((mid) => members[mid]?.linkedUserId === userId && trip.adminMemberIds?.includes(mid)))) && (
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ padding: '6px', color: 'var(--color-danger)', borderColor: 'rgba(184,69,46,0.2)' }}
                      aria-label="Delete trip permanently"
                      title="Delete trip permanently"
                      onClick={() => onDeleteTrip?.(trip)}
                    >
                      <IconTrash size={13} className="icon-sm" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </SettingsSubscreenFrame>
  );
}
