import { Router } from 'express';
import controller from './platformEntitlement.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  verifyEntitlementRules,
  grantEntitlementRules,
  queryEntitlementRules,
  getByIdEntitlementRules,
  getByOrgIdRules,
  updateEntitlementStatusRules,
} from './platformEntitlement.validator.js';

const router = Router();

router.get(
  '/verify/:organisationId',
  validate(verifyEntitlementRules),
  controller.verify
);

router.post(
  '/',
  validate(grantEntitlementRules),
  controller.grant
);

router.get(
  '/',
  validate(queryEntitlementRules),
  controller.list
);

router.get(
  '/organisation/:organisationId',
  validate(getByOrgIdRules),
  controller.getByOrgId
);

router.patch(
  '/:id/status',
  validate(updateEntitlementStatusRules),
  controller.updateStatus
);

export default router;
