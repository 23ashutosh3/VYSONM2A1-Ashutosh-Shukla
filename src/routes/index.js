import { Router } from 'express';
import * as controller from '../controllers/url.controller.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// The two endpoints the assignment asks for.
router.post('/shorten', controller.shorten);
router.get('/redirect', controller.redirect);

router.get('/stats', controller.stats);

export default router;
