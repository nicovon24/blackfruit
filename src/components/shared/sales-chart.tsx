import { ChartNoAxesCombined } from "lucide-react";
import { formatArs } from "@/lib/format-money";

export function SalesChart({ daily, labels, cadence = "día" }: { daily: { day: number; total: string }[]; labels?: string[]; cadence?: "día" | "mes" }) {
  const maximum = Math.max(...daily.map((entry) => Number(entry.total)));
  if (!daily.length || maximum <= 0) return <div className="empty-state"><ChartNoAxesCombined size={30} strokeWidth={1.3} aria-hidden="true" /><h3>Sin ventas en este período</h3><p>La evolución aparecerá cuando registres ventas confirmadas.</p></div>;
  const x = (index: number) => daily.length === 1 ? 337.5 : 55 + index * 565 / (daily.length - 1);
  const points = daily.map((entry, index) => `${x(index)},${210 - Number(entry.total) / maximum * 175}`).join(" ");
  return <div className="px-5 pb-5"><svg viewBox="0 0 650 250" className="w-full" role="img" aria-label={`Importe de ventas confirmadas por ${cadence}. Detalle disponible debajo del gráfico.`}>
    {[0, 1, 2, 3].map((tick) => <g key={tick}><line x1="55" x2="620" y1={35 + tick * 175 / 3} y2={35 + tick * 175 / 3} stroke="var(--border)" strokeDasharray="3 5" /><text x="46" y={39 + tick * 175 / 3} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">{new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 }).format(maximum * (1 - tick / 3))}</text></g>)}
    {daily.length > 1 ? <><polygon points={`55,210 ${points} 620,210`} fill="var(--chart-1)" fillOpacity=".09" /><polyline points={points} fill="none" stroke="var(--chart-1)" strokeWidth="2.5" strokeLinejoin="round" /></> : <circle cx={x(0)} cy="35" r="5" fill="var(--chart-1)" />}
    {[...new Set([0, Math.floor((daily.length - 1) / 4), Math.floor((daily.length - 1) / 2), Math.floor((daily.length - 1) * 3 / 4), daily.length - 1])].map((index) => <text key={index} x={x(index)} y="237" textAnchor="middle" fill="var(--muted-foreground)" fontSize="11">{labels?.[index] ?? daily[index].day}</text>)}
  </svg><p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><span className="h-0.5 w-4 bg-primary" />Ventas registradas · ARS por {cadence}</p><details className="mt-4 text-xs text-muted-foreground"><summary className="cursor-pointer py-2">Ver importes por {cadence}</summary><ul className="mt-2 grid grid-cols-2 gap-2">{daily.filter((entry) => Number(entry.total) > 0).map((entry) => <li key={entry.day}>{labels?.[entry.day - 1] ?? `Día ${entry.day}`}: {formatArs(entry.total)}</li>)}</ul></details></div>;
}
