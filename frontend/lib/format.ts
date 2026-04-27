// Mirror the prototype's `fmt(n)` helper — integer USD with no decimals.
// API returns price/was in cents; convert before formatting.
export function fmt(cents: number | null | undefined): string {
  if (cents == null) return '';
  return (
    '$' +
    (cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}
