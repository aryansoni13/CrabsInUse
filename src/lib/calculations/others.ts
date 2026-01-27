/**
 * Calculations for Others department
 */
export const calculateOthersWeight = (
  length: number,
  width: number,
  thickness: number,
  qty: number,
  unit: number
): number => {
  return (
    Number(length || 0) *
    Number(width || 1) *
    Number(thickness || 1) *
    Number(qty || 0) *
    Number(unit || 1)
  );
};
