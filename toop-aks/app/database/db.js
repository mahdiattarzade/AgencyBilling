import * as SQLite from 'expo-sqlite';

let dbPromise = null;

export const GetDB = async () => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('invoices.db');
  }
  return dbPromise;
};

// در هر فایلی که دیتابیس تعریف شده:



