/**
 * Calculations for Piping-Spool Status department
 */

export const calculateSpoolInchMeter = (
  length: number,
  lineSize: number
): string => {
  return (length * lineSize).toFixed(3);
};

export const calculateSpoolTotalQty = (inchMeter: number): number => {
  // For Piping-Spool Status, use InchMeter as the quantity for billing
  return inchMeter;
};
