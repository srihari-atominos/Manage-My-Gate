import service from './communityFinance.service.js';

class Controller {
  constructor() {
    this.dashboard = this.dashboard.bind(this);
    this.collections = this.collections.bind(this);
    this.outstanding = this.outstanding.bind(this);
    this.expenses = this.expenses.bind(this);
    this.receipts = this.receipts.bind(this);
    this.exceptions = this.exceptions.bind(this);
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
}
export default new Controller();
