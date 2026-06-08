import { Router } from 'express';
import sampleFeatureRouter from '../features/sampleFeature/sampleFeature.router.js';

const router = Router();

// Mount feature routers here
router.use('/sample', sampleFeatureRouter);

export default router;
