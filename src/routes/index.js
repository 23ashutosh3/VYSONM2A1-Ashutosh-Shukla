import { Router } from 'express';
import * as controller from '../controllers/url.controller.js';
import { requireApiKey } from '../middleware/requireApiKey.js';
import { requireEnterprise } from '../middleware/requireEnterprise.js';

const router = Router();

// The api key is optional on /shorten (no key = no owner), so it has no check.
router.post('/shorten', controller.shorten);
router.get('/redirect', controller.redirect);
router.get('/health', controller.health);

// M2A3 Q3: these need a user, so a missing or invalid api key stops the
// request with 401 before the controller runs.
// M2A3 Q4: bulk creation is only for the enterprise tier.
router.post('/shorten/batch', requireApiKey, requireEnterprise, controller.shortenBatch);
router.patch('/shorten/:code', requireApiKey, controller.update);
router.delete('/shorten/:code', requireApiKey, controller.remove);
router.get('/urls', requireApiKey, controller.list);

export default router;
