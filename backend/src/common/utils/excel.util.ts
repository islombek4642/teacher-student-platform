import * as xlsx from 'xlsx-js-style';

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
    
    // Bold headers
    const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = xlsx.utils.encode_cell({ r: 0, c: C });
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "EAEAEA" } },
        alignment: { horizontal: "center" }
      };
    }

    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
  }
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
