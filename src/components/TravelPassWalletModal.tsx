import { useEscapeKey } from '../utils/useEscapeKey';
import { useHistoryBack } from '../utils/useHistoryBack';
import { TravelPassWalletView } from './TravelPassWalletView';
import type { Trip, TravelPass, Member } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  members?: Record<string, Member> | Member[];
  onSavePass: (pass: TravelPass) => Promise<void>;
  onDeletePass: (passId: string) => Promise<void>;
  isAdmin?: boolean;
}

export function TravelPassWalletModal({
  isOpen,
  onClose,
  trip,
  members,
  onSavePass,
  onDeletePass,
  isAdmin,
}: Props) {
  useEscapeKey(isOpen, onClose);
  useHistoryBack(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Travel Pass & Ticket Wallet">
      <div
        className="modal-container"
        style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '16px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <TravelPassWalletView
          trip={trip}
          members={members}
          onSavePass={onSavePass}
          onDeletePass={onDeletePass}
          isAdmin={isAdmin}
          onCloseModal={onClose}
        />
      </div>
    </div>
  );
}
