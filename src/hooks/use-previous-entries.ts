import { useState, useEffect, useCallback, useMemo } from "react";
import { MeasurementRow } from "@/types";

interface PreviousEntriesConfig {
  measurementRows: MeasurementRow[];
  department: string;
  itemId: string;
}

interface FieldSuggestions {
  [fieldKey: string]: string[];
}

const MAX_SUGGESTIONS = 10;

export function usePreviousEntries(config: PreviousEntriesConfig) {
  const { measurementRows, department, itemId } = config;

  // Get unique values for each field from previous entries
  const getSuggestionsForField = useCallback(
    (fieldKey: string): string[] => {
      const values = new Set<string>();

      measurementRows.forEach((row) => {
        let value: string | undefined;

        // Handle main fields
        if (fieldKey === "type") value = row.type;
        else if (fieldKey === "mark") value = row.mark;
        else if (fieldKey === "area") value = row.area || undefined;
        // Handle custom fields
        else if (row.customFields && row.customFields[fieldKey] !== undefined) {
          value = String(row.customFields[fieldKey]);
        }

        if (value && value.trim()) {
          values.add(value.trim());
        }
      });

      // Sort by most recent (rows are usually in order)
      return Array.from(values).slice(-MAX_SUGGESTIONS).reverse();
    },
    [measurementRows]
  );

  // Get the last entered values for autofill
  const getLastEntryValues = useCallback((): Partial<MeasurementRow> | null => {
    if (measurementRows.length === 0) return null;

    const lastRow = measurementRows[measurementRows.length - 1];
    return {
      area: lastRow.area,
      customFields: { ...lastRow.customFields },
    };
  }, [measurementRows]);

  // Get suggestions for all common fields based on department
  const allSuggestions = useMemo((): FieldSuggestions => {
    const suggestions: FieldSuggestions = {
      type: getSuggestionsForField("type"),
      mark: getSuggestionsForField("mark"),
      area: getSuggestionsForField("area"),
    };

    // Department-specific fields
    if (department === "Piping-LHS") {
      suggestions["docNo"] = getSuggestionsForField("docNo");
      suggestions["lineNo"] = getSuggestionsForField("lineNo");
      suggestions["moc"] = getSuggestionsForField("moc");
      suggestions["spoolNo"] = getSuggestionsForField("spoolNo");
    } else if (department === "Equipment Insulation") {
      suggestions["equipmentNo"] = getSuggestionsForField("equipmentNo");
      suggestions["equipmentName"] = getSuggestionsForField("equipmentName");
      suggestions["portion"] = getSuggestionsForField("portion");
      suggestions["position"] = getSuggestionsForField("position");
    } else if (department === "Piping Insulation") {
      suggestions["location"] = getSuggestionsForField("location");
      suggestions["drawingNo"] = getSuggestionsForField("drawingNo");
      suggestions["moc"] = getSuggestionsForField("moc");
    } else if (department === "Piping-Spool Status") {
      suggestions["drawingNo"] = getSuggestionsForField("drawingNo");
      suggestions["spoolNo"] = getSuggestionsForField("spoolNo");
      suggestions["baseMaterial"] = getSuggestionsForField("baseMaterial");
      suggestions["paintSystem"] = getSuggestionsForField("paintSystem");
    } else if (department === "Structure") {
      suggestions["structureType"] = getSuggestionsForField("structureType");
      suggestions["mark"] = getSuggestionsForField("mark");
    }

    return suggestions;
  }, [department, getSuggestionsForField]);

  return {
    getSuggestionsForField,
    getLastEntryValues,
    allSuggestions,
  };
}
