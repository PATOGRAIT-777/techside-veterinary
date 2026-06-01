export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 11) {
    throw new Error('El teléfono debe contener exactamente 11 dígitos');
  }
  return digits;
}
