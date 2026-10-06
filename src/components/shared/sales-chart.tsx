import { ChartNoAxesCombined } from "lucide-react";
import { formatArs } from "@/lib/format-money";

export function SalesChart({ daily }: { daily: { day: number; total: string }[] }) {
  const maximum = Math.max(...daily.map((entry) => Number(entry.total)));
  if (maximum === 0) return <div className="empty-state min-h-[280px]"><ChartNoAxesCombined size={30} strokeWidth={1.3} aria-hidden="true" /><h3>Un mes por construir</h3><p>La evolución aparecerá cuando registres ventas en este período.</p></div>;
  const points = daily.map((entry, index) => `${55 + index * 565 / Math.max(1, daily.length - 1)},${210 - Number(entry.total) / maximum * 175}`).join(" ");
  return <div className="px-5 pb-5"><svg viewBox="0 0 650 250" className="w-full" role="img" aria-label="Importe diario de ventas confirmadas. Detalle disponible debajo del gráfico.">
    {[0, 1, 2, 3].map((tick) => <g key={tick}><line x1="55" x2="620" y1={35 + tick * 175 / 3} y2={35 + tick * 175 / 3} stroke="#e7dfd0" strokeDasharray="3 5" /><text x="46" y={39 + tick * 175 / 3} textAnchor="end" fontSize="10" fill="#746b5e">{new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 }).format(maximum * (1 - tick / 3))}</text></g>)}
    <polygon points={`55,210 ${points} 620,210`} fill="#e77918" fillOpacity=".09" /><polyline points={points} fill="none" stroke="#a94410" strokeWidth="2.5" strokeLinejoin="round" />
    {[1, 8, 15, 22, daily.length].map((day) => <text key={day} x={55 + (day - 1) * 565 / Math.max(1, daily.length - 1)} y="237" textAnchor="middle" fill="#746b5e" fontSize="11">{day}</text>)}
  </svg><p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><span className="h-0.5 w-4 bg-primary" />Ventas registradas · ARS por día</p><details className="mt-4 text-xs text-muted-foreground"><summary className="cursor-pointer py-2">Ver importes por día</summary><ul className="mt-2 grid grid-cols-2 gap-2">{daily.filter((entry) => Number(entry.total) > 0).map((entry) => <li key={entry.day}>Día {entry.day}: {formatArs(entry.total)}</li>)}</ul></details></div>;
}
