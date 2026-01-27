import { useMemo } from "react";

interface Row {
  [key: string]: any;
  customFields?: Record<string, string | number | null>;
}

export function useColumnSuggestions<T extends Row>(rows: T[], columnId: string, isCustomField: boolean = false) {
  return useMemo(() => {
    const values: string[] = [];
    const seen = new Set<string>();

    rows.forEach((row) => {
      let value: string | undefined;
      
      if (isCustomField) {
        value = String(row.customFields?.[columnId] ?? "");
      } else {
        value = String(row[columnId] ?? "");
      }

      if (value && value.trim() && !seen.has(value.toLowerCase())) {
        seen.add(value.toLowerCase());
        values.push(value);
      }
    });

    return values;
  }, [rows, columnId, isCustomField]);
}

export function useMultiColumnSuggestions<T extends Row>(
  rows: T[],
  columnConfigs: Array<{ columnId: string; isCustomField?: boolean }>
): Record<string, string[]> {
  return useMemo(() => {
    const suggestions: Record<string, string[]> = {};

    columnConfigs.forEach(({ columnId, isCustomField }) => {
      const values: string[] = [];
      const seen = new Set<string>();

      rows.forEach((row) => {
        let value: string | undefined;
        
        if (isCustomField) {
          value = String(row.customFields?.[columnId] ?? "");
        } else {
          value = String(row[columnId] ?? "");
        }

        if (value && value.trim() && !seen.has(value.toLowerCase())) {
          seen.add(value.toLowerCase());
          values.push(value);
        }
      });

      suggestions[columnId] = values;
    });

    return suggestions;
  }, [rows, columnConfigs]);
}
