import { describe, it, expect } from 'vitest';
import { compressSDP, decompressSDP } from './webrtcHelper';

describe('WebRTC SDP Ultra-Compact Helper', () => {
  const sampleOfferSDP = [
    'v=0',
    'o=- 4123567890 2 IN IP4 127.0.0.1',
    's=-',
    't=0 0',
    'a=group:BUNDLE 0',
    'a=extmap:1 urn:ietf:params:rtp-hdrext:sdes:mid',
    'a=msid-semantic: WMS',
    'm=application 9 UDP/DTLS/sctp webrtc-datachannel',
    'c=IN IP4 0.0.0.0',
    'a=ice-ufrag:abcd',
    'a=ice-pwd:verylongpassword12345678901234',
    'a=fingerprint:sha-256 12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF',
    'a=setup:actpass',
    'a=mid:0',
    'a=sctp-port:5000',
    'a=max-message-size:262144',
    'a=candidate:1 1 UDP 2122260223 192.168.1.100 54321 typ host',
    'a=candidate:2 1 UDP 2122260223 10.0.0.5 54322 typ host',
  ].join('\r\n');

  it('compresses full WebRTC SDP to compact TT1 payload under 250 characters', () => {
    const compressed = compressSDP(sampleOfferSDP);
    expect(compressed.startsWith('TT1:')).toBe(true);
    expect(compressed.length).toBeLessThan(250);
  });

  it('decompresses TT1 payload back into valid RFC 8839 SDP with all essential parameters', () => {
    const compressed = compressSDP(sampleOfferSDP);
    const restored = decompressSDP(compressed);

    expect(restored).toContain('v=0');
    expect(restored).toContain('a=ice-ufrag:abcd');
    expect(restored).toContain('a=ice-pwd:verylongpassword12345678901234');
    expect(restored).toContain('a=fingerprint:sha-256 12:34:56:78:90:AB:CD:EF');
    expect(restored).toContain('a=setup:actpass');
    expect(restored).toContain('m=application 9 UDP/DTLS/sctp webrtc-datachannel');
    expect(restored).toContain('a=candidate:1 1 UDP 2122260223 192.168.1.100 54321 typ host');
    expect(restored).toContain('a=candidate:2 1 UDP 2122260223 10.0.0.5 54322 typ host');
  });

  it('handles Answer SDP with setup:active correctly', () => {
    const answerSDP = sampleOfferSDP.replace('a=setup:actpass', 'a=setup:active');
    const compressed = compressSDP(answerSDP);
    const restored = decompressSDP(compressed);

    expect(compressed.startsWith('TT1:')).toBe(true);
    expect(restored).toContain('a=setup:active');
  });

  it('falls back gracefully on legacy or non-standard SDP', () => {
    const nonStandard = 'v=0\r\na=mid:data\r\na=sctp-port:5000\r\n';
    const compressed = compressSDP(nonStandard);
    const restored = decompressSDP(compressed);

    expect(restored).toContain('a=sctp-port:5000');
  });
});
