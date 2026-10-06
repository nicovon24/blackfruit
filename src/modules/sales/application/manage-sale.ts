import { validateAmountSale, type AmountSaleInput, type ValidAmountSale } from "../domain/amount-sale";

export class SaleConflictError extends Error {
  constructor() {
    super("La venta cambió desde que abriste esta página. Recargá e intentá de nuevo.");
  }
}

export interface SaleMutator {
  updateDetails(id: string, version: number, data: ValidAmountSale, actorId: string): Promise<void>;
  updateAmount(id: string, version: number, data: ValidAmountSale, actorId: string): Promise<void>;
  void(id: string, version: number, actorId: string): Promise<void>;
  moveToTrash(id: string, version: number, actorId: string): Promise<void>;
  restore(id: string, version: number, actorId: string): Promise<void>;
  permanentlyDelete(id: string, version: number, actorId: string): Promise<void>;
}

function validVersion(version: number) {
  if (!Number.isSafeInteger(version) || version < 1) throw new SaleConflictError();
}

export async function updateAmountSale(
  id: string,
  version: number,
  input: AmountSaleInput,
  actorId: string,
  mutator: SaleMutator,
) {
  validVersion(version);
  return mutator.updateAmount(id, version, validateAmountSale(input), actorId);
}

export async function voidSale(id: string, version: number, actorId: string, mutator: SaleMutator) {
  validVersion(version);
  return mutator.void(id, version, actorId);
}

export async function updateSaleDetails(id: string, version: number, input: AmountSaleInput, actorId: string, mutator: SaleMutator) {
  validVersion(version);
  return mutator.updateDetails(id, version, validateAmountSale(input), actorId);
}

export async function moveSaleToTrash(id: string, version: number, actorId: string, mutator: SaleMutator) {
  validVersion(version);
  return mutator.moveToTrash(id, version, actorId);
}

export async function restoreSale(id: string, version: number, actorId: string, mutator: SaleMutator) {
  validVersion(version);
  return mutator.restore(id, version, actorId);
}

export async function permanentlyDeleteSale(id: string, version: number, actorId: string, mutator: SaleMutator) {
  validVersion(version);
  return mutator.permanentlyDelete(id, version, actorId);
}
