// tools/excel.mjs — read_excel + write_excel tools via ExcelJS
import ExcelJS from 'exceljs';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const s3 = new S3Client({ region: process.env.MY_REGION || 'eu-north-1' });
const BUCKET = process.env.PUBLISH_BUCKET;

export const readExcelTool = {
  name: 'read_excel',
  category: 'data',
  displayName: 'Lire un fichier Excel',
  icon: '\u{1F4CA}',
  description: 'Read an Excel (.xlsx) or CSV file from S3 and return its contents as JSON rows. Returns column headers and up to 1000 rows.',
  input_schema: {
    type: 'object',
    properties: {
      s3Key: { type: 'string', description: 'S3 key of the file to read (e.g. "uploads/data.xlsx")' },
      sheetName: { type: 'string', description: 'Sheet name to read (default: first sheet)' },
      maxRows: { type: 'number', description: 'Maximum rows to return (default: 1000)' },
    },
    required: ['s3Key'],
  },
  requiredSecrets: [],
  execute: async (input) => {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: input.s3Key }));
    const buffer = Buffer.from(await obj.Body.transformToByteArray());

    const workbook = new ExcelJS.Workbook();

    if (input.s3Key.endsWith('.csv')) {
      await workbook.csv.read(buffer);
    } else {
      await workbook.xlsx.load(buffer);
    }

    const sheet = input.sheetName
      ? workbook.getWorksheet(input.sheetName)
      : workbook.worksheets[0];

    if (!sheet) throw new Error(`Sheet not found: ${input.sheetName || 'first sheet'}`);

    const headers = [];
    const rows = [];
    const maxRows = input.maxRows || 1000;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          headers[colNumber - 1] = String(cell.value || `col_${colNumber}`);
        });
      } else if (rows.length < maxRows) {
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          const key = headers[colNumber - 1] || `col_${colNumber}`;
          rowData[key] = cell.value;
        });
        rows.push(rowData);
      }
    });

    return {
      success: true,
      sheetName: sheet.name,
      columns: headers,
      rowCount: rows.length,
      totalRows: sheet.rowCount - 1,
      rows,
    };
  },
};

export const writeExcelTool = {
  name: 'write_excel',
  category: 'data',
  displayName: 'Créer un fichier Excel',
  icon: '\u{1F4DD}',
  description: 'Create an Excel (.xlsx) file from JSON data and upload to S3. Returns the S3 URL for download.',
  input_schema: {
    type: 'object',
    properties: {
      filename: { type: 'string', description: 'Output filename (e.g. "report.xlsx")' },
      sheetName: { type: 'string', description: 'Sheet name (default: "Sheet1")' },
      columns: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            header: { type: 'string' },
            key: { type: 'string' },
            width: { type: 'number' },
          },
          required: ['header', 'key'],
        },
        description: 'Column definitions with header and key',
      },
      rows: {
        type: 'array',
        items: { type: 'object' },
        description: 'Array of row objects (keys must match column keys)',
      },
    },
    required: ['columns', 'rows'],
  },
  requiredSecrets: [],
  execute: async (input) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(input.sheetName || 'Sheet1');

    sheet.columns = input.columns.map(c => ({
      header: c.header,
      key: c.key,
      width: c.width || 20,
    }));

    // Style header row
    sheet.getRow(1).font = { bold: true };

    for (const row of input.rows) {
      sheet.addRow(row);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = input.filename || `output-${randomUUID().slice(0, 8)}.xlsx`;
    const s3Key = `automation-outputs/${filename}`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: Buffer.from(buffer),
      ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }));

    const region = process.env.MY_REGION || 'eu-north-1';
    const url = `https://${BUCKET}.s3.${region}.amazonaws.com/${s3Key}`;

    return {
      success: true,
      filename,
      s3Key,
      url,
      rowCount: input.rows.length,
      columnCount: input.columns.length,
    };
  },
};
