export function formatArs(value: string): string {
  const [whole, fraction = "00"] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$ ${grouped},${fraction.padEnd(2, "0")}`;
}
