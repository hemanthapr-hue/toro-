/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string; // Unique identifier / registration ID
  name: string; // Name of person / client / contact
  address: string; // Physical/or mailing address
  phone: string; // Telephone/mobile number
}

export interface SheetConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetName: string;
}

export interface DashboardStats {
  totalRecords: number;
  recentRecords: Transaction[];
}
