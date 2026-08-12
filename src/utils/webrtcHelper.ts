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
  // Strip audio/video descriptors and RTCP lines to keep SDP small
  const lines = sdp.split(/\r?\n/).filter((line) => {
    if (
      line.startsWith('a=rtcp') ||
      line.startsWith('a=extmap') ||
      line.startsWith('a=rtpmap') ||
      line.startsWith('a=fmtp') ||
      line.startsWith('a=ssrc') ||
      line.startsWith('a=msid')
    ) {
      return false;
    }
    return line.trim().length > 0;
  });

  let result = lines.join('\r\n');
  for (const [longStr, shortStr] of COMPRESSION_MAP) {
    result = result.replaceAll(longStr, shortStr);
  }
  return result;
}

export function decompressSDP(compressed: string): string {
  let result = compressed;
  // Reverse mapping to restore original SDP keys
  const reversedMap = [...COMPRESSION_MAP].reverse();
  for (const [longStr, shortStr] of reversedMap) {
    result = result.replaceAll(shortStr, longStr);
  }
  return result.split('\r\n').join('\r\n') + '\r\n';
}
