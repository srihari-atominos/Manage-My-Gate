import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import expenseService from './expense.service.js';
import expenseRepository from './expense.repository.js';
import { uploadDir } from './expenseUpload.middleware.js';
import HttpError from '../../utils/httpError.utils.js';

class ExpenseController {
  actor(req) { return { orgId: req.tenant.orgId, userId: req.user.id || req.user._id, idempotencyKey: req.get('Idempotency-Key') || req.get('X-Idempotency-Key') || req.body?.idempotencyKey || null }; }
  async create(req, res, next) { try { res.status(201).json({ success: true, data: await expenseService.create(req.body, this.actor(req)) }); } catch (e) { next(e); } }
  async list(req, res, next) { try { res.json({ success: true, data: await expenseService.list(req.tenant.orgId, req.query) }); } catch (e) { next(e); } }
  async get(req, res, next) { try { res.json({ success: true, data: await expenseService.getById(req.params.id, req.tenant.orgId) }); } catch (e) { next(e); } }
  async payment(req, res, next) { try { res.status(201).json({ success: true, data: await expenseService.recordPayment(req.params.id, req.body, this.actor(req)) }); } catch (e) { next(e); } }
  async reconcile(req, res, next) { try { res.json({ success: true, data: await expenseService.reconcilePayment(req.params.id, req.params.paymentId, req.body, this.actor(req)) }); } catch (e) { next(e); } }
  async summary(req, res, next) { try { res.json({ success: true, data: await expenseService.summary(req.tenant.orgId, req.query) }); } catch (e) { next(e); } }
  async uploadAttachment(req, res, next) { try { if (!req.file) throw new HttpError(400, 'Attachment file is required.'); const expense = await expenseRepository.findById(req.params.id, req.tenant.orgId); if (!expense) throw new HttpError(404, 'Expense not found.'); const attachment = { url: `/expenses/${expense._id}/attachments/PLACEHOLDER`, storageName: req.file.filename, filename: req.file.originalname, mimeType: req.file.mimetype, uploadedBy: req.user.id || req.user._id }; expense.attachments.push(attachment); await expense.save(); const saved = expense.attachments[expense.attachments.length - 1]; saved.url = `/expenses/${expense._id}/attachments/${saved._id}`; await expense.save(); res.status(201).json({ success: true, data: saved }); } catch (e) { if (req.file?.path && e) { try { fs.unlinkSync(req.file.path); } catch {} } next(e); } }
  async downloadAttachment(req, res, next) { try { if (!mongoose.isValidObjectId(req.params.attachmentId)) throw new HttpError(404, 'Attachment not found.'); const expense = await expenseRepository.findById(req.params.id, req.tenant.orgId); const attachment = expense?.attachments?.id(req.params.attachmentId); if (!expense || !attachment) throw new HttpError(404, 'Attachment not found.'); const fileName = attachment.storageName ? path.join(uploadDir, path.basename(attachment.storageName)) : null; if (!fileName || !fs.existsSync(fileName)) throw new HttpError(404, 'Attachment file not found.'); res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'attachment' }); res.sendFile(fileName); } catch (e) { next(e); } }
  async findStoredFile(url) { const id = path.basename(url); const files = fs.readdirSync(uploadDir); const match = files.find((file) => file.includes(id) || file.startsWith('expense-') && file.endsWith(path.extname(id))); return match ? path.join(uploadDir, match) : null; }
}
export default new ExpenseController();








