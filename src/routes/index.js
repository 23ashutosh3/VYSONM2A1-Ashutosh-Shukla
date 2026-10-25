import { Router } from 'express';
import * as controller from '../controllers/url.controller.js';

const router = Router();

router.post('/shorten', controller.shorten);
router.get('/redirect', controller.redirect);
router.delete('/shorten/:code', controller.remove);

export default router;
