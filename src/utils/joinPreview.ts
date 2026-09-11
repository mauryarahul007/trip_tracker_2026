export interface JoinPreviewResult {
  tripName: string;
  startDate: string;
  endDate: string;
  memberFirstNames: string[];
}

export function toFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

/** Maps the public preview RPC row. Strips last names again client-side. */
export function mapJoinPreviewRow(
  row: {
    trip_name?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    member_first_names?: string[] | null;
  } | null
): JoinPreviewResult | null {
  if (!row?.trip_name) return null;
  return {
    tripName: row.trip_name,
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? '',
    memberFirstNames: (row.member_first_names ?? []).map(toFirstName).filter(Boolean),
  };
}
