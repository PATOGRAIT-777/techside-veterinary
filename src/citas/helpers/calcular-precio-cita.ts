export type PrecioInput =
  | number
  | string
  | { toNumber: () => number }
  | null
  | undefined;

function toNumber(value: PrecioInput): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return value.toNumber();
}

export function calcularPrecioCita(
  servicioPrecioBase: PrecioInput,
  especialidadPrecio: PrecioInput,
): number {
  return toNumber(servicioPrecioBase) + toNumber(especialidadPrecio);
}
