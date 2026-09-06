import { useState, useMemo, useRef, useCallback } from 'react';
import type { Trip, TravelPass, TravelPassType, Member } from '../types';
import { parseBookingText, parseAllBookingPasses, matchPassengerToMember, type ParsedTravelPass } from '../utils/passParser';
import { extractPdfText } from '../utils/pdfExtractor';
import { triggerHaptic } from '../utils/haptics';
import { newId } from '../utils/uuid';
import { useHistoryBack } from '../utils/useHistoryBack';
import { useEscapeKey } from '../utils/useEscapeKey';
import { QrCodeView } from './QrCodeView';
import { savePassAttachment, getPassAttachment } from '../services/passAttachmentStore';

interface Props {
  trip: Trip;
  members?: Record<string, Member> | Member[];
  onSavePass: (pass: TravelPass) => Promise<void>;
  onDeletePass: (passId: string) => Promise<void>;
  isAdmin?: boolean;
  onCloseModal?: () => void;
}

const PASS_THEMES: Record<TravelPassType, { icon: string; bg: string; border: string; text: string; label: string }> = {
  flight: { icon: '✈️', bg: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', border: 'rgba(59, 130, 246, 0.4)', text: '#ffffff', label: 'Flight' },
  train: { icon: '🚆', bg: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)', border: 'rgba(16, 185, 129, 0.4)', text: '#ffffff', label: 'Train' },
  stay: { icon: '🏨', bg: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)', border: 'rgba(217, 119, 6, 0.4)', text: '#ffffff', label: 'Stay / Hotel' },
  activity: { icon: '🎟️', bg: 'linear-gradient(135deg, #581c87 0%, #9333ea 100%)', border: 'rgba(147, 51, 234, 0.4)', text: '#ffffff', label: 'Activity' },
  transit: { icon: '🚕', bg: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)', border: 'rgba(100, 116, 139, 0.4)', text: '#ffffff', label: 'Transit / Cab' },
};

export function TravelPassWalletView({
  trip,
  members = {},
  onSavePass,
  onDeletePass,
  isAdmin: _isAdmin,
  onCloseModal,
}: Props) {
  const [filterType, setFilterType] = useState<TravelPassType | 'all'>('all');
  const [selectedPassForQr, setSelectedPassForQr] = useState<TravelPass | null>(null);
  const [viewingAttachment, setViewingAttachment] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedLegKeys, setExpandedLegKeys] = useState<Record<string, boolean>>({});
  const [sortMode, setSortMode] = useState<'leg' | 'member' | 'date'>('leg');

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingPassId, setEditingPassId] = useState<string | null>(null);
  const [inputTab, setInputTab] = useState<'upload' | 'paste' | 'manual'>('upload');

  // Form Fields
  const [formType, setFormType] = useState<TravelPassType>('flight');
  const [formTitle, setFormTitle] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formReference, setFormReference] = useState('');
  const [formPassengerName, setFormPassengerName] = useState('');
  const [formBookingId, setFormBookingId] = useState('');
  const [formLegIdentifier, setFormLegIdentifier] = useState('');
  const [formStartDateTime, setFormStartDateTime] = useState('');
  const [formEndDateTime, setFormEndDateTime] = useState('');
  const [formOrigin, setFormOrigin] = useState('');
  const [formDestination, setFormDestination] = useState('');
  const [formSeatOrRoom, setFormSeatOrRoom] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formAssignedMemberIds, setFormAssignedMemberIds] = useState<string[]>([]);
  const [formAttachmentUrl, setFormAttachmentUrl] = useState<string>('');
  const [rawPastedText, setRawPastedText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [detectedPasses, setDetectedPasses] = useState<ParsedTravelPass[]>([]);
  const [extractionMessage, setExtractionMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Back navigation & Escape key handling
  useHistoryBack(Boolean(selectedPassForQr), () => setSelectedPassForQr(null));
  useEscapeKey(Boolean(selectedPassForQr), () => setSelectedPassForQr(null));

  useHistoryBack(Boolean(viewingAttachment), () => setViewingAttachment(null));
  useEscapeKey(Boolean(viewingAttachment), () => setViewingAttachment(null));

  useHistoryBack(isAdding, () => resetForm());
  useEscapeKey(isAdding, () => resetForm());

  const membersMap = useMemo(() => {
    if (Array.isArray(members)) {
      return members.reduce<Record<string, Member>>((acc, m) => {
        acc[m.id] = m;
        return acc;
      }, {});
    }
    return members || {};
  }, [members]);

  const passes = trip.passes || [];

  const filteredPasses = useMemo(() => {
    return (trip.passes || []).filter((p) => {
      if (filterType !== 'all' && p.type !== filterType) return false;
      return true;
    });
  }, [trip.passes, filterType]);

  const handleCopyCode = (code: string, id: string) => {
    triggerHaptic('light');
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const applyParsedPassToForm = (parsed: ParsedTravelPass) => {
    setFormType(parsed.type);
    setFormTitle(parsed.title);
    if (parsed.provider) setFormProvider(parsed.provider);
    if (parsed.referenceCode) setFormReference(parsed.referenceCode);
    if (parsed.passengerName) setFormPassengerName(parsed.passengerName);
    if (parsed.bookingId) setFormBookingId(parsed.bookingId);
    if (parsed.legIdentifier) setFormLegIdentifier(parsed.legIdentifier);
    if (parsed.origin) setFormOrigin(parsed.origin);
    if (parsed.destination) setFormDestination(parsed.destination);
    if (parsed.seatOrRoom) setFormSeatOrRoom(parsed.seatOrRoom);
    if (parsed.startDateTime) setFormStartDateTime(parsed.startDateTime);
    if (parsed.endDateTime) setFormEndDateTime(parsed.endDateTime);
    if (parsed.notes) setFormNotes(parsed.notes);
    if (parsed.passengerName) {
      const matchedMemberId = matchPassengerToMember(parsed.passengerName, Object.values(membersMap));
      if (matchedMemberId) setFormAssignedMemberIds([matchedMemberId]);
    }
  };

  const handleParsePasted = () => {
    if (!rawPastedText.trim()) return;
    triggerHaptic('medium');
    const allPasses = parseAllBookingPasses(rawPastedText);
    if (allPasses.length > 1) {
      setDetectedPasses(allPasses);
      applyParsedPassToForm(allPasses[0]);
      setExtractionMessage(`Found ${allPasses.length} passes (segments & passengers) in text! Pass 1 loaded.`);
    } else if (allPasses.length === 1) {
      setDetectedPasses([]);
      applyParsedPassToForm(allPasses[0]);
      setExtractionMessage('Pass details identified & auto-filled!');
    } else {
      const parsed = parseBookingText(rawPastedText);
      applyParsedPassToForm(parsed);
      setExtractionMessage('Pass details auto-filled.');
    }
    setInputTab('manual');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerHaptic('medium');

    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setFormAttachmentUrl(base64);

      if (isPdf) {
        setIsExtracting(true);
        setExtractionMessage('Reading ticket details from PDF...');
        try {
          const extractedText = await extractPdfText(file);
          if (extractedText && extractedText.trim().length > 0) {
            setRawPastedText(extractedText);
            const allPasses = parseAllBookingPasses(extractedText);
            if (allPasses.length > 1) {
              setDetectedPasses(allPasses);
              applyParsedPassToForm(allPasses[0]);
              setExtractionMessage(`Found ${allPasses.length} passes (segments & passengers) in ticket! Pass 1 loaded.`);
            } else if (allPasses.length === 1) {
              setDetectedPasses([]);
              applyParsedPassToForm(allPasses[0]);
              setExtractionMessage('Ticket details identified and auto-filled from PDF!');
            } else {
              setFormTitle(cleanName);
              setExtractionMessage('PDF attached. Review or complete the form details.');
            }
          } else {
            setFormTitle(cleanName);
            setExtractionMessage('PDF attached. Review or complete details.');
          }
        } catch (err: any) {
          console.error('[TravelPassWalletView] PDF extraction error:', err);
          if (!formTitle) setFormTitle(cleanName);
          setExtractionMessage('PDF attached as file. Complete any additional fields below.');
        } finally {
          setIsExtracting(false);
          setInputTab('manual');
        }
      } else {
        if (!formTitle) setFormTitle(cleanName);
        setExtractionMessage('Ticket image attached.');
        setInputTab('manual');
      }
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingPassId(null);
    setInputTab('upload');
    setFormType('flight');
    setFormTitle('');
    setFormProvider('');
    setFormReference('');
    setFormPassengerName('');
    setFormBookingId('');
    setFormLegIdentifier('');
    setFormStartDateTime('');
    setFormEndDateTime('');
    setFormOrigin('');
    setFormDestination('');
    setFormSeatOrRoom('');
    setFormAddress('');
    setFormPhone('');
    setFormNotes('');
    setFormAssignedMemberIds([]);
    setFormAttachmentUrl('');
    setRawPastedText('');
    setIsExtracting(false);
    setDetectedPasses([]);
    setExtractionMessage(null);
  };

  const handleStartEdit = (pass: TravelPass) => {
    setEditingPassId(pass.id);
    setFormType(pass.type);
    setFormTitle(pass.title);
    setFormProvider(pass.provider || '');
    setFormReference(pass.referenceCode || '');
    setFormPassengerName(pass.passengerName || '');
    setFormBookingId(pass.bookingId || '');
    setFormLegIdentifier(pass.legIdentifier || '');
    setFormStartDateTime(pass.startDateTime || '');
    setFormEndDateTime(pass.endDateTime || '');
    setFormOrigin(pass.origin || '');
    setFormDestination(pass.destination || '');
    setFormSeatOrRoom(pass.seatOrRoom || '');
    setFormAddress(pass.address || '');
    setFormPhone(pass.phone || '');
    setFormNotes(pass.notes || '');
    setFormAssignedMemberIds(pass.assignedMemberIds || []);
    setFormAttachmentUrl(pass.attachmentUrl || '');
    setInputTab('manual');
    setIsAdding(true);
  };

  const handleSubmitPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    triggerHaptic('success');

    const passId = editingPassId || newId();
    let finalAttachmentUrl = formAttachmentUrl || undefined;
    if (finalAttachmentUrl && finalAttachmentUrl.startsWith('data:')) {
      const isPdf = finalAttachmentUrl.startsWith('data:application/pdf');
      const idbKey = `idb:${isPdf ? 'pdf' : 'img'}-${passId}`;
      await savePassAttachment(idbKey, finalAttachmentUrl);
      finalAttachmentUrl = idbKey;
    }

    const newPass: TravelPass = {
      id: passId,
      tripId: trip.id,
      type: formType,
      title: formTitle.trim(),
      provider: formProvider.trim() || undefined,
      referenceCode: formReference.trim() || undefined,
      passengerName: formPassengerName.trim() || undefined,
      bookingId: formBookingId.trim() || undefined,
      legIdentifier: formLegIdentifier.trim() || undefined,
      startDateTime: formStartDateTime.trim() || undefined,
      endDateTime: formEndDateTime.trim() || undefined,
      origin: formOrigin.trim() || undefined,
      destination: formDestination.trim() || undefined,
      seatOrRoom: formSeatOrRoom.trim() || undefined,
      address: formAddress.trim() || undefined,
      phone: formPhone.trim() || undefined,
      notes: formNotes.trim() || undefined,
      assignedMemberIds: formAssignedMemberIds.length > 0 ? formAssignedMemberIds : undefined,
      attachmentUrl: finalAttachmentUrl,
      qrData: formReference ? `${formReference} ${formPassengerName}`.trim() : `${formTitle} - ${trip.name}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await onSavePass(newPass);
    resetForm();
  };

  const getPassPassengerLabel = useCallback((pass: TravelPass): string => {
    if (pass.passengerName && pass.passengerName.trim()) {
      return pass.passengerName.trim();
    }
    if (pass.assignedMemberIds && pass.assignedMemberIds.length > 0) {
      const first = membersMap[pass.assignedMemberIds[0]];
      if (first?.name) return first.name;
    }
    return 'Unassigned Traveler';
  }, [membersMap]);

  const getLegDisplay = (origin?: string, destination?: string, title?: string): string => {
    if (origin && destination) return `${origin} ➔ ${destination}`;
    if (origin) return origin;
    if (destination) return destination;
    return title || 'Travel Leg';
  };

  // Group and sort passes by leg, member, or date
  const groupedPasses = useMemo(() => {
    type PassGroupKind = 'leg' | 'member' | 'solo';
    type PassGroup = {
      key: string;
      groupKind: PassGroupKind;
      type: TravelPassType;
      title: string;
      provider?: string;
      referenceCode?: string;
      origin?: string;
      destination?: string;
      startDateTime?: string;
      endDateTime?: string;
      passes: TravelPass[];
      isMultiPassengerLeg: boolean;
    };

    if (sortMode === 'member') {
      const memberMap = new Map<string, PassGroup>();
      const groups: PassGroup[] = [];

      for (const pass of filteredPasses) {
        const travelerName = getPassPassengerLabel(pass);
        const memberKey = `member::${travelerName.toUpperCase()}`;

        let group = memberMap.get(memberKey);
        if (!group) {
          group = {
            key: memberKey,
            groupKind: 'member',
            type: pass.type,
            title: travelerName,
            provider: 'Traveler',
            referenceCode: pass.referenceCode,
            passes: [],
            isMultiPassengerLeg: true,
          };
          memberMap.set(memberKey, group);
          groups.push(group);
        }
        group.passes.push(pass);
      }

      // Sort member groups alphabetically (place unassigned at the bottom)
      groups.sort((a, b) => {
        if (a.title === 'Unassigned Traveler') return 1;
        if (b.title === 'Unassigned Traveler') return -1;
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      });

      // Sort passes inside each member group chronologically
      for (const g of groups) {
        g.passes.sort((a, b) => {
          const tA = a.startDateTime || '';
          const tB = b.startDateTime || '';
          if (tA && tB) return tA.localeCompare(tB);
          return a.title.localeCompare(b.title);
        });
      }

      return groups;
    }

    // Default route leg grouping (for flight & train passes)
    const groups: PassGroup[] = [];
    const groupMap = new Map<string, PassGroup>();

    for (const pass of filteredPasses) {
      if (pass.type === 'flight' || pass.type === 'train') {
        const legKey = [
          pass.type,
          (pass.referenceCode || pass.bookingId || 'no-ref').trim().toUpperCase(),
          (pass.origin || '').trim().toUpperCase(),
          (pass.destination || '').trim().toUpperCase(),
          (pass.startDateTime || '').trim(),
        ].join('::');

        let group = groupMap.get(legKey);
        if (!group) {
          group = {
            key: legKey,
            groupKind: 'leg',
            type: pass.type,
            title: pass.title,
            provider: pass.provider,
            referenceCode: pass.referenceCode,
            origin: pass.origin,
            destination: pass.destination,
            startDateTime: pass.startDateTime,
            endDateTime: pass.endDateTime,
            passes: [],
            isMultiPassengerLeg: false,
          };
          groupMap.set(legKey, group);
          groups.push(group);
        }
        group.passes.push(pass);
        if (group.passes.length > 1) {
          group.isMultiPassengerLeg = true;
        }
      } else {
        groups.push({
          key: pass.id,
          groupKind: 'solo',
          type: pass.type,
          title: pass.title,
          provider: pass.provider,
          referenceCode: pass.referenceCode,
          origin: pass.origin,
          destination: pass.destination,
          startDateTime: pass.startDateTime,
          endDateTime: pass.endDateTime,
          passes: [pass],
          isMultiPassengerLeg: false,
        });
      }
    }

    if (sortMode === 'leg') {
      // Sort groups alphabetically by Travel Leg Name (Origin ➔ Destination or Title)
      groups.sort((a, b) => {
        const labelA = getLegDisplay(a.origin, a.destination, a.title);
        const labelB = getLegDisplay(b.origin, b.destination, b.title);
        return labelA.localeCompare(labelB, undefined, { sensitivity: 'base' });
      });
    } else {
      // sortMode === 'date' (Chronological by startDateTime)
      groups.sort((a, b) => {
        const tA = a.startDateTime || '';
        const tB = b.startDateTime || '';
        if (tA && tB) return tA.localeCompare(tB);
        if (tA) return -1;
        if (tB) return 1;
        return a.title.localeCompare(b.title);
      });
    }

    // Inside each multi-passenger leg group, sort passenger cards alphabetically
    for (const g of groups) {
      if (g.isMultiPassengerLeg) {
        g.passes.sort((a, b) => {
          const pA = getPassPassengerLabel(a);
          const pB = getPassPassengerLabel(b);
          return pA.localeCompare(pB, undefined, { sensitivity: 'base' });
        });
      }
    }

    return groups;
  }, [filteredPasses, sortMode, getPassPassengerLabel]);

  const renderSinglePassCard = (
    pass: TravelPass,
    context: 'solo' | 'leg' | 'member' = 'solo'
  ) => {
    const isInsideGroup = context !== 'solo';
    const isMemberContext = context === 'member';
    const theme = PASS_THEMES[pass.type] || PASS_THEMES.activity;
    const assignedMembers = (pass.assignedMemberIds || [])
      .map((id) => membersMap[id])
      .filter(Boolean);

    return (
      <div
        key={pass.id}
        className={`glass-card ${isInsideGroup ? 'passenger-sub-pass-card' : ''}`}
        style={{
          borderRadius: isInsideGroup ? '12px' : '16px',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          boxShadow: isInsideGroup ? 'none' : 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
        }}
      >
        {/* If standalone card: show full theme banner */}
        {!isInsideGroup && (
          <div
            style={{
              background: theme.bg,
              color: theme.text,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '22px' }}>{theme.icon}</span>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.85, fontWeight: 700 }}>
                  {pass.provider || theme.label}
                </span>
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#ffffff' }}>
                  {pass.title}
                </h4>
              </div>
            </div>
            {pass.seatOrRoom && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(8px)',
                  padding: '3px 8px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                }}
              >
                {pass.seatOrRoom}
              </div>
            )}
          </div>
        )}

        {/* Card Body */}
        <div style={{ padding: isInsideGroup ? '12px 14px' : '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          {/* Passenger Info (in standalone or leg group) */}
          {!isMemberContext && (pass.passengerName || isInsideGroup) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px' }}>👤</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {pass.passengerName || 'Individual Passenger'}
                </span>
              </div>
              {isInsideGroup && pass.seatOrRoom && (
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: '#2563eb',
                  }}
                >
                  Seat: {pass.seatOrRoom}
                </span>
              )}
            </div>
          )}

          {/* Member Context Card Header: Shows route, provider, and seat */}
          {isMemberContext && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '6px',
                borderBottom: '1px dashed var(--border-color)',
                paddingBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px' }}>{theme.icon}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {pass.title}
                  </div>
                  {pass.provider && (
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      {pass.provider}
                    </div>
                  )}
                </div>
              </div>
              {pass.seatOrRoom && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: '#2563eb',
                  }}
                >
                  Seat: {pass.seatOrRoom}
                </span>
              )}
            </div>
          )}

          {/* Route & Times (For standalone passes OR inside member-grouped passes) */}
          {(!isInsideGroup || isMemberContext) && (pass.origin || pass.destination) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: isMemberContext ? '15px' : '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                  {pass.origin || '---'}
                </div>
                {pass.startDateTime && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pass.startDateTime}</div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
                <span style={{ fontSize: isMemberContext ? '13px' : '14px', color: 'var(--primary-accent)' }}>➔</span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: isMemberContext ? '15px' : '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                  {pass.destination || '---'}
                </div>
                {pass.endDateTime && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pass.endDateTime}</div>
                )}
              </div>
            </div>
          )}

          {/* Single Date / Time for Non-Route Passes */}
          {!isInsideGroup && !pass.origin && !pass.destination && pass.startDateTime && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🗓️</span> {pass.startDateTime}
              {pass.endDateTime && ` to ${pass.endDateTime}`}
            </div>
          )}

          {/* Reference Code & Copy Pill (For standalone passes or inside member groups) */}
          {(!isInsideGroup || isMemberContext) && pass.referenceCode && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface-elevated, rgba(15,23,42,0.03))', padding: '6px 10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                PNR / Booking Ref
              </span>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  color: 'var(--primary-accent)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                onClick={() => handleCopyCode(pass.referenceCode!, pass.id)}
                title="Click to copy PNR"
              >
                <span>{pass.referenceCode}</span>
                <span style={{ fontSize: '11px', opacity: 0.8 }}>
                  {copiedId === pass.id ? '✓ Copied' : '📋'}
                </span>
              </button>
            </div>
          )}

          {/* Address / Terminal */}
          {pass.address && (
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>📍</span> {pass.address}
            </div>
          )}

          {/* Notes / Passengers */}
          {pass.notes && (
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', background: 'var(--bg-surface-hover, rgba(0,0,0,0.02))', padding: '6px 8px', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
              {pass.notes}
            </div>
          )}

          {/* Assigned Member Avatars */}
          {assignedMembers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginRight: '2px' }}>Traveler:</span>
              {assignedMembers.map((m) => (
                <span
                  key={m.id}
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(15, 169, 143, 0.1)',
                    color: 'var(--primary-accent)',
                    fontWeight: 600,
                  }}
                >
                  {m.name}
                </span>
              ))}
            </div>
          )}

          {/* Ticket Card Footer Actions */}
          <div
            style={{
              borderTop: '1px dashed var(--border-color)',
              paddingTop: '8px',
              marginTop: 'auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="secondary-btn"
                style={{ padding: '4px 10px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setSelectedPassForQr(pass)}
              >
                <span>📱</span> View QR
              </button>
              {pass.attachmentUrl && (
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ padding: '4px 10px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={async () => {
                    if (pass.attachmentUrl?.startsWith('idb:')) {
                      const resolved = await getPassAttachment(pass.attachmentUrl);
                      if (resolved) {
                        setViewingAttachment(resolved);
                      }
                    } else if (pass.attachmentUrl) {
                      setViewingAttachment(pass.attachmentUrl);
                    }
                  }}
                >
                  <span>{(pass.attachmentUrl.startsWith('data:application/pdf') || pass.attachmentUrl.startsWith('idb:pdf')) ? '📄' : '🖼️'}</span>{' '}
                  {(pass.attachmentUrl.startsWith('data:application/pdf') || pass.attachmentUrl.startsWith('idb:pdf')) ? 'View PDF' : 'Ticket Photo'}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className="secondary-btn"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                onClick={() => handleStartEdit(pass)}
              >
                Edit
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--color-danger, #ef4444)' }}
                onClick={async () => {
                  triggerHaptic('light');
                  await onDeletePass(pass.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleExpandAll = () => {
    triggerHaptic('light');
    const next: Record<string, boolean> = {};
    for (const group of groupedPasses) {
      next[group.key] = true;
    }
    setExpandedLegKeys(next);
  };

  const handleCollapseAll = () => {
    triggerHaptic('light');
    const next: Record<string, boolean> = {};
    for (const group of groupedPasses) {
      next[group.key] = false;
    }
    setExpandedLegKeys(next);
  };

  const hasCollapsibleGroups = useMemo(() => {
    return groupedPasses.some((g) => g.isMultiPassengerLeg || g.passes.length > 1);
  }, [groupedPasses]);

  const areAllExpanded = useMemo(() => {
    const multi = groupedPasses.filter((g) => g.isMultiPassengerLeg || g.passes.length > 1);
    return multi.length > 0 && multi.every((g) => expandedLegKeys[g.key] !== false);
  }, [groupedPasses, expandedLegKeys]);

  return (
    <div className="travel-pass-wallet-view fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px' }}>
      {/* Wallet Controls & Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🎫</span>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Ticket &amp; Pass Wallet</h3>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              {passes.length} {passes.length === 1 ? 'pass' : 'passes'} saved for this trip
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isAdding ? (
            <button
              type="button"
              className="gradient-btn"
              style={{ padding: '7px 14px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => {
                triggerHaptic('light');
                setIsAdding(true);
              }}
            >
              <span>+</span> Add Pass / Ticket
            </button>
          ) : (
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={resetForm}
            >
              Cancel
            </button>
          )}

          {onCloseModal && (
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              onClick={() => {
                triggerHaptic('light');
                onCloseModal();
              }}
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Add / Edit Pass Form */}
      {isAdding ? (
        <form
          onSubmit={handleSubmitPass}
          className="glass-card fade-in"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            padding: '18px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
              {editingPassId ? 'Edit Travel Pass' : 'New Travel Pass'}
            </h4>
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '3px 8px', fontSize: '11px' }}
              onClick={resetForm}
            >
              Cancel
            </button>
          </div>

          {!editingPassId && (
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.04)', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: 'none',
                  background: inputTab === 'upload' ? 'var(--card-bg, #fff)' : 'transparent',
                  color: inputTab === 'upload' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: inputTab === 'upload' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => setInputTab('upload')}
              >
                📄 Upload File
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: 'none',
                  background: inputTab === 'paste' ? 'var(--card-bg, #fff)' : 'transparent',
                  color: inputTab === 'paste' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: inputTab === 'paste' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => setInputTab('paste')}
              >
                📋 Paste SMS / Text
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: 'none',
                  background: inputTab === 'manual' ? 'var(--card-bg, #fff)' : 'transparent',
                  color: inputTab === 'manual' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: inputTab === 'manual' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => setInputTab('manual')}
              >
                ✍️ Form Entry
              </button>
            </div>
          )}

          {/* Paste tab */}
          {inputTab === 'paste' && !editingPassId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                rows={4}
                className="input-field"
                style={{ fontSize: '13px', resize: 'vertical' }}
                placeholder="Paste booking confirmation text (e.g. IndiGo Flight 6E-204 PNR: ABC123 or Hotel Taj Goa reservation)..."
                value={rawPastedText}
                onChange={(e) => setRawPastedText(e.target.value)}
              />
              <button
                type="button"
                className="gradient-btn"
                style={{ padding: '8px 14px', fontSize: '13px' }}
                disabled={!rawPastedText.trim()}
                onClick={handleParsePasted}
              >
                ⚡ Auto-Fill Pass Details
              </button>
            </div>
          )}

          {/* Upload tab */}
          {inputTab === 'upload' && !editingPassId && (
            <div style={{ textAlign: 'center', padding: '24px 16px', border: '1.5px dashed var(--border-color)', borderRadius: '12px', background: 'var(--bg-surface-elevated, rgba(15,23,42,0.02))' }}>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,application/pdf,.pdf"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '4px' }}>Upload Ticket or Boarding Pass</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Select PDF e-ticket, airline itinerary, or boarding pass screenshot
              </div>
              {isExtracting ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px', color: 'var(--primary-accent)', fontSize: '12.5px', fontWeight: 600 }}>
                  <span className="spin" style={{ display: 'inline-block' }}>⏳</span>
                  <span>Scanning and extracting ticket details...</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="gradient-btn"
                  style={{ padding: '8px 18px', fontSize: '12.5px' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File (PDF or Image)
                </button>
              )}
            </div>
          )}

          {/* Manual Form fields */}
          {(inputTab === 'manual' || editingPassId) && (
            <>
              {/* Status message banner */}
              {extractionMessage && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✨</span>
                    <span>{extractionMessage}</span>
                  </div>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)' }}
                    onClick={() => setExtractionMessage(null)}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Multi-segment / multi-passenger itinerary quick-picker and batch save */}
              {detectedPasses.length > 1 && (
                <div
                  style={{
                    background: 'rgba(59, 130, 246, 0.06)',
                    border: '1.5px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🎫</span> Multi-Pass Itinerary ({detectedPasses.length} Passes Detected)
                    </span>
                    <button
                      type="button"
                      className="gradient-btn"
                      style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px' }}
                      onClick={async () => {
                        triggerHaptic('success');
                        let sharedAttachmentKey: string | undefined = undefined;
                        if (formAttachmentUrl) {
                          if (formAttachmentUrl.startsWith('data:')) {
                            const isPdf = formAttachmentUrl.startsWith('data:application/pdf');
                            const sharedKey = `idb:${isPdf ? 'pdf' : 'img'}-${newId()}`;
                            await savePassAttachment(sharedKey, formAttachmentUrl);
                            sharedAttachmentKey = sharedKey;
                          } else {
                            sharedAttachmentKey = formAttachmentUrl;
                          }
                        }

                        for (let i = 0; i < detectedPasses.length; i++) {
                          const p = detectedPasses[i];
                          const matchedMemberId = p.passengerName ? matchPassengerToMember(p.passengerName, Object.values(membersMap)) : undefined;
                          const assignedMemberIds = matchedMemberId ? [matchedMemberId] : undefined;

                          await onSavePass({
                            id: newId(),
                            tripId: trip.id,
                            type: p.type,
                            title: p.title,
                            provider: p.provider,
                            referenceCode: p.referenceCode,
                            passengerName: p.passengerName,
                            bookingId: p.bookingId,
                            legIdentifier: p.legIdentifier,
                            origin: p.origin,
                            destination: p.destination,
                            startDateTime: p.startDateTime,
                            endDateTime: p.endDateTime,
                            seatOrRoom: p.seatOrRoom,
                            notes: p.notes,
                            assignedMemberIds,
                            attachmentUrl: sharedAttachmentKey,
                            qrData: p.referenceCode ? `${p.referenceCode} ${p.passengerName || ''}`.trim() : `${p.title} - ${trip.name}`,
                            createdAt: Date.now() + i,
                            updatedAt: Date.now() + i,
                          });
                        }
                        resetForm();
                      }}
                    >
                      ⚡ Save All {detectedPasses.length} Passes
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Select a pass to review or edit details, or save all passes to your wallet at once:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {detectedPasses.map((p, idx) => {
                      const isSelected = formTitle === p.title && formPassengerName === (p.passengerName || '');
                      return (
                        <button
                          key={idx}
                          type="button"
                          className="secondary-btn"
                          style={{
                            fontSize: '11px',
                            padding: '5px 8px',
                            borderRadius: '8px',
                            background: isSelected ? 'rgba(59, 130, 246, 0.2)' : undefined,
                            borderColor: isSelected ? '#3b82f6' : undefined,
                            color: isSelected ? '#2563eb' : undefined,
                            fontWeight: isSelected ? 700 : 500,
                          }}
                          onClick={() => {
                            triggerHaptic('light');
                            applyParsedPassToForm(p);
                          }}
                        >
                          {p.origin && p.destination ? `${p.origin} ➔ ${p.destination}` : `Pass ${idx + 1}`}
                          {p.passengerName ? ` · ${p.passengerName}` : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Attached File Preview Badge */}
              {formAttachmentUrl && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--bg-surface-elevated, rgba(15,23,42,0.03))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{(formAttachmentUrl.startsWith('data:application/pdf') || formAttachmentUrl.startsWith('idb:pdf')) ? '📄' : '🖼️'}</span>
                    <span style={{ fontWeight: 600 }}>
                      {(formAttachmentUrl.startsWith('data:application/pdf') || formAttachmentUrl.startsWith('idb:pdf')) ? 'PDF Ticket Document Attached' : 'Ticket Image Attached'}
                    </span>
                  </div>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-danger, #ef4444)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                    onClick={() => setFormAttachmentUrl('')}
                  >
                    Remove Attachment
                  </button>
                </div>
              )}

              {/* Pass Type Selector */}
              <div className="form-group">
                <label className="form-label">Pass Category</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '6px' }}>
                  {(Object.keys(PASS_THEMES) as TravelPassType[]).map((t) => {
                    const info = PASS_THEMES[t];
                    const isSelected = formType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid var(--primary-accent)' : '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(15, 169, 143, 0.1)' : 'var(--bg-surface, #fff)',
                          color: isSelected ? 'var(--primary-accent)' : 'var(--text-primary)',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          triggerHaptic('light');
                          setFormType(t);
                        }}
                      >
                        <span>{info.icon}</span>
                        <span>{info.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Provider */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Pass Title *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Flight to Goa / Taj Hotel"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Provider / Carrier</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. IndiGo, IRCTC, Marriott"
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value)}
                  />
                </div>
              </div>

              {/* Reference / PNR & Passenger Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Booking Reference / PNR</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. X9Y2Z1 or #123456"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Passenger Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Rahul Maurya"
                    value={formPassengerName}
                    onChange={(e) => setFormPassengerName(e.target.value)}
                  />
                </div>
              </div>

              {/* Seat / Berth / Room & Booking ID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Seat / Berth / Room</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 14A or Room 302"
                    value={formSeatOrRoom}
                    onChange={(e) => setFormSeatOrRoom(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Trip / Booking ID</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 260807634788"
                    value={formBookingId}
                    onChange={(e) => setFormBookingId(e.target.value)}
                  />
                </div>
              </div>

              {/* Origin & Destination */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">From / Origin</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. DEL or New Delhi"
                    value={formOrigin}
                    onChange={(e) => setFormOrigin(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">To / Destination</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. GOI or Goa"
                    value={formDestination}
                    onChange={(e) => setFormDestination(e.target.value)}
                  />
                </div>
              </div>

              {/* Departure & Arrival Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Departure / Check-in</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 15 Oct, 08:30 AM"
                    value={formStartDateTime}
                    onChange={(e) => setFormStartDateTime(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Arrival / Check-out</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 15 Oct, 11:00 AM"
                    value={formEndDateTime}
                    onChange={(e) => setFormEndDateTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Address / Terminal / Platform */}
              <div className="form-group">
                <label className="form-label">Terminal / Gate / Address</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Terminal 3 Gate 42, or Resort address"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Additional Notes</label>
                <textarea
                  rows={2}
                  className="input-field"
                  placeholder="e.g. Passengers: Rahul, Upama. Baggage: 15kg check-in. Meal booked."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              {/* Assigned Members */}
              {Object.keys(membersMap).length > 0 && (
                <div className="form-group">
                  <label className="form-label">Assign to Travelers</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Object.values(membersMap).map((m) => {
                      const isAssigned = formAssignedMemberIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            borderRadius: '16px',
                            border: isAssigned ? '1.5px solid var(--primary-accent)' : '1px solid var(--border-color)',
                            background: isAssigned ? 'rgba(15, 169, 143, 0.12)' : 'var(--bg-surface, #fff)',
                            color: isAssigned ? 'var(--primary-accent)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontWeight: isAssigned ? 700 : 500,
                          }}
                          onClick={() => {
                            triggerHaptic('light');
                            setFormAssignedMemberIds((prev) =>
                              prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                            );
                          }}
                        >
                          {m.name} {isAssigned ? '✓' : '+'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="submit"
                  className="gradient-btn"
                  style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                >
                  {editingPassId ? 'Update Travel Pass' : 'Save Travel Pass to Wallet'}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ padding: '10px 16px', fontSize: '13px' }}
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </form>
      ) : null}

      {/* Search, Sort & Expand/Collapse Controls Toolbar */}
      {passes.length > 0 && !isAdding && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '8px 12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Left: Sort By Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Sort:
            </span>
            <div style={{ display: 'inline-flex', background: 'var(--bg-surface-elevated, rgba(0,0,0,0.04))', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 9px',
                  fontSize: '11.5px',
                  fontWeight: sortMode === 'leg' ? 700 : 500,
                  background: sortMode === 'leg' ? 'var(--primary-accent)' : 'transparent',
                  color: sortMode === 'leg' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => {
                  triggerHaptic('light');
                  setSortMode('leg');
                }}
              >
                <span>🛫</span> Travel Leg
              </button>
              <button
                type="button"
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 9px',
                  fontSize: '11.5px',
                  fontWeight: sortMode === 'member' ? 700 : 500,
                  background: sortMode === 'member' ? 'var(--primary-accent)' : 'transparent',
                  color: sortMode === 'member' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => {
                  triggerHaptic('light');
                  setSortMode('member');
                }}
              >
                <span>👤</span> Member Name
              </button>
              <button
                type="button"
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 9px',
                  fontSize: '11.5px',
                  fontWeight: sortMode === 'date' ? 700 : 500,
                  background: sortMode === 'date' ? 'var(--primary-accent)' : 'transparent',
                  color: sortMode === 'date' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => {
                  triggerHaptic('light');
                  setSortMode('date');
                }}
              >
                <span>🕒</span> Date
              </button>
            </div>
          </div>

          {/* Right: Expand All / Collapse All Controls */}
          {hasCollapsibleGroups && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="secondary-btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: areAllExpanded ? 700 : 500,
                  background: areAllExpanded ? 'rgba(15, 169, 143, 0.08)' : undefined,
                }}
                onClick={handleExpandAll}
                title="Expand all ticket groups"
              >
                <span>▼</span> Expand All
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: !areAllExpanded ? 700 : 500,
                }}
                onClick={handleCollapseAll}
                title="Collapse all ticket groups"
              >
                <span>▲</span> Collapse All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter Type Pills */}
      {passes.length > 0 && !isAdding && (
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            type="button"
            className="secondary-btn"
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              borderRadius: '20px',
              background: filterType === 'all' ? 'var(--primary-accent)' : undefined,
              color: filterType === 'all' ? '#ffffff' : undefined,
              borderColor: filterType === 'all' ? 'var(--primary-accent)' : undefined,
              whiteSpace: 'nowrap',
            }}
            onClick={() => setFilterType('all')}
          >
            All ({passes.length})
          </button>
          {(Object.keys(PASS_THEMES) as TravelPassType[]).map((t) => {
            const count = passes.filter((p) => p.type === t).length;
            if (count === 0) return null;
            const theme = PASS_THEMES[t];
            const isSelected = filterType === t;
            return (
              <button
                key={t}
                type="button"
                className="secondary-btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  borderRadius: '20px',
                  background: isSelected ? 'var(--primary-accent)' : undefined,
                  color: isSelected ? '#ffffff' : undefined,
                  borderColor: isSelected ? 'var(--primary-accent)' : undefined,
                  whiteSpace: 'nowrap',
                }}
                onClick={() => setFilterType(t)}
              >
                {theme.icon} {theme.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Passes List / Deck */}
      {!isAdding && (
        <>
          {filteredPasses.length === 0 ? (
            <div
              className="glass-card"
              style={{
                textAlign: 'center',
                padding: '36px 20px',
                borderRadius: '16px',
                border: '1px dashed var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '36px' }}>🎫</span>
              <div>
                <strong style={{ fontSize: '15px', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  {filterType === 'all' ? 'No Travel Passes Added Yet' : `No ${filterType} passes found`}
                </strong>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', maxWidth: '380px', display: 'block' }}>
                  Upload e-ticket PDFs (IndiGo, Cleartrip, Air India), IRCTC train PNRs, or hotel confirmations for 1-tap offline boarding and QR access.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="gradient-btn"
                  style={{ padding: '8px 16px', fontSize: '12.5px' }}
                  onClick={() => {
                    triggerHaptic('light');
                    setInputTab('upload');
                    setIsAdding(true);
                  }}
                >
                  📄 Upload Ticket / PDF
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ padding: '8px 14px', fontSize: '12.5px' }}
                  onClick={() => {
                    triggerHaptic('light');
                    setInputTab('manual');
                    setIsAdding(true);
                  }}
                >
                  ✍️ Manual Entry
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {groupedPasses.map((group) => {
                const theme = PASS_THEMES[group.type] || PASS_THEMES.activity;
                const isExpanded = expandedLegKeys[group.key] !== false; // expanded by default
                const isMemberGroup = group.groupKind === 'member';

                if (group.isMultiPassengerLeg || isMemberGroup) {
                  return (
                    <div
                      key={group.key}
                      className="glass-card leg-group-card"
                      style={{
                        borderRadius: '16px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'var(--bg-surface)',
                      }}
                    >
                      {/* Collapsible Header */}
                      <div
                        style={{
                          background: isMemberGroup
                            ? 'linear-gradient(135deg, rgba(15, 169, 143, 0.08) 0%, rgba(20, 184, 166, 0.08) 100%)'
                            : 'linear-gradient(135deg, rgba(30, 58, 138, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
                          borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '8px',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          triggerHaptic('light');
                          setExpandedLegKeys((prev) => ({
                            ...prev,
                            [group.key]: !isExpanded,
                          }));
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '22px' }}>{isMemberGroup ? '👤' : theme.icon}</span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.3px' }}>
                                {isMemberGroup ? group.title : `${group.origin || 'Route'} ➔ ${group.destination || 'Leg'}`}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: isMemberGroup ? 'rgba(15, 169, 143, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                  color: isMemberGroup ? 'var(--primary-accent)' : '#2563eb',
                                  fontWeight: 700,
                                }}
                              >
                                {isMemberGroup ? 'Traveler' : (group.provider || theme.label)}
                              </span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {isMemberGroup ? (
                                `${group.passes.length} ${group.passes.length === 1 ? 'ticket / boarding pass' : 'tickets / boarding passes'}`
                              ) : (
                                <>
                                  {group.title}
                                  {group.startDateTime && ` · ${group.startDateTime}`}
                                  {group.endDateTime && ` ➔ ${group.endDateTime}`}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                          {!isMemberGroup && group.referenceCode && (
                            <button
                              type="button"
                              style={{
                                background: 'var(--bg-surface-elevated, rgba(15,23,42,0.04))',
                                border: '1px solid var(--border-color)',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '11.5px',
                                color: 'var(--primary-accent)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '6px',
                              }}
                              onClick={() => handleCopyCode(group.referenceCode!, group.key)}
                              title="Click to copy PNR"
                            >
                              <span>PNR: {group.referenceCode}</span>
                              <span style={{ fontSize: '10px', opacity: 0.8 }}>
                                {copiedId === group.key ? '✓' : '📋'}
                              </span>
                            </button>
                          )}

                          <button
                            type="button"
                            style={{
                              border: 'none',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: isMemberGroup ? 'var(--primary-accent)' : '#2563eb',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              background: isMemberGroup ? 'rgba(15, 169, 143, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            }}
                            onClick={() => {
                              triggerHaptic('light');
                              setExpandedLegKeys((prev) => ({
                                ...prev,
                                [group.key]: !isExpanded,
                              }));
                            }}
                          >
                            <span>{isMemberGroup ? '🎫' : '👥'} {group.passes.length} {group.passes.length === 1 ? 'Pass' : 'Passes'}</span>
                            <span style={{ fontSize: '10px' }}>{isExpanded ? '▲' : '▼'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Expanded Passenger Cards Container */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: '12px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '10px',
                            background: 'var(--bg-surface-hover, rgba(0,0,0,0.02))',
                          }}
                        >
                          {group.passes.map((pass) => renderSinglePassCard(pass, isMemberGroup ? 'member' : 'leg'))}
                        </div>
                      )}
                    </div>
                  );
                }

                // Single / Solo pass
                return renderSinglePassCard(group.passes[0], 'solo');
              })}
            </div>
          )}
        </>
      )}

      {/* QR Code Full Screen Modal */}
      {selectedPassForQr && (
        <div
          className="modal-overlay"
          style={{ zIndex: 999 }}
          onClick={() => setSelectedPassForQr(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="glass-card modal-sheet fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '340px', textAlign: 'center', padding: '24px 20px', borderRadius: '20px' }}
          >
            <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{selectedPassForQr.title}</h4>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {selectedPassForQr.referenceCode ? `PNR: ${selectedPassForQr.referenceCode}` : 'Gate / Turnstile Scanner Pass'}
            </div>
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '16px', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <QrCodeView value={selectedPassForQr.qrData || selectedPassForQr.referenceCode || selectedPassForQr.title} size={220} />
            </div>
            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="gradient-btn"
                style={{ width: '100%', padding: '8px' }}
                onClick={() => setSelectedPassForQr(null)}
              >
                Close Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Full-Screen Lightbox / PDF Viewer */}
      {viewingAttachment && (
        <div
          className="modal-overlay"
          style={{ zIndex: 999 }}
          onClick={() => setViewingAttachment(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="glass-card modal-sheet fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '540px', padding: '20px', textAlign: 'center', borderRadius: '20px' }}
          >
            {viewingAttachment.startsWith('data:application/pdf') ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '16px 8px' }}>
                <span style={{ fontSize: '48px' }}>📄</span>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>PDF Ticket Document</h4>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
                    Official e-ticket document attached to this travel pass.
                  </p>
                </div>
                <a
                  href={viewingAttachment}
                  download="e-ticket.pdf"
                  className="gradient-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  <span>⬇️</span> Download / Open PDF
                </a>
              </div>
            ) : (
              <img
                src={viewingAttachment}
                alt="Ticket Pass"
                style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '12px' }}
              />
            )}
            <button
              type="button"
              className="secondary-btn"
              style={{ marginTop: '14px', width: '100%', padding: '8px' }}
              onClick={() => setViewingAttachment(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
