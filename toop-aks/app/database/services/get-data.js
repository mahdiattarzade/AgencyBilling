import { GetDB } from "../db";

export const FetchData = async (whereClause = '', params = []) => {
  const db = await GetDB();

  const query = `
    SELECT 
      documents.id,
      documents.created_at,
      documents.document_type,
      documents.mode,
      documents.status,
      documents.invoice_number,
      customers.full_name
    FROM documents
    LEFT JOIN customers 
      ON documents.customer_id = customers.id
    ${whereClause ? `WHERE ${whereClause}` : ''}
    ORDER BY documents.created_at DESC
  `;

  const result = await db.getAllAsync(query, params);
  return result;
};

export const FetchDocument = async (id) => {
  const db = await GetDB();

  const query_document = `SELECT
  d.id,
   d.document_type,
   d.invoice_number,
   d.paid_amount,
   d.description,
   d.created_at,
   d.status,
   c.full_name
   FROM documents d
   LEFT JOIN customers c
      ON d.customer_id = c.id
      WHERE d.id = ?`

  const query_items = `SELECT service, amount, unit_price
FROM document_items
WHERE document_items.document_id = ?`

  const document = await db.getFirstAsync(query_document, [id]);


  const items = await db.getAllAsync(query_items, [id])

  return {
    invoice: document, services: items
  }
};
