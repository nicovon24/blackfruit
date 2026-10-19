import type { CycleTrayInput } from "./cycle";

export type TrayReconfiguration = {
  trays: CycleTrayInput[];
  weights: Record<string, string>;
  affected: Array<{ positions: number[]; kg: string }>;
  changed: boolean;
};

type Change =
  | { kind: "product"; position: number; productId: string | null }
  | { kind: "group"; positions: number[] }
  | { kind: "separate"; positions: number[] };

/** A weighed result belongs to its exact set of trays. Changing that set makes its kg pending. */
export function reconfigureTrays(
  trays: CycleTrayInput[],
  weights: Record<string, string>,
  change: Change,
  newKey: () => string,
): TrayReconfiguration {
  const selected = new Set(change.kind === "product" ? [change.position] : change.positions);
  const members = new Map<string, number[]>();
  for (const tray of trays) if (tray.resultKey) members.set(tray.resultKey, [...(members.get(tray.resultKey) ?? []), tray.position]);

  if (change.kind === "product") {
    const current = trays.find((tray) => tray.position === change.position);
    if (!current || current.productId === change.productId) return { trays, weights, affected: [], changed: false };
  } else if (change.kind === "group") {
    const chosen = trays.filter((tray) => selected.has(tray.position));
    if (chosen.length < 2 || !chosen[0].productId || chosen.some((tray) => tray.productId !== chosen[0].productId)) {
      return { trays, weights, affected: [], changed: false };
    }
    if (chosen.every((tray) => tray.resultKey === chosen[0].resultKey)) return { trays, weights, affected: [], changed: false };
  } else if (!trays.some((tray) => selected.has(tray.position) && tray.resultKey && (members.get(tray.resultKey)?.length ?? 0) > 1)) {
    return { trays, weights, affected: [], changed: false };
  }

  const groupKey = change.kind === "group" ? `group-${newKey()}` : null;
  const nextTrays = trays.map((tray) => {
    if (!selected.has(tray.position)) return tray;
    if (change.kind === "product") return { ...tray, productId: change.productId, resultKey: change.productId ? `tray-${tray.position}-${newKey()}` : null };
    if (change.kind === "group") return { ...tray, resultKey: groupKey };
    if (!tray.resultKey || (members.get(tray.resultKey)?.length ?? 0) < 2) return tray;
    return { ...tray, resultKey: `tray-${tray.position}-${newKey()}` };
  });

  const nextMembers = new Map<string, number[]>();
  for (const tray of nextTrays) if (tray.resultKey) nextMembers.set(tray.resultKey, [...(nextMembers.get(tray.resultKey) ?? []), tray.position]);
  const nextWeights: Record<string, string> = {};
  const affected: TrayReconfiguration["affected"] = [];
  for (const [key, positions] of members) {
    const stillSame = JSON.stringify(positions) === JSON.stringify(nextMembers.get(key) ?? []);
    if (stillSame) nextWeights[key] = weights[key] ?? "";
    else if (weights[key]?.trim()) affected.push({ positions, kg: weights[key] });
    if (!stillSame && nextMembers.has(key)) nextWeights[key] = "";
  }
  for (const key of nextMembers.keys()) if (!(key in nextWeights)) nextWeights[key] = "";
  return { trays: nextTrays, weights: nextWeights, affected, changed: true };
}
