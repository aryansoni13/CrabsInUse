import * as XLSX from 'xlsx';
import { Project, Order, Item, MeasurementRow, RABill } from '@/types';

interface ExcelExportData {
  project: Project;
  order: Order;
  items: Item[];
  measurementRows: MeasurementRow[];
  raBill: RABill;
}

export function generateBillExcel(data: ExcelExportData): void {
  const { project, order, items, measurementRows, raBill } = data;
  
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // ==================== ABSTRACT SHEET ====================
  const abstractData: (string | number)[][] = [];
  
  // Header information
  abstractData.push(['Abstract Sheet - Running Account Bill']);
  abstractData.push([]);
  abstractData.push(['PROJECT', project.name, '', 'CLIENT', project.clientName]);
  abstractData.push(['ORDER NUMBER', order.orderNumber, '', 'RA NUMBER', raBill.raNumber]);
  abstractData.push(['GENERATED ON', new Date(raBill.createdAt).toLocaleString('en-IN')]);
  abstractData.push([]);
  
  // Table headers
  abstractData.push([
    'PO Sr No',
    'ITEM CODE',
    'Item Description',
    'Unit',
    'Quantity',
    'BILL BREAK UP AS PER LOI',
    'Break up %',
    'Unit Rate',
    'Previous Bill',
    'Previous Bill Amount',
    'This Bill',
    'This Bill Amount',
    'Cumm. Bill',
    'Cumm. Amount',
    'REMARKS'
  ]);
  
  let grandTotalPrevWeight = 0;
  let grandTotalPrevAmount = 0;
  let grandTotalThisWeight = 0;
  let grandTotalThisAmount = 0;
  let grandTotalCummWeight = 0;
  let grandTotalCummAmount = 0;

  // Process each item
  items.forEach((item, itemIndex) => {
    const breakups = item.billingBreakup || [];
    
    breakups.forEach((breakup, bIndex) => {
      const newKey = `${item.id}-${breakup.percentage}-${breakup.name}`;
      const legacyKey = `${breakup.percentage}%-${breakup.name}`;
      
      // Find locked data for this item and breakup
      const lockedEntries = raBill.lockedData.filter(
        (locked) =>
          locked.itemId === item.id &&
          (locked.breakupKey === newKey || locked.breakupKey === legacyKey)
      );
      
      const thisWeight = lockedEntries.reduce((sum, entry) => sum + entry.executedWeight, 0);
      const prevWeight = lockedEntries.reduce((sum, entry) => sum + (entry.previousWeight || 0), 0);
      const cummWeight = thisWeight + prevWeight;
      
      const thisAmount = (thisWeight * item.unitRate * breakup.percentage) / 100;
      const prevAmount = (prevWeight * item.unitRate * breakup.percentage) / 100;
      const cummAmount = thisAmount + prevAmount;
      
      grandTotalPrevWeight += prevWeight;
      grandTotalPrevAmount += prevAmount;
      grandTotalThisWeight += thisWeight;
      grandTotalThisAmount += thisAmount;
      grandTotalCummWeight += cummWeight;
      grandTotalCummAmount += cummAmount;
      
      abstractData.push([
        bIndex === 0 ? itemIndex + 1 : '',
        bIndex === 0 ? (item.itemCode || '-') : '',
        bIndex === 0 ? item.description : '',
        bIndex === 0 ? item.unitOfMeasurement : '',
        bIndex === 0 ? item.quantity : '',
        breakup.name,
        `${breakup.percentage}%`,
        bIndex === 0 ? item.unitRate : '',
        prevWeight.toFixed(3),
        prevAmount.toFixed(2),
        thisWeight.toFixed(3),
        thisAmount.toFixed(2),
        cummWeight.toFixed(3),
        cummAmount.toFixed(2),
        ''
      ]);
    });
  });
  
  // Total row
  abstractData.push([
    'TOTAL AMOUNT RS',
    '', '', '', '', '', '', '',
    grandTotalPrevWeight.toFixed(3),
    grandTotalPrevAmount.toFixed(2),
    grandTotalThisWeight.toFixed(3),
    grandTotalThisAmount.toFixed(2),
    grandTotalCummWeight.toFixed(3),
    grandTotalCummAmount.toFixed(2),
    ''
  ]);
  
  const abstractSheet = XLSX.utils.aoa_to_sheet(abstractData);
  
  // Set column widths
  abstractSheet['!cols'] = [
    { wch: 10 }, // PO Sr No
    { wch: 12 }, // ITEM CODE
    { wch: 30 }, // Item Description
    { wch: 8 },  // Unit
    { wch: 10 }, // Quantity
    { wch: 20 }, // BILL BREAK UP
    { wch: 10 }, // Break up %
    { wch: 12 }, // Unit Rate
    { wch: 12 }, // Previous Bill
    { wch: 15 }, // Previous Amount
    { wch: 12 }, // This Bill
    { wch: 15 }, // This Bill Amount
    { wch: 12 }, // Cumm. Bill
    { wch: 15 }, // Cumm. Amount
    { wch: 15 }, // REMARKS
  ];
  
  XLSX.utils.book_append_sheet(workbook, abstractSheet, 'Abstract Sheet');

  // ==================== MEASUREMENT SHEET ====================
  // Create measurement data for each item with department-specific columns
  items.forEach((item) => {
    const itemMeasurements = measurementRows.filter(row => row.itemId === item.id);
    
    if (itemMeasurements.length === 0) return;
    
    const measurementData: (string | number)[][] = [];
    
    // Header
    measurementData.push([`Item: ${item.itemCode || ''} - ${item.description}`]);
    measurementData.push([`Department: ${item.department} | Unit: ${item.unitOfMeasurement}`]);
    measurementData.push([]);
    
    // Get columns based on department
    const columns = getDepartmentColumns(item.department, item.billingBreakup);
    measurementData.push(columns);
    
    // Data rows
    itemMeasurements.forEach((row, index) => {
      const rowData = getMeasurementRowData(row, index, item.department, item.billingBreakup, raBill);
      measurementData.push(rowData);
    });
    
    // Create sheet
    const sheetName = `Measurements - ${(item.itemCode || item.description).substring(0, 20)}`;
    const measurementSheet = XLSX.utils.aoa_to_sheet(measurementData);
    
    // Set column widths
    measurementSheet['!cols'] = columns.map(() => ({ wch: 12 }));
    
    XLSX.utils.book_append_sheet(workbook, measurementSheet, sheetName);
  });

  // Generate filename and download
  const filename = `${raBill.raNumber}_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

function getDepartmentColumns(department: string, billingBreakup: { name: string; percentage: number }[]): string[] {
  const baseColumns: string[] = [];
  
  switch (department) {
    case 'Piping Insulation':
      baseColumns.push(
        'Sr.', 'Loc', 'Drg No.', 'Sht No.', 'MOC', 'Line Size', 'Pipe OD', 
        'Ins Thk', 'Ins Type', 'Temp', 'Pipe Len', '90°', '45°', 'Tee', 
        'Red', 'Cap', 'Flg Rem', 'Vlv Rem', 'Flg Fix', 'Vlv Fix', 'Weld', 
        'Fit Len', 'RMT', 'Area'
      );
      break;
    case 'Equipment Insulation':
      baseColumns.push(
        'Sr.', 'Equipment No', 'Equipment Name', 'Portion', 'Position', 
        'Temp', 'MOC', 'Ins Type', 'Thickness', 'Dia', 'Height/Length', 
        'Shell Area', 'Dish Factor', 'Dish Nos', 'Dish Area', 'Other Area', 'Total Area'
      );
      break;
    case 'Piping-LHS':
      baseColumns.push(
        'Sr.', 'Area', 'Doc No.', 'Line No.', 'Sheet No.', 'Rev', 'MOC', 
        'FJ/SJ', 'Joint No.', 'Spool No.', 'Dia', 'Thickness', 'Schedule', 
        'Joint Type', 'Part 1', 'Part 2', 'Total'
      );
      break;
    case 'Structure':
      baseColumns.push(
        'Sr.', 'Description', 'Type', 'Mark No.', 'Unit Weight', 
        'Length', 'Width', 'Thickness', 'Qty', 'Total'
      );
      break;
    case 'Piping-Spool Status':
      baseColumns.push(
        'Sr.', 'Area', 'Drawing No', 'RevNo', 'SheetNo', 'SpoolNo', 
        'Line Size', 'BaseMaterial', 'Length', 'InchMeter', 'SurfaceArea', 
        'PaintSystem', 'Remarks'
      );
      break;
    default:
      baseColumns.push(
        'Sr.', 'Description', 'Area', 'Length', 'Width', 'Height', 'Qty', 'Total'
      );
  }
  
  // Add breakup columns
  billingBreakup.forEach(b => {
    baseColumns.push(`${b.percentage}% ${b.name}`);
  });
  
  return baseColumns;
}

function getMeasurementRowData(
  row: MeasurementRow, 
  index: number, 
  department: string,
  billingBreakup: { id: string; name: string; percentage: number }[],
  raBill: RABill
): (string | number)[] {
  const data: (string | number)[] = [];
  const cf = row.customFields || {};
  
  switch (department) {
    case 'Piping Insulation':
      data.push(
        index + 1,
        cf['location'] || row.type || '',
        cf['drawingNo'] || row.mark || '',
        cf['sheetNo'] || '',
        cf['moc'] || '',
        cf['lineSize'] || '',
        cf['pipeOD'] || '',
        cf['insulationThickness'] || '',
        cf['insulationType'] || '',
        cf['temp'] || '',
        row.length || '',
        cf['qtyElbow90'] || '',
        cf['qtyElbow45'] || '',
        cf['qtyTee'] || '',
        cf['qtyReducer'] || '',
        cf['qtyEndCap'] || '',
        cf['qtyFlangeRem'] || '',
        cf['qtyValveRem'] || '',
        cf['qtyFlangeFix'] || '',
        cf['qtyValveFix'] || '',
        cf['qtyWeldValveFix'] || '',
        cf['totalFittingsLength'] || '',
        cf['rmt'] || '',
        cf['area'] || row.totalWeight || ''
      );
      break;
    case 'Equipment Insulation':
      data.push(
        index + 1,
        row.type || cf['equipmentNo'] || '',
        row.mark || cf['equipmentName'] || '',
        cf['portion'] || '',
        cf['position'] || '',
        cf['temp'] || '',
        cf['moc'] || '',
        cf['insulationType'] || '',
        cf['thickness'] || '',
        cf['insulatedDia'] || '',
        row.length || '',
        cf['shellArea'] || '',
        cf['dishFactor'] || '',
        cf['dishEndNos'] || '',
        cf['dishArea'] || '',
        cf['otherArea'] || '',
        cf['totalArea'] || row.totalWeight || ''
      );
      break;
    case 'Piping-LHS':
      data.push(
        index + 1,
        row.area || '',
        cf['docNo'] || '',
        cf['lineNo'] || '',
        cf['sheetNo'] || '',
        cf['rev'] || '',
        cf['moc'] || '',
        cf['fjSj'] || '',
        cf['jointNo'] || '',
        cf['spoolNo'] || '',
        row.width || '',
        row.thickness || '',
        cf['schedule'] || '',
        cf['jointType'] || '',
        cf['componentPart1'] || '',
        cf['componentPart2'] || '',
        row.totalWeight || ''
      );
      break;
    case 'Structure':
      data.push(
        index + 1,
        row.type || '',
        cf['structureType'] || '',
        row.mark || cf['mark'] || '',
        row.unit || '',
        row.length || '',
        row.width || '',
        row.thickness || '',
        row.qty || '',
        row.totalWeight || ''
      );
      break;
    case 'Piping-Spool Status':
      data.push(
        index + 1,
        row.area || '',
        cf['drawingNo'] || '',
        cf['revNo'] || '',
        cf['sheetNo'] || '',
        cf['spoolNo'] || '',
        cf['lineSize'] || '',
        cf['baseMaterial'] || '',
        row.length || '',
        cf['inchMeter'] || '',
        cf['surfaceArea'] || '',
        cf['paintSystem'] || '',
        cf['remarks'] || ''
      );
      break;
    default:
      data.push(
        index + 1,
        row.type || '',
        row.area || '',
        row.length || '',
        row.width || '',
        row.thickness || '',
        row.qty || '',
        row.totalWeight || ''
      );
  }
  
  // Add breakup status for each milestone
  billingBreakup.forEach(b => {
    const newKey = `${row.itemId}-${b.percentage}-${b.name}`;
    const legacyKey = `${b.percentage}%-${b.name}`;
    const status = row.breakupStatus[newKey] || row.breakupStatus[legacyKey];
    
    if (status?.lockedInRA === raBill.raNumber) {
      data.push(`${status.lockedWeight?.toFixed(3) || '0'} (Locked)`);
    } else if (status?.done) {
      data.push(`${status.completedWeight?.toFixed(3) || '0'} (Done)`);
    } else {
      data.push('-');
    }
  });
  
  return data;
}

// Export function for measurement sheet only (from Work Entries page)
export function generateMeasurementExcel(
  item: Item,
  measurementRows: MeasurementRow[],
  project?: Project,
  order?: Order
): void {
  const workbook = XLSX.utils.book_new();
  
  const measurementData: (string | number)[][] = [];
  
  // Header
  measurementData.push([`Measurement Sheet - ${item.description}`]);
  if (project && order) {
    measurementData.push([`Project: ${project.name} | Order: ${order.orderNumber}`]);
  }
  measurementData.push([`Department: ${item.department} | Unit: ${item.unitOfMeasurement}`]);
  measurementData.push([]);
  
  // Get columns based on department (without breakup columns for measurement export)
  const columns = getDepartmentColumnsSimple(item.department);
  measurementData.push(columns);
  
  // Data rows
  measurementRows.forEach((row, index) => {
    const rowData = getMeasurementRowDataSimple(row, index, item.department);
    measurementData.push(rowData);
  });
  
  // Totals row
  const totalQty = measurementRows.reduce((sum, row) => sum + (row.qty || 0), 0);
  const totalWeight = measurementRows.reduce((sum, row) => sum + (row.totalWeight || 0), 0);
  
  const totalsRow: (string | number)[] = ['TOTAL'];
  for (let i = 1; i < columns.length - 2; i++) {
    totalsRow.push('');
  }
  totalsRow.push(totalQty.toFixed(2));
  totalsRow.push(totalWeight.toFixed(3));
  measurementData.push(totalsRow);
  
  const sheet = XLSX.utils.aoa_to_sheet(measurementData);
  sheet['!cols'] = columns.map(() => ({ wch: 12 }));
  
  XLSX.utils.book_append_sheet(workbook, sheet, 'Measurements');
  
  const filename = `Measurements_${item.description.substring(0, 20).replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

function getDepartmentColumnsSimple(department: string): string[] {
  switch (department) {
    case 'Piping Insulation':
      return [
        'Sr.', 'Loc', 'Drg No.', 'Sht No.', 'MOC', 'Line Size', 'Pipe OD', 
        'Ins Thk', 'Ins Type', 'Temp', 'Pipe Len', '90°', '45°', 'Tee', 
        'Red', 'Cap', 'Flg Rem', 'Vlv Rem', 'Flg Fix', 'Vlv Fix', 'Weld', 
        'Fit Len', 'RMT', 'Area'
      ];
    case 'Equipment Insulation':
      return [
        'Sr.', 'Equipment No', 'Equipment Name', 'Portion', 'Position', 
        'Temp', 'MOC', 'Ins Type', 'Thickness', 'Dia', 'Height/Length', 
        'Shell Area', 'Dish Factor', 'Dish Nos', 'Dish Area', 'Other Area', 'Total Area'
      ];
    case 'Piping-LHS':
      return [
        'Sr.', 'Area', 'Doc No.', 'Line No.', 'Sheet No.', 'Rev', 'MOC', 
        'FJ/SJ', 'Joint No.', 'Spool No.', 'Dia', 'Thickness', 'Schedule', 
        'Joint Type', 'Part 1', 'Part 2', 'Total'
      ];
    case 'Structure':
      return [
        'Sr.', 'Description', 'Type', 'Mark No.', 'Unit Weight', 
        'Length', 'Width', 'Thickness', 'Qty', 'Total'
      ];
    case 'Piping-Spool Status':
      return [
        'Sr.', 'Area', 'Drawing No', 'RevNo', 'SheetNo', 'SpoolNo', 
        'Line Size', 'BaseMaterial', 'Length', 'InchMeter', 'SurfaceArea', 
        'PaintSystem', 'Remarks'
      ];
    default:
      return [
        'Sr.', 'Description', 'Area', 'Length', 'Width', 'Height', 'Qty', 'Total'
      ];
  }
}

function getMeasurementRowDataSimple(
  row: MeasurementRow, 
  index: number, 
  department: string
): (string | number)[] {
  const data: (string | number)[] = [];
  const cf = row.customFields || {};
  
  switch (department) {
    case 'Piping Insulation':
      data.push(
        index + 1,
        cf['location'] || row.type || '',
        cf['drawingNo'] || row.mark || '',
        cf['sheetNo'] || '',
        cf['moc'] || '',
        cf['lineSize'] || '',
        cf['pipeOD'] || '',
        cf['insulationThickness'] || '',
        cf['insulationType'] || '',
        cf['temp'] || '',
        row.length || '',
        cf['qtyElbow90'] || '',
        cf['qtyElbow45'] || '',
        cf['qtyTee'] || '',
        cf['qtyReducer'] || '',
        cf['qtyEndCap'] || '',
        cf['qtyFlangeRem'] || '',
        cf['qtyValveRem'] || '',
        cf['qtyFlangeFix'] || '',
        cf['qtyValveFix'] || '',
        cf['qtyWeldValveFix'] || '',
        cf['totalFittingsLength'] || '',
        cf['rmt'] || '',
        cf['area'] || row.totalWeight || ''
      );
      break;
    case 'Equipment Insulation':
      data.push(
        index + 1,
        row.type || cf['equipmentNo'] || '',
        row.mark || cf['equipmentName'] || '',
        cf['portion'] || '',
        cf['position'] || '',
        cf['temp'] || '',
        cf['moc'] || '',
        cf['insulationType'] || '',
        cf['thickness'] || '',
        cf['insulatedDia'] || '',
        row.length || '',
        cf['shellArea'] || '',
        cf['dishFactor'] || '',
        cf['dishEndNos'] || '',
        cf['dishArea'] || '',
        cf['otherArea'] || '',
        cf['totalArea'] || row.totalWeight || ''
      );
      break;
    case 'Piping-LHS':
      data.push(
        index + 1,
        row.area || '',
        cf['docNo'] || '',
        cf['lineNo'] || '',
        cf['sheetNo'] || '',
        cf['rev'] || '',
        cf['moc'] || '',
        cf['fjSj'] || '',
        cf['jointNo'] || '',
        cf['spoolNo'] || '',
        row.width || '',
        row.thickness || '',
        cf['schedule'] || '',
        cf['jointType'] || '',
        cf['componentPart1'] || '',
        cf['componentPart2'] || '',
        row.totalWeight || ''
      );
      break;
    case 'Structure':
      data.push(
        index + 1,
        row.type || '',
        cf['structureType'] || '',
        row.mark || cf['mark'] || '',
        row.unit || '',
        row.length || '',
        row.width || '',
        row.thickness || '',
        row.qty || '',
        row.totalWeight || ''
      );
      break;
    case 'Piping-Spool Status':
      data.push(
        index + 1,
        row.area || '',
        cf['drawingNo'] || '',
        cf['revNo'] || '',
        cf['sheetNo'] || '',
        cf['spoolNo'] || '',
        cf['lineSize'] || '',
        cf['baseMaterial'] || '',
        row.length || '',
        cf['inchMeter'] || '',
        cf['surfaceArea'] || '',
        cf['paintSystem'] || '',
        cf['remarks'] || ''
      );
      break;
    default:
      data.push(
        index + 1,
        row.type || '',
        row.area || '',
        row.length || '',
        row.width || '',
        row.thickness || '',
        row.qty || '',
        row.totalWeight || ''
      );
  }
  
  return data;
}
