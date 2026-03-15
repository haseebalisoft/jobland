import express from 'express';
import { submitJobFromExtension } from '../controllers/extensionController.js';

const router = express.Router();

// No JWT; auth is via Bearer oneclick_api_key in controller
router.post('/jobs', submitJobFromExtension);

export default router;
