import {
  validateAmountSale,
  type AmountSaleInput,
  type ValidAmountSale,
} from "../domain/amount-sale";

export type CreatedSale = { id: string; total: string };

export interface AmountSaleWriter {
  create(data: ValidAmountSale, actorId: string, requestKey: string): Promise<CreatedSale>;
}

export async function createAmountSale(
  input: AmountSaleInput,
  actorId: string,
  requestKey: string,
  writer: AmountSaleWriter,
): Promise<CreatedSale> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestKey)) {
    throw new Error("La clave de envío no es válida.");
  }

  return writer.create(validateAmountSale(input), actorId, requestKey);
}
