import * as xlsx from 'xlsx';

export function parseExcelToJSON(buffer: Buffer): Record<string, any[]> {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const result: Record<string, any[]> = {};
  for (const sheetName of workbook.SheetNames) {
    result[sheetName] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  }
  return result;
}

export function generateExcelBuffer(sheetsData: Record<string, any[]>): Buffer {
  const workbook = xlsx.utils.book_new();
  for (const [sheetName, data] of Object.entries(sheetsData)) {
    const worksheet = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
  }
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
