/** Round display values to hundredths without changing stored thousandths. */
export function formatDashboardKg(value: string): string {
  const match = /^([+-]?)(\d+)\.(\d{3})$/.exec(value);
  if (!match) return value;
  const [, sign, whole, fraction] = match;
  const thousandths = BigInt(whole) * BigInt(1000) + BigInt(fraction);
  const hundredths = (thousandths + BigInt(5)) / BigInt(10);
  const integer = (hundredths / BigInt(100)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimals = (hundredths % BigInt(100)).toString().padStart(2, "0").replace(/0+$/, "");
  return `${hundredths === BigInt(0) ? "" : sign}${integer}${decimals ? `,${decimals}` : ""}`;
}
