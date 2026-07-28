import onboardingWizardService from './onboardingWizard.service.js';
import HttpError from '../../utils/httpError.utils.js';

export class OnboardingWizardController {
  async validateImport(req, res, next) {
    try {
      if (!req.file) {
        throw new HttpError(400, 'File upload is required. Please upload a .csv or .xlsx file.');
      }

      const organisationId = req.tenant?.orgId || req.body?.organisationId || req.body?.orgId;
      if (!organisationId) {
        throw new HttpError(400, 'Organization ID is required.');
      }

      const summary = await onboardingWizardService.validateImportFile(req.file.buffer, organisationId);
      return res.success(summary, 'File validation executed successfully');
    } catch (error) {
      next(error);
    }
  }

  async executeImport(req, res, next) {
    try {
      const organisationId = req.tenant?.orgId || req.body?.organisationId || req.body?.orgId;
      if (!organisationId) {
        throw new HttpError(400, 'Organization ID is required.');
      }

      const { validDataArray } = req.body;
      const result = await onboardingWizardService.executeImport(validDataArray, organisationId);
      return res.success(result, 'Onboarding data import executed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new OnboardingWizardController();
