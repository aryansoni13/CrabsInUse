import { useCallback, useEffect } from "react";

interface KeyboardNavigationConfig {
  onAddRow: () => void;
  totalRows: number;
  isAddingRows: boolean;
  tempRowsCount: number;
  tableRef: React.RefObject<HTMLTableElement>;
}

export function useRowKeyboardNavigation(config: KeyboardNavigationConfig) {
  const { onAddRow, tableRef } = config;

  const isLastRow = useCallback((input: HTMLInputElement): boolean => {
    const row = input.closest("tr");
    if (!row) return false;
    const tbody = row.closest("tbody");
    if (!tbody) return false;
    const allRows = Array.from(tbody.querySelectorAll("tr"));
    return allRows.indexOf(row) === allRows.length - 1;
  }, []);

  const isFirstRow = useCallback((input: HTMLInputElement): boolean => {
    const row = input.closest("tr");
    if (!row) return false;
    const tbody = row.closest("tbody");
    if (!tbody) return false;
    const allRows = Array.from(tbody.querySelectorAll("tr"));
    return allRows.indexOf(row) === 0;
  }, []);

  const isLastColumn = useCallback((input: HTMLInputElement): boolean => {
    const cell = input.closest("td");
    if (!cell) return false;
    const row = cell.closest("tr");
    if (!row) return false;
    const allCells = Array.from(row.querySelectorAll("td"));
    const inputCells = allCells.filter(td => td.querySelector("input:not([disabled])"));
    const cellIndex = inputCells.indexOf(cell as HTMLTableCellElement);
    return cellIndex === inputCells.length - 1;
  }, []);

  const isFirstColumn = useCallback((input: HTMLInputElement): boolean => {
    const cell = input.closest("td");
    if (!cell) return false;
    const row = cell.closest("tr");
    if (!row) return false;
    const allCells = Array.from(row.querySelectorAll("td"));
    const inputCells = allCells.filter(td => td.querySelector("input:not([disabled])"));
    const cellIndex = inputCells.indexOf(cell as HTMLTableCellElement);
    return cellIndex === 0;
  }, []);

  const focusNextRowSameColumn = useCallback((currentInput: HTMLInputElement) => {
    const currentCell = currentInput.closest("td");
    const currentRow = currentCell?.closest("tr");
    const nextRow = currentRow?.nextElementSibling as HTMLTableRowElement | null;
    
    if (nextRow) {
      const cellIndex = Array.from(currentRow!.children).indexOf(currentCell!);
      const nextCells = nextRow.querySelectorAll("td");
      if (nextCells[cellIndex]) {
        const nextInput = nextCells[cellIndex].querySelector("input:not([disabled])") as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  }, []);

  const focusPrevRowSameColumn = useCallback((currentInput: HTMLInputElement) => {
    const currentCell = currentInput.closest("td");
    const currentRow = currentCell?.closest("tr");
    const prevRow = currentRow?.previousElementSibling as HTMLTableRowElement | null;
    
    if (prevRow) {
      const cellIndex = Array.from(currentRow!.children).indexOf(currentCell!);
      const prevCells = prevRow.querySelectorAll("td");
      if (prevCells[cellIndex]) {
        const prevInput = prevCells[cellIndex].querySelector("input:not([disabled])") as HTMLInputElement;
        if (prevInput) {
          prevInput.focus();
          prevInput.select();
        }
      }
    }
  }, []);

  const focusNextColumn = useCallback((currentInput: HTMLInputElement) => {
    const currentCell = currentInput.closest("td");
    const currentRow = currentCell?.closest("tr");
    if (!currentCell || !currentRow) return;
    
    const allCells = Array.from(currentRow.querySelectorAll("td"));
    const inputCells = allCells.filter(td => td.querySelector("input:not([disabled])"));
    const currentIndex = inputCells.indexOf(currentCell as HTMLTableCellElement);
    
    if (currentIndex < inputCells.length - 1) {
      const nextInput = inputCells[currentIndex + 1].querySelector("input:not([disabled])") as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  }, []);

  const focusPrevColumn = useCallback((currentInput: HTMLInputElement) => {
    const currentCell = currentInput.closest("td");
    const currentRow = currentCell?.closest("tr");
    if (!currentCell || !currentRow) return;
    
    const allCells = Array.from(currentRow.querySelectorAll("td"));
    const inputCells = allCells.filter(td => td.querySelector("input:not([disabled])"));
    const currentIndex = inputCells.indexOf(currentCell as HTMLTableCellElement);
    
    if (currentIndex > 0) {
      const prevInput = inputCells[currentIndex - 1].querySelector("input:not([disabled])") as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }
  }, []);

  const focusFirstInputInLastRow = useCallback(() => {
    setTimeout(() => {
      if (!tableRef.current) return;
      const tbody = tableRef.current.querySelector("tbody");
      if (!tbody) return;
      const rows = tbody.querySelectorAll("tr");
      const lastRow = rows[rows.length - 1];
      if (lastRow) {
        const firstInput = lastRow.querySelector("input:not([disabled])") as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
          firstInput.select();
        }
      }
    }, 150);
  }, [tableRef]);

  const focusSameColumnInLastRow = useCallback((currentInput: HTMLInputElement) => {
    setTimeout(() => {
      if (!tableRef.current) return;
      const tbody = tableRef.current.querySelector("tbody");
      if (!tbody) return;
      const currentCell = currentInput.closest("td");
      const currentRow = currentInput.closest("tr");
      if (!currentCell || !currentRow) return;
      
      const cellIndex = Array.from(currentRow.children).indexOf(currentCell);
      const rows = tbody.querySelectorAll("tr");
      const lastRow = rows[rows.length - 1];
      if (lastRow) {
        const cells = lastRow.querySelectorAll("td");
        if (cells[cellIndex]) {
          const input = cells[cellIndex].querySelector("input:not([disabled])") as HTMLInputElement;
          if (input) {
            input.focus();
            input.select();
          }
        }
      }
    }, 150);
  }, [tableRef]);

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "INPUT") return;
      const input = target as HTMLInputElement;
      
      const lastRow = isLastRow(input);
      const firstRow = isFirstRow(input);
      const lastCol = isLastColumn(input);
      const firstCol = isFirstColumn(input);

      // ArrowDown navigation
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (lastRow) {
          // On last row, add new row
          onAddRow();
          focusSameColumnInLastRow(input);
        } else {
          focusNextRowSameColumn(input);
        }
        return;
      }

      // ArrowUp navigation
      if (e.key === "ArrowUp") {
        if (!firstRow) {
          e.preventDefault();
          focusPrevRowSameColumn(input);
        }
        return;
      }

      // ArrowRight navigation (at end of input text)
      if (e.key === "ArrowRight" && input.selectionStart === input.value.length) {
        if (!lastCol) {
          e.preventDefault();
          focusNextColumn(input);
        }
        return;
      }

      // ArrowLeft navigation (at start of input text)
      if (e.key === "ArrowLeft" && input.selectionStart === 0) {
        if (!firstCol) {
          e.preventDefault();
          focusPrevColumn(input);
        }
        return;
      }

      // Tab on last row, last column -> add new row  
      if (e.key === "Tab" && !e.shiftKey && lastRow && lastCol) {
        e.preventDefault();
        onAddRow();
        focusFirstInputInLastRow();
        return;
      }

      // Enter -> move to next row same column, or add new row if on last row
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (lastRow) {
          onAddRow();
          focusSameColumnInLastRow(input);
        } else {
          focusNextRowSameColumn(input);
        }
        return;
      }
    };

    table.addEventListener("keydown", handleKeyDown);
    return () => table.removeEventListener("keydown", handleKeyDown);
  }, [tableRef, onAddRow, isLastRow, isFirstRow, isLastColumn, isFirstColumn, focusNextRowSameColumn, focusPrevRowSameColumn, focusNextColumn, focusPrevColumn, focusFirstInputInLastRow, focusSameColumnInLastRow]);

  return {};
}
