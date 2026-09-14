import type { Trip, TravelPass } from '../types';

const DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000; // 1h, passes don't carry an explicit end time

function toIcsDateUtc(dateInput: string | number): string {
  const date = new Date(dateInput);
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function buildEventForPass(pass: TravelPass): string | null {
  if (!pass.startDateTime) return null;

  const start = new Date(pass.startDateTime);
  if (isNaN(start.getTime())) return null;

  const end = pass.endDateTime && !isNaN(new Date(pass.endDateTime).getTime())
    ? new Date(pass.endDateTime)
    : new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS);

  const location = [pass.origin, pass.destination].filter(Boolean).join(' \u2192 ') || pass.address || '';
  const descriptionParts = [
    pass.provider ? `Provider: ${pass.provider}` : '',
    pass.referenceCode ? `Reference: ${pass.referenceCode}` : '',
    pass.seatOrRoom ? `Seat/Room: ${pass.seatOrRoom}` : '',
  ].filter(Boolean);

  return [
    'BEGIN:VEVENT',
    `UID:${pass.id}@trip-tracker`,
    `DTSTAMP:${toIcsDateUtc(Date.now())}`,
    `DTSTART:${toIcsDateUtc(start.getTime())}`,
    `DTEND:${toIcsDateUtc(end.getTime())}`,
    `SUMMARY:${escapeIcsText(pass.title)}`,
    location ? `LOCATION:${escapeIcsText(location)}` : '',
    descriptionParts.length ? `DESCRIPTION:${escapeIcsText(descriptionParts.join(' | '))}` : '',
    'END:VEVENT',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/**
 * Builds an RFC 5545 .ics calendar from a trip's flight/train/hotel passes.
 * Passes without a startDateTime are skipped (nothing to schedule).
 */
export function generateTripIcs(trip: Trip): string {
  const events = (trip.passes ?? [])
    .map(buildEventForPass)
    .filter((event): event is string => Boolean(event));

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Trip Tracker//Trip Passes//EN',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadTripIcs(trip: Trip): void {
  const ics = generateTripIcs(trip);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${trip.name.replace(/[^a-z0-9]+/gi, '-') || 'trip'}-itinerary.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Hands the trip's .ics off to the OS share sheet (same navigator.share
 * pattern already used for receipt sharing) so the user can pick their
 * Calendar app directly instead of downloading a file and importing it
 * manually. Falls back to a plain file download when Web Share (or file
 * sharing specifically) isn't supported -- desktop browsers mostly.
 */
export async function shareTripIcs(trip: Trip): Promise<void> {
  const ics = generateTripIcs(trip);
  const fileName = `${trip.name.replace(/[^a-z0-9]+/gi, '-') || 'trip'}-itinerary.ics`;
  const file = new File([ics], fileName, { type: 'text/calendar' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `${trip.name} Itinerary` });
      return;
    } catch {
      // User cancelled, or the share sheet failed -- fall back to download.
    }
  }

  downloadTripIcs(trip);
}
