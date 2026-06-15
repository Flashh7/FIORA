import { google } from 'googleapis';

export interface LedgerRow {
  date: string;
  type: string;
  category: string;
  amount: number;
  status: string;
  customer?: string;
  invoiceId?: string;
}

export class GoogleSheetsClient {
  private sheets;
  private spreadsheetId: string;

  constructor() {
    this.spreadsheetId = process.env.FINANCE_SHEET_ID || '';

    // Standard Google Application Default Credentials or explicit auth
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async getLedger(): Promise<LedgerRow[]> {
    if (!this.spreadsheetId) {
      console.warn('[FINANCE] No FINANCE_SHEET_ID set. Returning empty ledger.');
      return [];
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Transactions!A2:G',
      });

      const rows = response.data.values || [];
      return rows.map((row) => ({
        date: row[0] || '',
        type: row[1] || '',
        category: row[2] || '',
        amount: parseFloat(row[3]) || 0,
        status: row[4] || '',
        customer: row[5] || '',
        invoiceId: row[6] || '',
      }));
    } catch (err) {
      console.error('[FINANCE] Failed to fetch ledger from Google Sheets:', err);
      return [];
    }
  }

  async appendRow(row: any[]): Promise<boolean> {
    if (!this.spreadsheetId) {
      console.warn('[FINANCE] No FINANCE_SHEET_ID set. Cannot append row.');
      return false;
    }

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Transactions!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row],
        },
      });
      return true;
    } catch (err) {
      console.error('[FINANCE] Failed to append row to Google Sheets:', err);
      return false;
    }
  }
}

export const sheetsClient = new GoogleSheetsClient();
