export const MAX_MACHINE_TRAYS = 128;

export type MachineInput = {
  name: string;
  trayCount: string;
  model?: string;
  notes?: string;
};

export type ValidMachine = {
  name: string;
  trayCount: number;
  model: string | null;
  notes: string | null;
};

export class MachineValidationError extends Error {
  constructor(public readonly field: keyof MachineInput, message: string) {
    super(message);
  }
}

export class MachineConflictError extends Error {
  constructor(message = "La máquina cambió. Recargá la página antes de intentarlo de nuevo.") {
    super(message);
  }
}

export function validateMachine(input: MachineInput): ValidMachine {
  const name = input.name.trim();
  if (!name || name.length > 100) {
    throw new MachineValidationError("name", "Ingresá un nombre de hasta 100 caracteres.");
  }

  if (!/^[1-9]\d*$/.test(input.trayCount)) {
    throw new MachineValidationError("trayCount", `Ingresá entre 1 y ${MAX_MACHINE_TRAYS} bandejas.`);
  }
  const trayCount = Number(input.trayCount);
  if (!Number.isSafeInteger(trayCount) || trayCount > MAX_MACHINE_TRAYS) {
    throw new MachineValidationError("trayCount", `Ingresá entre 1 y ${MAX_MACHINE_TRAYS} bandejas.`);
  }

  const model = input.model?.trim() || null;
  if (model && model.length > 100) {
    throw new MachineValidationError("model", "Máximo 100 caracteres.");
  }
  const notes = input.notes?.trim() || null;
  if (notes && notes.length > 2000) {
    throw new MachineValidationError("notes", "Máximo 2000 caracteres.");
  }

  return { name, trayCount, model, notes };
}
