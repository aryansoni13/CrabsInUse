/**
 * Calculations for Piping Insulation department
 */

export const IS_FACTOR_TABLE: Record<
  string,
  {
    elbow90: number;
    elbow45: number;
    tee: number;
    reducer: number;
    endCap: number;
    flangeRem: number;
    valveRem: number;
    flangeFix: number;
    valveFix: number;
    weldValveFix: number;
  }
> = {
  "15": {
    elbow90: 0.5,
    elbow45: 0.35,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 1.8,
    valveRem: 2.5,
    flangeFix: 1.08,
    valveFix: 1.5,
    weldValveFix: 0.2,
  },
  "20": {
    elbow90: 0.5,
    elbow45: 0.35,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 1.8,
    valveRem: 2.5,
    flangeFix: 1.08,
    valveFix: 1.5,
    weldValveFix: 0.2,
  },
  "25": {
    elbow90: 0.5,
    elbow45: 0.35,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 1.8,
    valveRem: 2.5,
    flangeFix: 1.08,
    valveFix: 1.5,
    weldValveFix: 0.2,
  },
  "32": {
    elbow90: 0.5,
    elbow45: 0.35,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 1.8,
    valveRem: 2.5,
    flangeFix: 1.08,
    valveFix: 1.5,
    weldValveFix: 0.2,
  },
  "40": {
    elbow90: 0.5,
    elbow45: 0.35,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 1.8,
    valveRem: 2.5,
    flangeFix: 1.08,
    valveFix: 1.5,
    weldValveFix: 0.2,
  },
  "50": {
    elbow90: 0.6,
    elbow45: 0.4,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 1.9,
    valveRem: 3,
    flangeFix: 1.14,
    valveFix: 1.8,
    weldValveFix: 0.6,
  },
  "65": {
    elbow90: 0.6,
    elbow45: 0.4,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 1.9,
    valveRem: 3,
    flangeFix: 1.14,
    valveFix: 1.8,
    weldValveFix: 0.6,
  },
  "80": {
    elbow90: 0.6,
    elbow45: 0.4,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 1.9,
    valveRem: 3,
    flangeFix: 1.14,
    valveFix: 1.8,
    weldValveFix: 0.6,
  },
  "100": {
    elbow90: 1,
    elbow45: 0.65,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 2,
    valveRem: 3.5,
    flangeFix: 1.32,
    valveFix: 2.1,
    weldValveFix: 0.6,
  },
  "125": {
    elbow90: 1,
    elbow45: 0.65,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 2,
    valveRem: 3.5,
    flangeFix: 1.32,
    valveFix: 2.1,
    weldValveFix: 0.6,
  },
  "150": {
    elbow90: 1,
    elbow45: 0.65,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 2,
    valveRem: 3.5,
    flangeFix: 1.32,
    valveFix: 2.1,
    weldValveFix: 0.6,
  },
  "200": {
    elbow90: 1.4,
    elbow45: 0.85,
    tee: 0.75,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 2.5,
    valveRem: 4,
    flangeFix: 1.5,
    valveFix: 2.4,
    weldValveFix: 0.6,
  },
  "250": {
    elbow90: 1.4,
    elbow45: 0.85,
    tee: 0.75,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 2.5,
    valveRem: 4,
    flangeFix: 1.5,
    valveFix: 2.4,
    weldValveFix: 0.6,
  },
  "300": {
    elbow90: 1.4,
    elbow45: 0.85,
    tee: 0.75,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 2.5,
    valveRem: 4,
    flangeFix: 1.5,
    valveFix: 2.4,
    weldValveFix: 0.6,
  },
  "350": {
    elbow90: 1.4,
    elbow45: 0.85,
    tee: 0.75,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 2.5,
    valveRem: 4,
    flangeFix: 1.5,
    valveFix: 2.4,
    weldValveFix: 0.6,
  },
  "400": {
    elbow90: 1.5,
    elbow45: 0.9,
    tee: 0.85,
    reducer: 0.3,
    endCap: 0.2,
    flangeRem: 2.7,
    valveRem: 4.5,
    flangeFix: 1.62,
    valveFix: 2.7,
    weldValveFix: 0.6,
  },
  "450": {
    elbow90: 1.5,
    elbow45: 0.9,
    tee: 0.85,
    reducer: 0.3,
    endCap: 0.2,
    flangeRem: 2.7,
    valveRem: 4.5,
    flangeFix: 1.62,
    valveFix: 2.7,
    weldValveFix: 0.6,
  },
  "500": {
    elbow90: 1.5,
    elbow45: 0.9,
    tee: 0.85,
    reducer: 0.3,
    endCap: 0.2,
    flangeRem: 2.7,
    valveRem: 4.5,
    flangeFix: 1.62,
    valveFix: 2.7,
    weldValveFix: 0.6,
  },
  "600": {
    elbow90: 1.7,
    elbow45: 1.05,
    tee: 1.1,
    reducer: 0.45,
    endCap: 0.2,
    flangeRem: 3,
    valveRem: 6,
    flangeFix: 1.8,
    valveFix: 3,
    weldValveFix: 0.6,
  },
};

export const getISFactors = (lineSize: string) => {
  return IS_FACTOR_TABLE[lineSize] || IS_FACTOR_TABLE["50"];
};

export const calculatePipingInsulationValues = (
  customFields: Record<string, string | number | null>,
  length: number
) => {
  const lineSize = String(customFields["lineSize"] || "50");
  const factors = getISFactors(lineSize);

  const qtyElbow90 = Number(customFields["qtyElbow90"] || 0);
  const qtyElbow45 = Number(customFields["qtyElbow45"] || 0);
  const qtyTee = Number(customFields["qtyTee"] || 0);
  const qtyReducer = Number(customFields["qtyReducer"] || 0);
  const qtyEndCap = Number(customFields["qtyEndCap"] || 0);
  const qtyFlangeRem = Number(customFields["qtyFlangeRem"] || 0);
  const qtyValveRem = Number(customFields["qtyValveRem"] || 0);
  const qtyFlangeFix = Number(customFields["qtyFlangeFix"] || 0);
  const qtyValveFix = Number(customFields["qtyValveFix"] || 0);
  const qtyWeldValveFix = Number(customFields["qtyWeldValveFix"] || 0);

  const totalFittingsLength =
    qtyElbow90 * factors.elbow90 +
    qtyElbow45 * factors.elbow45 +
    qtyTee * factors.tee +
    qtyReducer * factors.reducer +
    qtyEndCap * factors.endCap +
    qtyFlangeRem * factors.flangeRem +
    qtyValveRem * factors.valveRem +
    qtyFlangeFix * factors.flangeFix +
    qtyValveFix * factors.valveFix +
    qtyWeldValveFix * factors.weldValveFix;

  const rmt = length + totalFittingsLength;

  const pipeOD = Number(customFields["pipeOD"] || 0);
  const insulationThickness = Number(customFields["insulationThickness"] || 0);
  const odInsulated = (pipeOD + 2 * insulationThickness) / 1000;

  const area = Math.PI * odInsulated * rmt;

  return {
    totalFittingsLength: parseFloat(totalFittingsLength.toFixed(2)),
    rmt: parseFloat(rmt.toFixed(2)),
    area: parseFloat(area.toFixed(3)),
  };
};

export const calculatePipingInsulationWeight = (
  length: number,
  width: number,
  thickness: number,
  qty: number,
  unit: number
): number => {
  // Basic calculation same as structure, but usually for insulation we use Area or RMT often
  // However, the current code in MeasurementSheet defaults to L*W*T*Q*U unless it's Piping-LHS
  return (
    Number(length || 0) *
    Number(width || 1) *
    Number(thickness || 1) *
    Number(qty || 0) *
    Number(unit || 1)
  );
};
