import { Router } from 'express';
import controller from './platformSubscription.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import {
  createSubscriptionRules,
  querySubscriptionRules,
  getSubscriptionByIdRules,
  getByOrgIdRules,
  updateSubscriptionStatusRules,
} from './platformSubscription.validator.js';

const router = Router();

router.post(
  '/',
  validate(createSubscriptionRules),
  controller.create
);

router.get(
  '/',
  validate(querySubscriptionRules),
  controller.list
);

router.get(
  '/:id',
  validate(getSubscriptionByIdRules),
  controller.getById
);

router.get(
  '/organisation/:organisationId',
  validate(getByOrgIdRules),
  controller.getByOrgId
);

router.patch(
  '/:id/status',
  validate(updateSubscriptionStatusRules),
  controller.updateStatus
);

router.post(
  '/:id/cancel',
  validate(getSubscriptionByIdRules),
  controller.cancel
);

export default router;
