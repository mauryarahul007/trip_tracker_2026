export interface SettlementShareCardInput {
  tripName: string;
  fromLabel: string;
  toLabel: string;
  amount: number;
  currencySymbol: string;
  upiId?: string | null;
}

export interface SettlementShareCardLayout {
  width: number;
  height: number;
  amountText: string;
  caption: string;
  fileName: string;
  lines: string[];
}

export function formatSettlementAmount(amount: number, currencySymbol: string): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `${currencySymbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildSettlementShareCaption(input: SettlementShareCardInput): string {
  const amountText = formatSettlementAmount(input.amount, input.currencySymbol);
  return `Hey ${input.fromLabel}, just a reminder to settle ${amountText} to ${input.toLabel} for our trip "${input.tripName || 'Trip'}".`;
}

export function getSettlementShareCardLayout(input: SettlementShareCardInput): SettlementShareCardLayout {
  const amountText = formatSettlementAmount(input.amount, input.currencySymbol);
  const lines = [
    input.tripName || 'Trip',
    'Settle up',
    `${input.fromLabel} → ${input.toLabel}`,
    amountText,
  ];
  if (input.upiId) lines.push(`UPI ${input.upiId}`);
  lines.push('Tracked with Trip Tracker');
  const slug = (input.tripName || 'trip').replace(/\s+/g, '_').replace(/[^\w-]/g, '');
  return {
    width: 1080,
    height: input.upiId ? 720 : 640,
    amountText,
    caption: buildSettlementShareCaption(input),
    fileName: `${slug || 'trip'}_settle.png`,
    lines,
  };
}

export function drawSettlementShareCard(
  ctx: CanvasRenderingContext2D,
  input: SettlementShareCardInput
): SettlementShareCardLayout {
  const layout = getSettlementShareCardLayout(input);
  const { width, height } = layout;
  ctx.fillStyle = '#0F151D';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#FF7A00';
  ctx.fillRect(0, 0, 16, height);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '600 28px sans-serif';
  ctx.fillText(layout.lines[0], 72, 96);

  ctx.fillStyle = '#F2ECDC';
  ctx.font = '700 36px sans-serif';
  ctx.fillText(layout.lines[1], 72, 168);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 42px sans-serif';
  ctx.fillText(layout.lines[2], 72, 260);

  ctx.fillStyle = '#FF7A00';
  ctx.font = '800 88px sans-serif';
  ctx.fillText(layout.amountText, 72, 400);

  if (input.upiId) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '500 28px sans-serif';
    ctx.fillText(`UPI ${input.upiId}`, 72, 480);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '500 24px sans-serif';
  ctx.fillText('Tracked with Trip Tracker · trip-tracker.blackmaroon.in', 72, height - 64);
  return layout;
}

export async function canvasToPngFile(canvas: HTMLCanvasElement, fileName: string): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not render settlement card');
  return new File([blob], fileName, { type: 'image/png' });
}
