export interface UpiPaymentDetails {
  payeeUpiId: string;
  payeeName: string;
  amount: number;
  note?: string;
  currency?: string;
}

export interface UpiApp {
  id: string;
  name: string;
  scheme: string;
  iconBg: string;
  emoji: string;
}

export const POPULAR_UPI_APPS: UpiApp[] = [
  { id: 'gpay', name: 'Google Pay', scheme: 'gpay', iconBg: '#4285F4', emoji: '🟢' },
  { id: 'phonepe', name: 'PhonePe', scheme: 'phonepe', iconBg: '#5f259f', emoji: '🟣' },
  { id: 'paytm', name: 'Paytm', scheme: 'paytm', iconBg: '#00b9f5', emoji: '🔵' },
  { id: 'cred', name: 'CRED', scheme: 'cred', iconBg: '#1e1e1e', emoji: '💳' },
  { id: 'generic', name: 'Any UPI App', scheme: 'upi', iconBg: '#2BA89E', emoji: '⚡' },
];

export function isValidUpiId(upiId: string): boolean {
  if (!upiId) return false;
  // UPI ID format: username@bankname (alphanumeric, dots, dashes, underscores)
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return upiRegex.test(upiId.trim());
}

export function generateUpiUri(details: UpiPaymentDetails, appScheme?: string): string {
  const { payeeUpiId, payeeName, amount, note = 'Trip Settlement' } = details;
  const encodedName = encodeURIComponent(payeeName.trim() || 'Payee');
  const encodedNote = encodeURIComponent(note.trim());
  const formattedAmount = amount.toFixed(2);

  const baseParams = `pa=${encodeURIComponent(payeeUpiId.trim())}&pn=${encodedName}&am=${formattedAmount}&cu=INR&tn=${encodedNote}`;

  switch (appScheme) {
    case 'gpay':
      return `tez://upi/pay?${baseParams}`;
    case 'phonepe':
      return `phonepe://pay?${baseParams}`;
    case 'paytm':
      return `paytmmp://pay?${baseParams}`;
    case 'cred':
      return `cred://pay?${baseParams}`;
    case 'bhim':
      return `bhim://pay?${baseParams}`;
    default:
      return `upi://pay?${baseParams}`;
  }
}

export function getQrCodeUrl(upiUri: string, size = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiUri)}`;
}
