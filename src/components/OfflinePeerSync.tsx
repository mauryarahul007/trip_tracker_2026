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

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Render QR offer canvas when offer data is generated
  useEffect(() => {
    if (step === 'host_show_offer' && offerCanvasRef.current && offerQrData) {
      QRCode.toCanvas(offerCanvasRef.current, offerQrData, { width: 220, margin: 1 }, (err) => {
        if (err) console.error('Failed to generate offer QR:', err);
      });
    }
  }, [step, offerQrData]);

  // Render QR answer canvas when answer data is generated
  useEffect(() => {
    if (step === 'join_show_answer' && answerCanvasRef.current && answerQrData) {
      QRCode.toCanvas(answerCanvasRef.current, answerQrData, { width: 220, margin: 1 }, (err) => {
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
    setTimeout(() => {
      try {
        const html5Qr = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = html5Qr;

        html5Qr
          .start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 220 },
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
            alert('Could not start camera feed. Please check camera permissions in your browser.');
          });
      } catch (e) {
        console.error('Scanner start error:', e);
        setIsScanning(false);
      }
    }, 150);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 1100, padding: '20px', backdropFilter: 'blur(4px)'
    }}>
      <div className="glass-card fade-in" style={{
        width: '100%', maxWidth: '420px', background: '#ffffff',
        border: '1px solid var(--border-color)', position: 'relative', padding: '24px'
      }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Step 1: Participant scans this code</span>
            <div style={{ background: '#FFF', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
              {offerQrData ? (
                <canvas ref={offerCanvasRef} style={{ width: '220px', height: '220px' }} />
              ) : (
                <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Generating visual handshake...
                </div>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Ask the participant to select "Join / Scan Invite" and point their camera at this QR Code.
            </p>
            {offerQrData && (
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
            )}
          </div>
        )}

        {/* STEP: Host Scan Participant's Answer QR */}
        {step === 'host_scan_answer' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Step 2: Scan the Participant's screen</span>
            <div style={{ width: '100%', aspectRatio: '1.2', background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
              <div id="qr-reader" style={{ width: '100%' }} />
              {!isScanning && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px' }}>
                  Initializing camera scanner...
                </div>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Scan the Answer QR code generated on the Participant's screen to complete the peer handshake.
            </p>
            <button
              type="button"
              className="secondary-btn"
              style={{ width: '100%', padding: '10px' }}
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Step 1: Scan Host's screen invite</span>
            <div style={{ width: '100%', aspectRatio: '1.2', background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
              <div id="qr-reader" style={{ width: '100%' }} />
              {!isScanning && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px' }}>
                  Initializing camera scanner...
                </div>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Align your camera with the QR code displayed on the Host's screen.
            </p>
            <button
              type="button"
              className="secondary-btn"
              style={{ width: '100%', padding: '10px' }}
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Step 2: Host scans your answer</span>
            <div style={{ background: '#FFF', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
              {answerQrData ? (
                <canvas ref={answerCanvasRef} style={{ width: '220px', height: '220px' }} />
              ) : (
                <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Processing invite offer...
                </div>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Show this QR code to the Host and ask them to click "Next: Scan Participant's Answer" and scan this code.
            </p>
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
