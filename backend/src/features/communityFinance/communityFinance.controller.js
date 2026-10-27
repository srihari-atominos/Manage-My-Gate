import service from './communityFinance.service.js';
import Organization from '../organization/organization.model.js';
import HttpError from '../../utils/httpError.utils.js';

class Controller {
  constructor() {
    this.dashboard = this.dashboard.bind(this);
    this.collections = this.collections.bind(this);
    this.outstanding = this.outstanding.bind(this);
    this.expenses = this.expenses.bind(this);
    this.receipts = this.receipts.bind(this);
    this.exceptions = this.exceptions.bind(this);
    this.transactions = this.transactions.bind(this);
    this.exportReport = this.exportReport.bind(this);
  }

  async dashboard(req, res, next) {
    try { res.status(200).json({ success: true, data: await service.getDashboard(req.tenant.orgId, req.query) }); } catch (error) { next(error); }
  }
  async section(name, req, res, next) {
    try { const data = await service.getDashboard(req.tenant.orgId, req.query); res.status(200).json({ success: true, data: data[name] }); } catch (error) { next(error); }
  }
  collections(req, res, next) { return this.section('collections', req, res, next); }
  outstanding(req, res, next) { return this.section('outstanding', req, res, next); }
  expenses(req, res, next) { return this.section('expenses', req, res, next); }
  receipts(req, res, next) { return this.section('receipts', req, res, next); }
  exceptions(req, res, next) { return this.section('exceptions', req, res, next); }
  async transactions(req, res, next) {
    try {
      const data = await service.getTransactions(req.tenant.orgId, req.query);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async exportReport(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const format = req.body?.format || req.query?.format || 'xlsx';
      const filters = {
        ...req.query,
        ...(req.body?.filters || {}),
        format,
      };
      if (req.body?.format) filters.format = req.body.format;
      ['startDate', 'endDate', 'type', 'domain', 'status', 'search', 'timezone', 'period', 'includeLiabilities'].forEach((k) => {
        if (req.body?.[k] !== undefined) filters[k] = req.body[k];
      });

      if (typeof filters.includeLiabilities === 'boolean') filters.includeLiabilities = String(filters.includeLiabilities);

      // Community name comes from the authorised tenant's organisation record, never from the client
      const org = await Organization.findById(orgId).select('name').lean();
      if (!org?.name) {
        throw new HttpError(404, 'Unable to resolve the community for this report.');
      }
      const meta = {
        communityName: org.name,
        generatedBy: req.user?.name || req.user?.username || req.user?.email || 'Community Administrator',
      };

      const result = await service.generateExport(orgId, filters, meta);

      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('X-Export-Filename', result.fileName);
      res.setHeader('X-Export-Rows', String(result.rowCount));
      res.setHeader('X-Export-Total', String(result.totalMatching));
      res.setHeader('X-Export-Truncated', String(result.truncated));
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Export-Filename, X-Export-Rows, X-Export-Total, X-Export-Truncated');
      res.setHeader('Content-Type', result.contentType);

      return res.status(200).send(result.buffer);
    } catch (error) {
      next(error);
    }
  }
}
export default new Controller();
