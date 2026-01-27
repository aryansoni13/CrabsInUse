/**
 * Calculations for Piping-LHS department
 */
export const calculatePipingLHSWeight = (width: number): number => {
  // For Piping-LHS, Total = Dia (which is stored in width)
  return Number(width) || 0;
};
