import { GetDB } from "../db";

export const CreateCustomers =async ()=>{
    const db = await GetDB();
          
    await db.execAsync(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT
  );
`);
};