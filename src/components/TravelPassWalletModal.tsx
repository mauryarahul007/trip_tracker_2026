import { useState, useMemo, useRef } from 'react';
import type { Trip, TravelPass, TravelPassType, Member } from '../types';
import { parseBookingText, parseAllBookingPasses, type ParsedTravelPass } from '../utils/passParser';
import { extractPdfText } from '../utils/pdfExtractor';
import { triggerHaptic } from '../utils/haptics';
import { useEscapeKey } from '../utils/useEscapeKey';
import { newId } from '../utils/uuid';
import { QrCodeView } from './QrCodeView';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  members: Record<string, Member>;
  onSavePass: (pass: TravelPass) => Promise<void>;
  onDeletePass: (passId: string) => Promise<void>;
  isAdmin: boolean;
}

const PASS_THEMES: Record<TravelPassType, { icon: string; bg: string; border: string; text: string; label: string }> = {
  flight: { icon: '✈️', bg: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', border: 'rgba(59, 130, 246, 0.4)', text: '#ffffff', label: 'Flight' },
  train: { icon: '🚆', bg: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)', border: 'rgba(16, 185, 129, 0.4)', text: '#ffffff', label: 'Train' },
  stay: { icon: '🏨', bg: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)', border: 'rgba(217, 119, 6, 0.4)', text: '#ffffff', label: 'Stay / Hotel' },
  activity: { icon: '🎟️', bg: 'linear-gradient(135deg, #581c87 0%, #9333ea 100%)', border: 'rgba(147, 51, 234, 0.4)', text: '#ffffff', label: 'Activity' },
  transit: { icon: '🚕', bg: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)', border: 'rgba(100, 116, 139, 0.4)', text: '#ffffff', label: 'Transit / Cab' },
};

export function TravelPassWalletModal({
  isOpen,
  onClose,
  trip,
  members,
  onSavePass,
  onDeletePass,
  isAdmin: _isAdmin,
}: Props) {
  const [filterType, setFilterType] = useState<TravelPassType | 'all'>('all');
  const [selectedPassForQr, setSelectedPassForQr] = useState<TravelPass | null>(null);
  const [viewingAttachment, setViewingAttachment] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingPassId, setEditingPassId] = useState<string | null>(null);
  const [inputTab, setInputTab] = useState<'paste' | 'upload' | 'manual'>('upload');

  // Form Fields
  const [formType, setFormType] = useState<TravelPassType>('flight');
  const [formTitle, setFormTitle] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formReference, setFormReference] = useState('');
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

  useEscapeKey(isOpen, onClose);

  const passes = trip.passes || [];

  const filteredPasses = useMemo(() => {
    return (trip.passes || []).filter((p) => {
      if (filterType !== 'all' && p.type !== filterType) return false;
      return true;
    });
  }, [trip.passes, filterType]);

  if (!isOpen) return null;

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
    if (parsed.origin) setFormOrigin(parsed.origin);
    if (parsed.destination) setFormDestination(parsed.destination);
    if (parsed.seatOrRoom) setFormSeatOrRoom(parsed.seatOrRoom);
    if (parsed.startDateTime) setFormStartDateTime(parsed.startDateTime);
    if (parsed.endDateTime) setFormEndDateTime(parsed.endDateTime);
    if (parsed.notes) setFormNotes(parsed.notes);
  };

  const handleParsePasted = () => {
    if (!rawPastedText.trim()) return;
    triggerHaptic('medium');
    const allPasses = parseAllBookingPasses(rawPastedText);
    if (allPasses.length > 1) {
      setDetectedPasses(allPasses);
      applyParsedPassToForm(allPasses[0]);
      setExtractionMessage(`Found ${allPasses.length} flight segments in text! Segment 1 loaded.`);
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
              setExtractionMessage(`Found ${allPasses.length} flight segments in ticket! Segment 1 loaded.`);
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
          console.error('[TravelPassWalletModal] PDF extraction error:', err);
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

    const newPass: TravelPass = {
      id: editingPassId || newId(),
      tripId: trip.id,
      type: formType,
      title: formTitle.trim(),
      provider: formProvider.trim() || undefined,
      referenceCode: formReference.trim() || undefined,
      startDateTime: formStartDateTime.trim() || undefined,
      endDateTime: formEndDateTime.trim() || undefined,
      origin: formOrigin.trim() || undefined,
      destination: formDestination.trim() || undefined,
      seatOrRoom: formSeatOrRoom.trim() || undefined,
      address: formAddress.trim() || undefined,
      phone: formPhone.trim() || undefined,
      notes: formNotes.trim() || undefined,
      assignedMemberIds: formAssignedMemberIds.length > 0 ? formAssignedMemberIds : undefined,
      attachmentUrl: formAttachmentUrl || undefined,
      qrData: formReference || `${formTitle} - ${trip.name}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await onSavePass(newPass);
    resetForm();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="glass-card modal-sheet fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '24px',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-elevated, rgba(15,23,42,0.03))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🎫</span>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>Travel Pass Wallet</h3>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {trip.name} • {passes.length} {passes.length === 1 ? 'pass' : 'passes'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isAdding && (
              <button
                type="button"
                className="gradient-btn"
                style={{ padding: '6px 14px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => {
                  triggerHaptic('light');
                  setIsAdding(true);
                }}
              >
                <span>+</span> Add Pass
              </button>
            )}
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '6px 12px', fontSize: '12.5px' }}
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {isAdding ? (
            /* Add / Edit Pass Form */
            <form onSubmit={handleSubmitPass} className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

                  {/* Multi-segment itinerary quick-picker and batch save */}
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
                          <span>✈️</span> Multi-Leg Itinerary ({detectedPasses.length} Segments)
                        </span>
                        <button
                          type="button"
                          className="gradient-btn"
                          style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '8px' }}
                          onClick={async () => {
                            triggerHaptic('success');
                            for (let i = 0; i < detectedPasses.length; i++) {
                              const p = detectedPasses[i];
                              await onSavePass({
                                id: newId(),
                                tripId: trip.id,
                                type: p.type,
                                title: p.title,
                                provider: p.provider,
                                referenceCode: p.referenceCode,
                                origin: p.origin,
                                destination: p.destination,
                                startDateTime: p.startDateTime,
                                endDateTime: p.endDateTime,
                                seatOrRoom: p.seatOrRoom,
                                notes: p.notes,
                                attachmentUrl: formAttachmentUrl || undefined,
                                qrData: p.referenceCode || `${p.title} - ${trip.name}`,
                                createdAt: Date.now() + i,
                                updatedAt: Date.now() + i,
                              });
                            }
                            resetForm();
                          }}
                        >
                          ⚡ Save All {detectedPasses.length} Flights
                        </button>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Select a segment to edit individually, or save all segments to your wallet at once:
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {detectedPasses.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="secondary-btn"
                            style={{
                              fontSize: '11px',
                              padding: '5px 8px',
                              borderRadius: '8px',
                              background: formTitle === p.title ? 'rgba(59, 130, 246, 0.2)' : undefined,
                              borderColor: formTitle === p.title ? '#3b82f6' : undefined,
                              color: formTitle === p.title ? '#2563eb' : undefined,
                              fontWeight: formTitle === p.title ? 700 : 500,
                            }}
                            onClick={() => {
                              triggerHaptic('light');
                              applyParsedPassToForm(p);
                            }}
                          >
                            Leg {idx + 1}: {p.origin} ➔ {p.destination}
                          </button>
                        ))}
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
                        <span>{formAttachmentUrl.startsWith('data:application/pdf') ? '📄' : '🖼️'}</span>
                        <span style={{ fontWeight: 600 }}>
                          {formAttachmentUrl.startsWith('data:application/pdf') ? 'PDF Ticket Document Attached' : 'Ticket Image Attached'}
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="pass-title">Title / Name *</label>
                      <input
                        id="pass-title"
                        type="text"
                        required
                        className="input-field"
                        placeholder="e.g. IndiGo 6E-204 or Taj Exotica"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="pass-provider">Provider / Airline</label>
                      <input
                        id="pass-provider"
                        type="text"
                        className="input-field"
                        placeholder="e.g. IndiGo, Booking.com, Airbnb"
                        value={formProvider}
                        onChange={(e) => setFormProvider(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="pass-ref">PNR / Booking Reference</label>
                      <input
                        id="pass-ref"
                        type="text"
                        className="input-field"
                        placeholder="e.g. ABC1234 or #8912"
                        value={formReference}
                        onChange={(e) => setFormReference(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="pass-seat">Seat / Room Number</label>
                      <input
                        id="pass-seat"
                        type="text"
                        className="input-field"
                        placeholder="e.g. 14A, 14B or Villa #3"
                        value={formSeatOrRoom}
                        onChange={(e) => setFormSeatOrRoom(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="pass-origin">Origin / Terminal</label>
                      <input
                        id="pass-origin"
                        type="text"
                        className="input-field"
                        placeholder="e.g. DEL Terminal 3"
                        value={formOrigin}
                        onChange={(e) => setFormOrigin(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="pass-dest">Destination</label>
                      <input
                        id="pass-dest"
                        type="text"
                        className="input-field"
                        placeholder="e.g. GOI Dabolim"
                        value={formDestination}
                        onChange={(e) => setFormDestination(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="pass-start">Departure / Check-in Time</label>
                      <input
                        id="pass-start"
                        type="text"
                        className="input-field"
                        placeholder="e.g. 15 Oct, 08:30 AM"
                        value={formStartDateTime}
                        onChange={(e) => setFormStartDateTime(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="pass-end">Arrival / Check-out Time</label>
                      <input
                        id="pass-end"
                        type="text"
                        className="input-field"
                        placeholder="e.g. 15 Oct, 11:15 AM"
                        value={formEndDateTime}
                        onChange={(e) => setFormEndDateTime(e.target.value)}
                      />
                    </div>
                  </div>

                  {formType === 'stay' && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="pass-addr">Physical Address</label>
                      <input
                        id="pass-addr"
                        type="text"
                        className="input-field"
                        placeholder="Address for 1-tap Google Maps directions"
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label" htmlFor="pass-notes">Notes / Wi-Fi / Keypad Code</label>
                    <input
                      id="pass-notes"
                      type="text"
                      className="input-field"
                      placeholder="e.g. Wi-Fi pass: beach2026, Keypad: 4821#"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                    />
                  </div>

                  {/* Member Assignment */}
                  {trip.memberIds.length > 0 && (
                    <div className="form-group">
                      <label className="form-label">Traveler Assignment</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {trip.memberIds.map((mId) => {
                          const m = members[mId];
                          if (!m) return null;
                          const isAssigned = formAssignedMemberIds.includes(mId);
                          return (
                            <button
                              key={mId}
                              type="button"
                              style={{
                                padding: '4px 10px',
                                borderRadius: '999px',
                                fontSize: '11.5px',
                                fontWeight: 500,
                                border: isAssigned ? '1.5px solid var(--primary-accent)' : '1px solid var(--border-color)',
                                background: isAssigned ? 'rgba(15, 169, 143, 0.15)' : 'var(--bg-surface, #fff)',
                                color: isAssigned ? 'var(--primary-accent)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                setFormAssignedMemberIds((prev) =>
                                  prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]
                                );
                              }}
                            >
                              {isAssigned ? '✓ ' : ''}{m.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="submit" className="gradient-btn" style={{ flex: 1, padding: '10px' }}>
                      {editingPassId ? 'Update Pass' : 'Save Pass to Wallet'}
                    </button>
                    <button type="button" className="secondary-btn" style={{ padding: '10px 16px' }} onClick={resetForm}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </form>
          ) : (
            /* Wallet Passes Stack List */
            <>
              {/* Filter Chips */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '12px', scrollbarWidth: 'none' }}>
                <button
                  type="button"
                  style={{
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    border: filterType === 'all' ? '1px solid var(--primary-accent)' : '1px solid var(--border-color)',
                    background: filterType === 'all' ? 'var(--primary-accent)' : 'var(--bg-surface, #fff)',
                    color: filterType === 'all' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => setFilterType('all')}
                >
                  All ({passes.length})
                </button>
                {(Object.keys(PASS_THEMES) as TravelPassType[]).map((t) => {
                  const count = passes.filter((p) => p.type === t).length;
                  if (count === 0 && filterType !== t) return null;
                  return (
                    <button
                      key={t}
                      type="button"
                      style={{
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        border: filterType === t ? '1px solid var(--primary-accent)' : '1px solid var(--border-color)',
                        background: filterType === t ? 'var(--primary-accent)' : 'var(--bg-surface, #fff)',
                        color: filterType === t ? '#fff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      onClick={() => setFilterType(t)}
                    >
                      {PASS_THEMES[t].icon} {PASS_THEMES[t].label} ({count})
                    </button>
                  );
                })}
              </div>

              {filteredPasses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎫</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No travel passes added yet</div>
                  <div style={{ fontSize: '12px', marginTop: '4px', maxWidth: '320px', margin: '4px auto 16px' }}>
                    Keep flight boarding passes, train tickets, hotel vouchers, and booking codes in one tap.
                  </div>
                  <button
                    type="button"
                    className="gradient-btn"
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                    onClick={() => setIsAdding(true)}
                  >
                    + Add Your First Pass
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {filteredPasses.map((pass) => {
                    const theme = PASS_THEMES[pass.type] || PASS_THEMES.activity;
                    return (
                      <div
                        key={pass.id}
                        className="glass-card fade-in"
                        style={{
                          borderRadius: '16px',
                          border: `1px solid ${theme.border}`,
                          padding: '0',
                          overflow: 'hidden',
                          background: 'var(--bg-surface, #fff)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                        }}
                      >
                        {/* Top Card Header Banner */}
                        <div
                          style={{
                            background: theme.bg,
                            color: theme.text,
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>{theme.icon}</span>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.01em' }}>
                                {pass.title}
                              </div>
                              {pass.provider && (
                                <div style={{ fontSize: '11px', opacity: 0.85 }}>{pass.provider}</div>
                              )}
                            </div>
                          </div>

                          {pass.referenceCode && (
                            <button
                              type="button"
                              style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: '1px solid rgba(255,255,255,0.4)',
                                borderRadius: '8px',
                                color: '#fff',
                                padding: '4px 8px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                              }}
                              title="Tap to copy booking code"
                              onClick={() => handleCopyCode(pass.referenceCode!, pass.id)}
                            >
                              <span>{copiedId === pass.id ? '✓ Copied' : pass.referenceCode}</span>
                              <span style={{ fontSize: '10px', opacity: 0.8 }}>📋</span>
                            </button>
                          )}
                        </div>

                        {/* Card Body */}
                        <div style={{ padding: '14px 16px' }}>
                          {/* Route Origin ➔ Destination if flight/train */}
                          {(pass.origin || pass.destination) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '15px', fontWeight: 700 }}>
                              <span>{pass.origin || '—'}</span>
                              <span style={{ color: 'var(--primary-accent)' }}>➔</span>
                              <span>{pass.destination || '—'}</span>
                            </div>
                          )}

                          {/* Date, Time, Seat Row */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '12px', marginBottom: '10px' }}>
                            {pass.startDateTime && (
                              <div>
                                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10.5px' }}>
                                  {pass.type === 'stay' ? 'Check-in' : 'Departs'}
                                </span>
                                <strong style={{ color: 'var(--text-primary)' }}>{pass.startDateTime}</strong>
                              </div>
                            )}
                            {pass.endDateTime && (
                              <div>
                                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10.5px' }}>
                                  {pass.type === 'stay' ? 'Check-out' : 'Arrives'}
                                </span>
                                <strong style={{ color: 'var(--text-primary)' }}>{pass.endDateTime}</strong>
                              </div>
                            )}
                            {pass.seatOrRoom && (
                              <div>
                                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10.5px' }}>
                                  {pass.type === 'stay' ? 'Room' : 'Seat / Berth'}
                                </span>
                                <strong style={{ color: 'var(--text-primary)' }}>{pass.seatOrRoom}</strong>
                              </div>
                            )}
                          </div>

                          {/* Address with 1-tap Google Maps */}
                          {pass.address && (
                            <div style={{ marginBottom: '8px', fontSize: '11.5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.02)', padding: '6px 10px', borderRadius: '8px' }}>
                              <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                📍 {pass.address}
                              </span>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pass.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--primary-accent)', fontWeight: 600, fontSize: '11px', flexShrink: 0, textDecoration: 'none', marginLeft: '6px' }}
                              >
                                Maps ↗
                              </a>
                            </div>
                          )}

                          {/* Notes / Wi-Fi scratchpad */}
                          {pass.notes && (
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', background: 'rgba(217, 119, 6, 0.06)', border: '1px dashed rgba(217, 119, 6, 0.25)', padding: '6px 10px', borderRadius: '8px', marginBottom: '10px' }}>
                              💡 {pass.notes}
                            </div>
                          )}

                          {/* Member assignment badges */}
                          {pass.assignedMemberIds && pass.assignedMemberIds.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Travelers:</span>
                              {pass.assignedMemberIds.map((mId) => (
                                <span
                                  key={mId}
                                  style={{
                                    fontSize: '10.5px',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    background: 'rgba(0,0,0,0.04)',
                                    color: 'var(--text-primary)',
                                    fontWeight: 500,
                                  }}
                                >
                                  {members[mId]?.name || 'Member'}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Perforated Divider */}
                          <div
                            style={{
                              borderTop: '1px dashed var(--border-color)',
                              margin: '10px -16px',
                              position: 'relative',
                            }}
                          />

                          {/* Bottom Card Actions */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
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
                                  onClick={() => setViewingAttachment(pass.attachmentUrl!)}
                                >
                                  <span>{pass.attachmentUrl.startsWith('data:application/pdf') ? '📄' : '🖼️'}</span>{' '}
                                  {pass.attachmentUrl.startsWith('data:application/pdf') ? 'View PDF' : 'Ticket Photo'}
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
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* QR Code Full Screen Modal */}
      {selectedPassForQr && (
        <div
          className="modal-overlay"
          style={{ zIndex: 999 }}
          onClick={() => setSelectedPassForQr(null)}
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
