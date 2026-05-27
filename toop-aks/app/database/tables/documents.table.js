import { GetDB } from "../db"

export const CreateDocumentable = async () => {
    const db = await GetDB();

    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            document_type TEXT,
            mode TEXT,
            status TEXT,
            invoice_number TEXT UNIQUE,
            paid_amount INTEGER DEFAULT 0,
            description TEXT,
            created_at TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL
        );
    `);
};