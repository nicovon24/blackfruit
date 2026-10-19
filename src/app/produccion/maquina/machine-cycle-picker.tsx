"use client";
import { formatBusinessDate } from "@/lib/business-date";

import { useRouter } from "next/navigation";

export function MachineCyclePicker({ cycles, back }: { cycles: Array<{ id: string; code: string; status: string; finishedOn: string | null }>; back: string }) {
  const router = useRouter();
  return <label className="space-y-1 text-sm">Ciclos recientes<select defaultValue="" onChange={(event) => { if (event.target.value) router.push(`/produccion/${event.target.value}?${new URLSearchParams({ back })}`); }} className="block h-11 max-w-full min-w-52 rounded-lg border border-input bg-background px-3"><option value="">Elegir ciclo</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.code} · {cycle.status === "finished" ? "Finalizado" : "Borrador"}{cycle.finishedOn ? ` · ${formatBusinessDate(cycle.finishedOn)}` : ""}</option>)}</select></label>;
}
