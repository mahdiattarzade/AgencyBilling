import {CreateDocumentable} from './tables/documents.table'
import {CreateDocumentItems}from './tables/document-items.table'
import {CreateCustomers} from './tables/costumers.tables'

 export  const CreateTables =async ()=>{

   await CreateCustomers();
   await CreateDocumentable();
   await CreateDocumentItems();
};