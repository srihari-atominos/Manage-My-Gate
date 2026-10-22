import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import expenseService from './expense.service.js';
import expenseRepository from './expense.repository.js';
import { uploadDir } from './expenseUpload.middleware.js';
import HttpError from '../../utils/httpError.utils.js';
import { previewReceiptOcr } from './expenseOcr.service.js';
import {
  assertFormat,
  exportFileName,
  reportToCsv,
  reportToXlsxBuffer,
  reportToPdfBuffer,
} from './expense.export.js';

class ExpenseController {
  constructor() {
    this.create = this.create.bind(this);
    this.payment = this.payment.bind(this);
    this.paymentAttempt = this.paymentAttempt.bind(this);
    this.getPaymentAttempt = this.getPaymentAttempt.bind(this);
    this.paymentAttemptOutcome = this.paymentAttemptOutcome.bind(this);
    this.reconcile = this.reconcile.bind(this);
    this.update = this.update.bind(this);
    this.cancel = this.cancel.bind(this);
    this.voidPayment = this.voidPayment.bind(this);
    this.previewReceiptOcr = this.previewReceiptOcr.bind(this);
    this.exportExpenses = this.exportExpenses.bind(this);
  }

  actor(req) { return { orgId: req.tenant.orgId, userId: req.user.id || req.user._id, idempotencyKey: req.get('Idempotency-Key') || req.get('X-Idempotency-Key') || req.body?.idempotencyKey || null }; }
  async create(req, res, next) { try { res.status(201).json({ success: true, data: await expenseService.create(req.body, this.actor(req)) }); } catch (e) { next(e); } }
  async list(req, res, next) { try { res.json({ success: true, data: await expenseService.list(req.tenant.orgId, req.query) }); } catch (e) { next(e); } }
  async onlinePayee(req, res, next) { try { res.json({ success: true, data: await expenseService.getOnlinePayee(req.tenant.orgId) }); } catch (e) { next(e); } }
  async get(req, res, next) { try { res.json({ success: true, data: await expenseService.getById(req.params.id, req.tenant.orgId) }); } catch (e) { next(e); } }
  async payment(req, res, next) { try { res.status(201).json({ success: true, data: await expenseService.recordPayment(req.params.id, req.body, this.actor(req)) }); } catch (e) { next(e); } }
  async paymentAttempt(req,res,next) { try { res.status(201).json({ success:true, data: await expenseService.createPaymentAttempt(req.params.id, req.body, this.actor(req)) }); } catch(e){ next(e); } }
  async getPaymentAttempt(req,res,next) { try { res.json({ success:true, data: await expenseService.getPaymentAttempt(req.params.id, req.params.paymentId, this.actor(req)) }); } catch(e){ next(e); } }
  async paymentAttemptOutcome(req,res,next) { try { res.json({ success:true, data: await expenseService.updatePaymentAttempt(req.params.id, req.params.paymentId, req.body, this.actor(req)) }); } catch(e){ next(e); } }
  async reconcile(req, res, next) { try { res.json({ success: true, data: await expenseService.reconcilePayment(req.params.id, req.params.paymentId, req.body, this.actor(req)) }); } catch (e) { next(e); } }
  async update(req, res, next) { try { res.json({ success: true, data: await expenseService.update(req.params.id, req.body, this.actor(req)) }); } catch (e) { next(e); } }
  async cancel(req, res, next) { try { res.json({ success: true, data: await expenseService.cancel(req.params.id, req.body, this.actor(req)) }); } catch (e) { next(e); } }
  async voidPayment(req, res, next) { try { res.json({ success: true, data: await expenseService.voidPayment(req.params.id, req.params.paymentId, req.body, this.actor(req)) }); } catch (e) { next(e); } }
  async summary(req, res, next) { try { res.json({ success: true, data: await expenseService.summary(req.tenant.orgId, req.query) }); } catch (e) { next(e); } }
  async exportExpenses(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const format = assertFormat(req.query.format);
      const report = await expenseService.export(orgId, req.query, {
        generatedBy: req.user?.name || req.user?.username || 'Community Administrator',
      });
      const fileName = exportFileName(format, req.query);

      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('X-Export-Filename', fileName);
      res.setHeader('X-Export-Rows', String(report.rows.length));
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Export-Filename, X-Export-Rows');

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        return res.send(reportToCsv(report));
      }
      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        return res.send(await reportToPdfBuffer(report));
      }
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(await reportToXlsxBuffer(report));
    } catch (error) {
      next(error);
    }
  }
  async previewReceiptOcr(req, res, next) { try { if (!req.file) throw new HttpError(400, 'Receipt file is required.'); const result = await previewReceiptOcr(req.file); try { fs.unlinkSync(req.file.path); } catch {} res.json({ success: true, data: result }); } catch (e) { if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch {} } next(e); } }
    async uploadAttachment(req, res, next) { try { if (!req.file) throw new HttpError(400, 'Attachment file is required.'); const expense = await expenseRepository.findById(req.params.id, req.tenant.orgId); if (!expense) throw new HttpError(404, 'Expense not found.'); if (expense.lifecycleStatus === 'CANCELLED') throw new HttpError(409, 'This expense has been cancelled.'); if (expense.attachments.length >= 10) throw new HttpError(400, 'An expense can have at most 10 attachments.'); const attachmentId = new mongoose.Types.ObjectId(); expense.attachments.push({ _id: attachmentId, url: `/expenses/${expense._id}/attachments/${attachmentId}`, storageName: req.file.filename, filename: req.file.originalname, mimeType: req.file.mimetype, uploadedBy: req.user.id || req.user._id }); await expense.save(); const saved = expense.attachments.id(attachmentId); res.status(201).json({ success: true, data: saved }); } catch (e) { if (req.file?.path && e) { try { fs.unlinkSync(req.file.path); } catch {} } next(e); } }
  async downloadAttachment(req, res, next) { try { if (!mongoose.isValidObjectId(req.params.attachmentId)) throw new HttpError(404, 'Attachment not found.'); const expense = await expenseRepository.findById(req.params.id, req.tenant.orgId); const attachment = expense?.attachments?.id(req.params.attachmentId); if (!expense || !attachment) throw new HttpError(404, 'Attachment not found.'); const fileName = attachment.storageName ? path.join(uploadDir, path.basename(attachment.storageName)) : null; if (!fileName || !fs.existsSync(fileName)) throw new HttpError(404, 'Attachment file not found.'); res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'attachment' }); res.sendFile(fileName); } catch (e) { next(e); } }
  async findStoredFile(url) { const id = path.basename(url); const files = fs.readdirSync(uploadDir); const match = files.find((file) => file.includes(id) || file.startsWith('expense-') && file.endsWith(path.extname(id))); return match ? path.join(uploadDir, match) : null; }
}
export default new ExpenseController();








