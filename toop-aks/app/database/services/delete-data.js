import { GetDB } from '../db'

export const deleteInvoice = async (id) => {
    const db = await GetDB()
    //         you should change it to  transaction  model
    await db.runAsync(`DELETE 
        FROM documents
         WHERE documents.id = ?`,
        [id])

    await db.runAsync(`DELETE 
        FROM document_items
 
         WHERE document_items.document_id = ?`,
        [id])

    await db.runAsync(`DELETE
        FROM customers
        WHERE customers.id = ?`,
        [id])
};