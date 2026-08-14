import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { compressSDP, decompressSDP } from '../utils/webrtcHelper';
import { mergeP2PStates, type P2PState } from '../utils/p2pSync';
import { useTripStore } from '../store/tripStore';
import { IconClose, IconCheckCircle, IconAlertCircle, IconMembers } from './Icons';

type Props = {
  onClose: () => void;
};

type SyncStep =
  | 'choose_role'
  | 'host_show_offer'
  | 'host_scan_answer'
  | 'join_scan_offer'
  | 'join_show_answer'
  | 'syncing'
  | 'success'
  | 'error';

export function OfflinePeerSync({ onClose }: Props) {
  const {
    activeTripId,
    expenses,
    categories,
    members,
    groups,
    syncQueue,
    applyP2PMergedState,
  } = useTripStore();

  const [step, setStep] = useState<SyncStep>('choose_role');
  const [errorMessage, setErrorMessage] = useState('');
  const [syncSummary, setSyncSummary] = useState({ expenses: 0, actions: 0 });

  // WebRTC Refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);

  // QR Code Refs
  const offerCanvasRef = useRef<HTMLCanvasElement>(null);
  const answerCanvasRef = useRef<HTMLCanvasElement>(null);
  const [offerQrData, setOfferQrData] = useState('');
  const [answerQrData, setAnswerQrData] = useState('');
  const [copied, setCopied] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Render QR offer canvas when offer data is generated
  useEffect(() => {
    if (step === 'host_show_offer' && offerCanvasRef.current && offerQrData) {
      QRCode.toCanvas(offerCanvasRef.current, offerQrData, { width: 260, margin: 2, errorCorrectionLevel: 'L' }, (err) => {
        if (err) console.error('Failed to generate offer QR:', err);
      });
    }
  }, [step, offerQrData]);

  // Render QR answer canvas when answer data is generated
  useEffect(() => {
    if (step === 'join_show_answer' && answerCanvasRef.current && answerQrData) {
      QRCode.toCanvas(answerCanvasRef.current, answerQrData, { width: 260, margin: 2, errorCorrectionLevel: 'L' }, (err) => {
        if (err) console.error('Failed to generate answer QR:', err);
      });
    }
  }, [step, answerQrData]);

  // Cleanup WebRTC connections and camera scanners on unmount
  useEffect(() => {
    return () => {
      cleanupScanner();
      cleanupWebRTC();
    };
  }, []);

  const cleanupScanner = () => {
    setIsScanning(false);
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current.stop().catch((e) => console.error('Scanner stop error:', e));
    }
    html5QrCodeRef.current = null;
  };

  const cleanupWebRTC = () => {
    if (channelRef.current) {
      channelRef.current.close();
      channelRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  const getLocalP2PState = (): P2PState => {
    const customCategories = categories.filter((c) => c.isCustom);
    return {
      expenses: expenses.filter((e) => e.tripId === activeTripId),
      categories: customCategories,
      members,
      groups,
      syncQueue,
    };
  };

  // --- WebRTC HANDSHAKE & SIGNALING LOGIC ---

  // Host (Peer A) Initiates WebRTC Offer
  const startHostFlow = async () => {
    try {
      cleanupWebRTC();
      setStep('host_show_offer');

      // Offline connection: no STUN/TURN needed, keeping iceServers empty
      const pc = new RTCPeerConnection({ iceServers: [] });
      pcRef.current = pc;

      // DataChannel initiator must create the channel before creating offer
      const channel = pc.createDataChannel('sync', { negotiated: false });
      channelRef.current = channel;

      wireHostDataChannel(channel);

      // Create Local Offer SDP
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // We need to wait for local ICE candidate collection to complete before building QR
      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          // SDP is fully gathered
          const compressed = compressSDP(pc.localDescription?.sdp || '');
          setOfferQrData(compressed);
        }
      };

      // Fallback if ICE collection completes instantly
      if (pc.iceGatheringState === 'complete') {
        const compressed = compressSDP(pc.localDescription?.sdp || '');
        setOfferQrData(compressed);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start host connection.');
      setStep('error');
    }
  };

  // Host wires their DataChannel listener
  const wireHostDataChannel = (channel: RTCDataChannel) => {
    channel.onopen = () => {
      setStep('syncing');
      // Host immediately sends their local state to the joiner
      const state = getLocalP2PState();
      channel.send(JSON.stringify({ type: 'offer_state', payload: state }));
    };

    channel.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'merged_state') {
          // Apply final merged state from the receiver
          await applyP2PMergedState(message.payload);
          setSyncSummary({
            expenses: message.payload.expenses.length,
            actions: message.payload.syncQueue.length,
          });

          // Inform receiver that sync is successful
          channel.send(JSON.stringify({ type: 'sync_complete' }));
          setStep('success');
          cleanupWebRTC();
        }
      } catch (err) {
        console.error('Host message error:', err);
        setErrorMessage('Failed to parse merged data.');
        setStep('error');
      }
    };

    channel.onerror = (e) => {
      console.error('Data channel error:', e);
      setErrorMessage('Direct data transfer connection lost.');
      setStep('error');
    };
  };

  // Participant (Peer B) processes scanned SDP Offer and generates SDP Answer
  const handleOfferScanSuccess = async (scannedOffer: string) => {
    try {
      cleanupScanner();
      setStep('join_show_answer');

      const sdp = decompressSDP(scannedOffer);
      const pc = new RTCPeerConnection({ iceServers: [] });
      pcRef.current = pc;

      // Participant receives the DataChannel from the connection
      pc.ondatachannel = (event) => {
        const channel = event.channel;
        channelRef.current = channel;
        wireJoinerDataChannel(channel);
      };

      // Set Remote Offer description
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));

      // Create Local Answer description
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Wait for ICE candidates collection to complete before displaying QR
      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          const compressed = compressSDP(pc.localDescription?.sdp || '');
          setAnswerQrData(compressed);
        }
      };

      if (pc.iceGatheringState === 'complete') {
        const compressed = compressSDP(pc.localDescription?.sdp || '');
        setAnswerQrData(compressed);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process offer QR code.');
      setStep('error');
    }
  };

  // Joiner wires their DataChannel listener
  const wireJoinerDataChannel = (channel: RTCDataChannel) => {
    channel.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'offer_state') {
          setStep('syncing');

          // Core synchronization: merge Host and Joiner local states
          const joinerState = getLocalP2PState();
          const hostState = message.payload;
          const mergedState = mergeP2PStates(joinerState, hostState);

          // Apply merged state locally to the Joiner
          await applyP2PMergedState(mergedState);
          setSyncSummary({
            expenses: mergedState.expenses.length,
            actions: mergedState.syncQueue.length,
          });

          // Send back the final unified merged state to the Host
          channel.send(JSON.stringify({ type: 'merged_state', payload: mergedState }));
        } else if (message.type === 'sync_complete') {
          setStep('success');
          cleanupWebRTC();
        }
      } catch (err) {
        console.error('Joiner message error:', err);
        setErrorMessage('Failed to merge databases.');
        setStep('error');
      }
    };

    channel.onerror = (e) => {
      console.error('Data channel error:', e);
      setErrorMessage('Direct data transfer connection lost.');
      setStep('error');
    };
  };

  // Host scans Participant's SDP Answer QR Code
  const handleAnswerScanSuccess = async (scannedAnswer: string) => {
    try {
      cleanupScanner();
      const sdp = decompressSDP(scannedAnswer);
      if (pcRef.current) {
        // Complete the handshake
        await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
        setStep('syncing');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process answer QR code.');
      setStep('error');
    }
  };

  // --- CAMERA SCANNER MOUNT & LAUNCH ---
  const startCameraScanner = (scanType: 'offer' | 'answer') => {
    setIsScanning(true);
    setShowManualInput(false);
    setManualCodeInput('');
    setTimeout(() => {
      try {
        const html5Qr = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = html5Qr;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edgeSize = Math.max(180, Math.floor(minEdge * 0.82));
            return { width: edgeSize, height: edgeSize };
          },
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        };

        html5Qr
          .start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              if (scanType === 'offer') {
                handleOfferScanSuccess(decodedText);
              } else {
                handleAnswerScanSuccess(decodedText);
              }
            },
            () => {}
          )
          .catch((e) => {
            console.error('Camera initialization failed:', e);
            setIsScanning(false);
          });
      } catch (e) {
        console.error('Scanner start error:', e);
        setIsScanning(false);
      }
    }, 150);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-card fade-in modal-sheet"
        style={{
          maxWidth: '420px',
          background: 'var(--bg-surface)',
          boxShadow: 'var(--glass-shadow)',
          border: '1px solid var(--border-color)',
          position: 'relative',
          padding: '24px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          className="secondary-btn"
          style={{ position: 'absolute', top: '16px', right: '16px', padding: '6px' }}
          onClick={onClose}
        >
          <IconClose size={14} className="icon-sm" />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(31,110,104,0.08)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-accent)', marginBottom: '8px'
          }}>
            <IconMembers size={18} className="icon" />
          </div>
          <h3 style={{ fontSize: '17px', margin: 0 }}>Offline Peer Sync</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', marginLeft: '20px', marginRight: '20px' }}>
            Sync and merge trip logs directly without internet using peer-to-peer visual codes.
          </p>
        </div>

        {/* STEP: Choose Role */}
        {step === 'choose_role' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="button"
              className="gradient-btn"
              style={{ padding: '12px' }}
              onClick={startHostFlow}
            >
              Generate Invite (Host)
            </button>
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '12px', borderStyle: 'solid' }}
              onClick={() => {
                setStep('join_scan_offer');
                startCameraScanner('offer');
              }}
            >
              Join / Scan Invite (Participant)
            </button>
          </div>
        )}

        {/* STEP: Host Show Offer QR */}
        {step === 'host_show_offer' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Step 1: Participant scans this code</span>
            <div style={{ background: '#FFF', padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
              {offerQrData ? (
                <canvas ref={offerCanvasRef} style={{ width: '260px', height: '260px', display: 'block' }} />
              ) : (
                <div style={{ width: '260px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Generating visual handshake...
                </div>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Ask the participant to select "Join / Scan Invite" and point their camera at this QR Code.
            </p>

            {offerQrData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px' }}
                  onClick={() => {
                    navigator.clipboard.writeText(offerQrData);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? '✓ Copied to clipboard' : '📋 Copy Connection Code'}
                </button>
                <button
                  type="button"
                  className="gradient-btn"
                  style={{ width: '100%', padding: '10px' }}
                  onClick={() => {
                    setStep('host_scan_answer');
                    startCameraScanner('answer');
                  }}
                >
                  Next: Scan Participant's Answer
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP: Host Scan Participant's Answer QR */}
        {step === 'host_scan_answer' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Step 2: Scan the Participant's screen</span>

            {!showManualInput ? (
              <>
                <div style={{ width: '100%', aspectRatio: '1.1', background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                  <div id="qr-reader" style={{ width: '100%' }} />
                  {!isScanning && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', padding: '16px', gap: '8px' }}>
                      <span>Camera feed not active</span>
                      <button
                        type="button"
                        className="gradient-btn"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => setShowManualInput(true)}
                      >
                        Enter Code Manually
                      </button>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  Scan the Answer QR code generated on the Participant's screen.
                </p>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px' }}
                  onClick={() => {
                    cleanupScanner();
                    setShowManualInput(true);
                  }}
                >
                  ⌨️ Paste Code Manually
                </button>
              </>
            ) : (
              <div className="fade-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Paste the participant's connection code (starts with TT1:)..."
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
                <button
                  type="button"
                  className="gradient-btn"
                  style={{ width: '100%', padding: '10px' }}
                  disabled={!manualCodeInput.trim()}
                  onClick={() => handleAnswerScanSuccess(manualCodeInput.trim())}
                >
                  Submit Code
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ width: '100%', padding: '8px' }}
                  onClick={() => {
                    setShowManualInput(false);
                    startCameraScanner('answer');
                  }}
                >
                  Back to Camera Scanner
                </button>
              </div>
            )}

            <button
              type="button"
              className="secondary-btn"
              style={{ width: '100%', padding: '8px' }}
              onClick={() => {
                cleanupScanner();
                startHostFlow();
              }}
            >
              Back to Offer QR
            </button>
          </div>
        )}

        {/* STEP: Participant Scan Host's Offer QR */}
        {step === 'join_scan_offer' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Step 1: Scan Host's screen invite</span>

            {!showManualInput ? (
              <>
                <div style={{ width: '100%', aspectRatio: '1.1', background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                  <div id="qr-reader" style={{ width: '100%' }} />
                  {!isScanning && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', padding: '16px', gap: '8px' }}>
                      <span>Camera feed not active</span>
                      <button
                        type="button"
                        className="gradient-btn"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => setShowManualInput(true)}
                      >
                        Enter Code Manually
                      </button>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  Align your camera with the QR code displayed on the Host's screen.
                </p>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px' }}
                  onClick={() => {
                    cleanupScanner();
                    setShowManualInput(true);
                  }}
                >
                  ⌨️ Paste Code Manually
                </button>
              </>
            ) : (
              <div className="fade-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Paste the host's invite code (starts with TT1:)..."
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
                <button
                  type="button"
                  className="gradient-btn"
                  style={{ width: '100%', padding: '10px' }}
                  disabled={!manualCodeInput.trim()}
                  onClick={() => handleOfferScanSuccess(manualCodeInput.trim())}
                >
                  Submit Code
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ width: '100%', padding: '8px' }}
                  onClick={() => {
                    setShowManualInput(false);
                    startCameraScanner('offer');
                  }}
                >
                  Back to Camera Scanner
                </button>
              </div>
            )}

            <button
              type="button"
              className="secondary-btn"
              style={{ width: '100%', padding: '8px' }}
              onClick={() => {
                cleanupScanner();
                setStep('choose_role');
              }}
            >
              Back
            </button>
          </div>
        )}

        {/* STEP: Participant Display Answer QR */}
        {step === 'join_show_answer' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Step 2: Host scans your answer</span>
            <div style={{ background: '#FFF', padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
              {answerQrData ? (
                <canvas ref={answerCanvasRef} style={{ width: '260px', height: '260px', display: 'block' }} />
              ) : (
                <div style={{ width: '260px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Processing invite offer...
                </div>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Show this QR code to the Host and ask them to scan it.
            </p>
            {answerQrData && (
              <button
                type="button"
                className="secondary-btn"
                style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px' }}
                onClick={() => {
                  navigator.clipboard.writeText(answerQrData);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? '✓ Copied to clipboard' : '📋 Copy Connection Code'}
              </button>
            )}
          </div>
        )}

        {/* STEP: Syncing progress */}
        {step === 'syncing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px 0', textAlign: 'center' }}>
            <div className="spinner" style={{ border: '3.5px solid rgba(31,110,104,0.1)', borderTopColor: 'var(--primary-accent)', borderRadius: '50%', width: '36px', height: '36px', animation: 'spin 0.8s linear infinite' }} />
            <div>
              <span style={{ fontSize: '14px', fontWeight: 600, display: 'block' }}>Exchanging logs...</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                Connecting directly via peer-to-peer data channels and merging transaction databases.
              </span>
            </div>
          </div>
        )}

        {/* STEP: Success */}
        {step === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', padding: '10px 0' }}>
            <div style={{ color: 'var(--color-success)' }}>
              <IconCheckCircle size={44} className="icon" />
            </div>
            <div>
              <h4 style={{ fontSize: '16px', margin: '0 0 6px' }}>Sync Complete!</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Trip databases have been successfully merged.
              </p>
              <div style={{
                background: 'rgba(79,174,114,0.08)',
                color: 'var(--color-success)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 500,
                marginTop: '16px',
                display: 'inline-block',
                textAlign: 'left'
              }}>
                • Unified list: {syncSummary.expenses} expenses total<br />
                • Actions pending upload: {syncSummary.actions}
              </div>
            </div>
            <button
              type="button"
              className="gradient-btn"
              style={{ width: '100%', padding: '12px', marginTop: '10px' }}
              onClick={onClose}
            >
              Done
            </button>
          </div>
        )}

        {/* STEP: Error */}
        {step === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', padding: '10px 0' }}>
            <div style={{ color: 'var(--color-danger)' }}>
              <IconAlertCircle size={44} className="icon" />
            </div>
            <div>
              <h4 style={{ fontSize: '16px', margin: '0 0 6px', color: 'var(--color-danger)' }}>Sync Failed</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {errorMessage || 'An error occurred during WebRTC handshake or data serialization.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1, padding: '10px' }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="gradient-btn"
                style={{ flex: 1, padding: '10px' }}
                onClick={() => {
                  cleanupScanner();
                  cleanupWebRTC();
                  setStep('choose_role');
                  setErrorMessage('');
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
