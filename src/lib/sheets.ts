/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction, SheetConfig } from '../types';

/**
 * Searches the user's Google Drive for an existing spreadsheet named 'Toro Business DB' and returns its ID.
 * If not found, creates a new Spreadsheet with 'Records' sheets and ['ID', 'Name', 'Address', 'Phone Number'] headers.
 */
export async function getOrCreateSpreadsheet(accessToken: string): Promise<SheetConfig> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  // 1. Search for existing spreadsheet titled 'Toro Business DB'
  const query = encodeURIComponent("name = 'Toro Business DB' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;

  try {
    const searchRes = await fetch(searchUrl, { headers });
    if (!searchRes.ok) {
      throw new Error(`Google Drive API search failed with status ${searchRes.status}`);
    }
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      const file = searchData.files[0];
      return {
        spreadsheetId: file.id,
        spreadsheetUrl: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}`,
        sheetName: 'Records',
      };
    }

    // 2. Not found, create a new Spreadsheet titled 'Toro Business DB'
    const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    const createBody = {
      properties: {
        title: 'Toro Business DB',
      },
      sheets: [
        {
          properties: {
            title: 'Records',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    };

    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBody),
    });

    if (!createRes.ok) {
      throw new Error(`Google Sheets creation failed with status ${createRes.status}`);
    }

    const newSheet = await createRes.json();
    const spreadsheetId = newSheet.spreadsheetId;
    const spreadsheetUrl = newSheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    // 3. Initialize headers in the first row: ID, Name, Address, Phone Number
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Records!A1:D1:append?valueInputOption=USER_ENTERED`;
    const appendBody = {
      values: [
        ['ID', 'Name', 'Address', 'Phone Number'],
      ],
    };

    const appendRes = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appendBody),
    });

    if (!appendRes.ok) {
      console.warn('Failed to append headers to Toro Business DB, continuing anyway...');
    }

    return {
      spreadsheetId,
      spreadsheetUrl,
      sheetName: 'Records',
    };
  } catch (err) {
    console.error('Error in getOrCreateSpreadsheet:', err);
    throw err;
  }
}

/**
 * Reads all rows from the spreadsheet and parses them into Directory/Ledger Record objects.
 */
export async function fetchTransactions(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string = 'Records'
): Promise<Transaction[]> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  // Read columns A to D from row 2 onwards (skipping headers)
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A2:D10000`;

  try {
    const res = await fetch(readUrl, { headers });
    if (!res.ok) {
      if (res.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch values: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.values || data.values.length === 0) {
      return [];
    }

    const records: Transaction[] = [];

    data.values.forEach((row: any[], index: number) => {
      const [id = '', name = '', address = '', phone = ''] = row;
      
      // We process lines that have an ID or name
      if (id || name) {
        records.push({
          id: id || `ID-${Date.now()}-${index}`,
          name: name || '',
          address: address || '',
          phone: phone || '',
        });
      }
    });

    return records;
  } catch (err) {
    console.error('Error fetching Toro records:', err);
    return [];
  }
}

/**
 * Appends a new business record row to the end of the sheet.
 */
export async function addTransactionToSheet(
  accessToken: string,
  spreadsheetId: string,
  record: Transaction,
  sheetName: string = 'Records'
): Promise<boolean> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:D:append?valueInputOption=USER_ENTERED`;
  const appendBody = {
    values: [
      [
        record.id,
        record.name,
        record.address,
        record.phone,
      ],
    ],
  };

  try {
    const res = await fetch(appendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(appendBody),
    });

    return res.ok;
  } catch (err) {
    console.error('Error adding Toro record:', err);
    return false;
  }
}

/**
 * Modifies an existing record row.
 */
export async function updateTransactionInSheet(
  accessToken: string,
  spreadsheetId: string,
  record: Transaction,
  sheetName: string = 'Records'
): Promise<boolean> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1. Fetch current rows to find row index matching record.id
    const searchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:D`;
    const searchRes = await fetch(searchUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!searchRes.ok) return false;

    const data = await searchRes.json();
    if (!data.values) return false;

    // Find row index (headers are row 1, indexes in Google Sheets are 1-based)
    let rowIndex = -1;
    for (let i = 0; i < data.values.length; i++) {
      const colId = data.values[i][0]; // Column A is ID
      if (colId === record.id) {
        rowIndex = i + 1; // 1-based Row Index
        break;
      }
    }

    if (rowIndex === -1) {
      console.error(`Record with ID ${record.id} not found in sheet.`);
      return false;
    }

    // 2. Put the updated values into that row
    const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A${rowIndex}:D${rowIndex}?valueInputOption=USER_ENTERED`;
    const putBody = {
      values: [
        [
          record.id,
          record.name,
          record.address,
          record.phone,
        ],
      ],
    };

    const res = await fetch(putUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(putBody),
    });

    return res.ok;
  } catch (err) {
    console.error('Error updating Toro record:', err);
    return false;
  }
}

/**
 * Deletes a record row from the sheet.
 */
export async function deleteTransactionFromSheet(
  accessToken: string,
  spreadsheetId: string,
  recordId: string,
  sheetName: string = 'Records'
): Promise<boolean> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1. Get spreadsheet metadata to retrieve exact sheetId for 'Records'
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`;
    const metaRes = await fetch(metaUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!metaRes.ok) return false;

    const metaData = await metaRes.json();
    let sheetId = 0; // Default first sheet id
    if (metaData.sheets) {
      const matchedSheet = metaData.sheets.find(
        (s: any) => s.properties.title === sheetName
      );
      if (matchedSheet) {
        sheetId = matchedSheet.properties.sheetId;
      }
    }

    // 2. Find row index matching recordId
    const rangeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:D`;
    const rangeRes = await fetch(rangeUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!rangeRes.ok) return false;

    const rollData = await rangeRes.json();
    if (!rollData.values) return false;

    let rowIndex = -1;
    for (let i = 0; i < rollData.values.length; i++) {
      const colId = rollData.values[i][0]; // Column A is ID
      if (colId === recordId) {
        rowIndex = i; // 0-indexed offset
        break;
      }
    }

    if (rowIndex === -1) {
      console.error(`Record with ID ${recordId} not found in sheet.`);
      return false;
    }

    // 3. Perform deleteDimension request
    const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const deleteBody = {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex, // inclusive
              endIndex: rowIndex + 1, // exclusive
            },
          },
        },
      ],
    };

    const res = await fetch(deleteUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(deleteBody),
    });

    return res.ok;
  } catch (err) {
    console.error('Error deleting Toro record:', err);
    return false;
  }
}
