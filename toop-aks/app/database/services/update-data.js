import { GetDB } from '../db';

// تبدیل پیش‌فاکتور به فاکتور
export const UpdatePreInvoiceToInvoice = async (id) => {
  const db = await GetDB();

  try {
    await db.execAsync('BEGIN TRANSACTION');

    // 1. شماره فاکتور جدید ایجاد کن (PRE به INV تغییر کن)
    const currentInvoice = await db.getFirstAsync(
      'SELECT invoice_number FROM documents WHERE id = ?',
      [id]
    );

    if (!currentInvoice) {
      throw new Error('Document not found');
    }

    const newInvoiceNumber = currentInvoice.invoice_number.replace('PRE', 'INV');

    // 2. آپدیت document
    await db.runAsync(
      `UPDATE documents SET 
        document_type = 'invoice',
        status = 'awaiting_payment',
        invoice_number = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newInvoiceNumber, id]
    );

    await db.execAsync('COMMIT');


  } catch (error) {
    await db.execAsync('ROLLBACK');
    console.error('❌ Error converting pre-invoice to invoice:', error);
    throw error;
  }
};

// رد کردن پیش‌فاکتور
export const RejectPreInvoice = async (id) => {
  const db = await GetDB();

  try {
    await db.runAsync(
      `UPDATE documents SET 
        status = 'rejected',
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );
    ;

  } catch (error) {
    console.error('❌ Error rejecting pre-invoice:', error);
    throw error;
  }
};


// توابع دیگر برای مدیریت سرویس‌ها
export const UpdateService = async (serviceId, data) => {
  const db = await GetDB();

  try {
    await db.runAsync(
      `UPDATE document_items SET 
        service = ?, 
        amount = ?, 
        unit_price = ?, 
        paid_amount = ?
        description = ?
       WHERE id = ?`,
      [data.service, data.amount, data.unit_price, data.paid_amount, data.description || null, serviceId]
    );


  } catch (error) {
    console.error('❌ Error updating service:', error);
    throw error;
  }
};

export const DeleteService = async (serviceId) => {
  const db = await GetDB();

  try {
    await db.runAsync(
      `DELETE FROM document_items WHERE id = ?`,
      [serviceId]
    );


  } catch (error) {
    console.error('❌ Error deleting service:', error);
    throw error;
  }
};

export const AddService = async (documentId, data) => {
  const db = await GetDB();

  try {
    const result = await db.runAsync(
      `INSERT INTO document_items (document_id, service, amount, unit_price, description)
       VALUES (?, ?, ?, ?, ?)`,
      [documentId, data.service, data.amount, data.unit_price, data.description || null]
    );


    return { id: result.lastInsertRowId, ...data };

  } catch (error) {
    console.error('❌ Error adding service:', error);
    throw error;
  }
};

export const UpdateServices = async (documentId, services) => {
  const db = await GetDB();

  await db.execAsync('BEGIN TRANSACTION');

  try {
    // Delete all existing services
    await db.runAsync(
      `DELETE FROM document_items WHERE document_id = ?`,
      [documentId]
    );

    // Insert updated services
    for (const service of services) {
      await db.runAsync(
        `INSERT INTO document_items (document_id, service, amount, unit_price, description)
         VALUES (?, ?, ?, ?, ?)`,
        [documentId, service.service, service.amount, service.unit_price, service.description || null]
      );
    }

    await db.execAsync('COMMIT');


  } catch (error) {
    await db.execAsync('ROLLBACK');
    console.error('❌ Error updating services:', error);
    throw error;
  }
};

export const UpdateDocument = async (id, status) => {
  const db = await GetDB();

  try {
    const result = await db.runAsync(
      `UPDATE documents SET 
        status = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, id]
    );

  } catch (error) {
    console.error('❌ Error updating document:', error);
    throw error;
  }
};

// تابع جدید برای آپدیت سرویس‌ها
export const UpdateInvoiceServices = async (documentId, services) => {
  const db = await GetDB();

  await db.execAsync('BEGIN TRANSACTION');

  try {
    // حذف همه سرویس‌های موجود
    await db.runAsync(
      `DELETE FROM document_items WHERE document_id = ?`,
      [documentId]
    );

    // درج سرویس‌های به‌روز شده
    for (const service of services) {
      await db.runAsync(
        `INSERT INTO document_items (document_id, service, amount, unit_price)
         VALUES (?, ?, ?, ?)`,
        [documentId, service.service, service.amount, service.unit_price || null]
      );
    }

    await db.execAsync('COMMIT');


  } catch (error) {
    await db.execAsync('ROLLBACK');
    console.error('❌ Error updating services:', error);
    throw error;
  }
};

export const updatePaidAmount = async (documentId, paidAmount) => {

  const db = await GetDB();
  try {
    await db.runAsync('UPDATE documents SET paid_amount = ? WHERE id = ? ',
      [paidAmount, documentId])
  }
  catch (error) {
    console.error('❌ Error updating document:', error);
    throw error;
  }



}