import { GetDB } from "../db";

export const CreateDocumentItems = async () => {

  const db = await GetDB();

  await db.execAsync(`
  CREATE TABLE IF NOT EXISTS document_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER,
    service TEXT,
    amount INTEGER DEFAULT 1,
    unit_price INTEGER,
    FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE SET NULL
  );
`);
};