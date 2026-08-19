import { Router } from 'express';
import platformInvoiceController from './platformInvoice.controller.js';

const router = Router();

router.get('/', platformInvoiceController.getAll);
router.get('/:id', platformInvoiceController.getById);
router.get('/:id/download-pdf', platformInvoiceController.downloadPdf);
router.get('/:id/pdf', platformInvoiceController.downloadPdf);
router.post('/generate-from-order', platformInvoiceController.generateFromOrder);
router.post('/:id/payment', platformInvoiceController.recordPayment);
router.post('/:id/void', platformInvoiceController.voidInvoice);

export default router;
