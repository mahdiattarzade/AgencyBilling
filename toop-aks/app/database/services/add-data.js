import { GetDB } from "../db";
//it should be more  optimized later but it works properly now 

export const AddNewInvoice = async (customer, type, action, date, services, notes
) => {

    const db = await GetDB();

    const customerResult = await db.runAsync(`INSERT INTO customers (full_name)
        VALUES (?)`, [customer])

    const customerId = customerResult.lastInsertRowId;

    const result = await db.runAsync(`
        INSERT INTO documents (

        customer_id,document_type,mode,description,created_at) VALUES (?,?,?,?,?)`, [customerId, type, action, notes, date])


    const invoice_number = GenerateInvoiceNumber(result.lastInsertRowId, type)

    const set_status = specifying_status(type)

    await db.runAsync(`UPDATE documents SET status = ?, invoice_number = ? WHERE id = ?`,
        [set_status, invoice_number, result.lastInsertRowId]);

    const documentId = result.lastInsertRowId;
    for (const item of services) {
        db.runAsync(`INSERT INTO document_items (document_id,service,amount,unit_price)
            VALUES(?,?,?,?)`, [documentId, item.name, item.amount, item.unitPrice])
    }

}

const GenerateInvoiceNumber = (id, type) => {
    const year = new Date().getFullYear();

    const prefix = type === 'invoice' ? 'INV' : 'PRE';

    return `${prefix}-${year}-${String(id).padStart(6, '0')}`;

};

const specifying_status = (type) => {

    const status_ = type === 'invoice' ? 'awaiting_payment' : 'awaiting_confirmation';
    return status_;
};