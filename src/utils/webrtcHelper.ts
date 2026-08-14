const COMPRESSION_MAP: [string, string][] = [
  ['a=ice-ufrag:', 'u:'],
  ['a=ice-pwd:', 'p:'],
  ['a=fingerprint:sha-256 ', 'f:'],
  ['a=setup:', 's:'],
  ['a=mid:', 'm:'],
  ['a=sctp-port:', 'c:'],
  ['a=candidate:', 'i:'],
  ['\r\n', '|'],
];

export function compressSDP(sdp: string): string {
  let u = '';
  let p = '';
  let f = '';
  let s = '';
  const candidates: string[] = [];

  const lines = sdp.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('a=ice-ufrag:')) {
      u = trimmed.replace('a=ice-ufrag:', '');
    } else if (trimmed.startsWith('a=ice-pwd:')) {
      p = trimmed.replace('a=ice-pwd:', '');
    } else if (trimmed.startsWith('a=fingerprint:sha-256 ') || trimmed.startsWith('a=fingerprint:SHA-256 ')) {
      f = trimmed.slice(trimmed.indexOf(' ') + 1);
    } else if (trimmed.startsWith('a=setup:')) {
      s = trimmed.replace('a=setup:', '');
    } else if (trimmed.startsWith('a=candidate:')) {
      candidates.push(trimmed.replace('a=candidate:', ''));
    }
  }

  if (u && p && f) {
    const cleanFingerprint = f.replaceAll(':', '');
    const payload = JSON.stringify({
      u,
      p,
      f: cleanFingerprint,
      s: s || 'actpass',
      c: candidates,
    });
    return `TT1:${payload}`;
  }

  // Fallback to basic string replacement if standard fields missing
  const filtered = lines.filter((l) => {
    if (
      l.startsWith('a=rtcp') ||
      l.startsWith('a=extmap') ||
      l.startsWith('a=rtpmap') ||
      l.startsWith('a=fmtp') ||
      l.startsWith('a=ssrc') ||
      l.startsWith('a=msid')
    ) {
      return false;
    }
    return l.trim().length > 0;
  });

  let result = filtered.join('\r\n');
  for (const [longStr, shortStr] of COMPRESSION_MAP) {
    result = result.replaceAll(longStr, shortStr);
  }
  return result;
}

export function decompressSDP(compressed: string): string {
  const trimmed = compressed.trim();
  if (trimmed.startsWith('TT1:')) {
    try {
      const data = JSON.parse(trimmed.slice(4));
      const { u, p, f, s, c = [] } = data;
      const formattedFingerprint = f.includes(':') ? f : (f.match(/.{1,2}/g)?.join(':') || f);
      const lines = [
        'v=0',
        'o=- 1234567890 2 IN IP4 127.0.0.1',
        's=-',
        't=0 0',
        'a=group:BUNDLE 0',
        'm=application 9 UDP/DTLS/sctp webrtc-datachannel',
        'c=IN IP4 0.0.0.0',
        `a=ice-ufrag:${u}`,
        `a=ice-pwd:${p}`,
        `a=fingerprint:sha-256 ${formattedFingerprint}`,
        `a=setup:${s || 'actpass'}`,
        'a=mid:0',
        'a=sctp-port:5000',
        'a=max-message-size:262144',
      ];
      if (Array.isArray(c)) {
        c.forEach((cand: string) => {
          lines.push(`a=candidate:${cand}`);
        });
      }
      return lines.join('\r\n') + '\r\n';
    } catch (e) {
      console.error('Failed to parse compact TT1 SDP:', e);
    }
  }

  // Fallback for legacy format
  let result = compressed;
  const reversedMap = [...COMPRESSION_MAP].reverse();
  for (const [longStr, shortStr] of reversedMap) {
    result = result.replaceAll(shortStr, longStr);
  }
  return result.split('\r\n').join('\r\n') + '\r\n';
}

