// Safe parser: returns 0 for empty/invalid values
export const toNumber = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const s = typeof v === "string" ? v.trim() : String(v);
  if (s === "") return 0;
  const n = parseFloat(s.replace(",", "."));
  return isFinite(n) ? n : 0;
};

const roundTo = (n: number, decimals = 4): number => {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
};

/**
 * calculateShellArea
 * Formula: Shell Area = π × (Insulated Diameter + 2 × Thickness(mm) / 1000) × Height/Length
 *
 * @param insulatedDiameter - diameter value (assumed meters). If you store it in mm, convert before calling or adapt.
 * @param heightLength - height/length (same units as insulatedDiameter, e.g. meters)
 * @param thicknessMm - thickness in millimetres (mm)
 * @returns shell area (same area units as diameter*height, e.g. m²)
 */
export function calculateShellArea(
  insulatedDiameter: string | number | undefined,
  heightLength: string | number | undefined,
  thicknessMm: string | number | undefined
): number {
  const d = toNumber(insulatedDiameter); // e.g. meters
  const h = toNumber(heightLength);
  const t = toNumber(thicknessMm) / 1000; // mm -> meters
  if (d <= 0 || h <= 0) return 0;
  const effD = d + 2 * t;
  const area = Math.PI * effD * h;
  return roundTo(area, 4);
}

/**
 * calculateDishArea
 * Formula: Dish Area = π/4 × (Insulated Diameter + 2 × Thickness(mm) / 1000)^2 × Factor × No. of Dish Ends
 *
 * @param insulatedDiameter - diameter (meters)
 * @param thicknessMm - thickness in mm
 * @param dishFactor - factor for dish end (e.g. 1.27)
 * @param dishEndNos - number of dish ends (integer)
 * @returns dish area total (e.g. m²)
 */
export function calculateDishArea(
  insulatedDiameter: string | number | undefined,
  thicknessMm: string | number | undefined,
  dishFactor: string | number | undefined,
  dishEndNos: string | number | undefined
): number {
  const d = toNumber(insulatedDiameter);
  const t = toNumber(thicknessMm) / 1000;
  const factor = toNumber(dishFactor) || 1;
  const ends = toNumber(dishEndNos);
  if (d <= 0 || ends <= 0) return 0;
  const effD = d + 2 * t;
  const oneDish = (Math.PI / 4) * effD * effD * factor;
  const total = oneDish * ends;
  return roundTo(total, 4);
}

/**
 * calculateTotalArea
 * Formula: Total Area = Shell Area + Dish Area + Other Area
 *
 * @param shellArea - numeric shell area (or parseable)
 * @param dishArea - numeric dish area (or parseable)
 * @param otherArea - other area input (string/number)
 * @returns sum (rounded)
 */
export function calculateTotalArea(
  shellArea: string | number | undefined,
  dishArea: string | number | undefined,
  otherArea: string | number | undefined
): number {
  const s = toNumber(shellArea);
  const d = toNumber(dishArea);
  const o = toNumber(otherArea);
  const total = s + d + o;
  return roundTo(total, 4);
}
