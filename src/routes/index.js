import { Router } from 'express';
import * as controller from '../controllers/url.controller.js';
import { requireApiKey } from '../middleware/requireApiKey.js';
import { requireEnterprise } from '../middleware/requireEnterprise.js';
import { timed } from '../middleware/middlewareTimer.js';

const router = Router();

// M2A3 Q9: timed so their time shows up in the middleware timing log.
const apiKey = timed('requireApiKey', requireApiKey);
const enterprise = timed('requireEnterprise', requireEnterprise);

// The api key is optional on /shorten (no key = no owner), so it has no check.
router.post('/shorten', controller.shorten);
router.get('/redirect', controller.redirect);
router.get('/health', controller.health);

// M2A3 Q3: these need a user, so a missing or invalid api key stops the
// request with 401 before the controller runs.
// M2A3 Q4: bulk creation is only for the enterprise tier.
router.post('/shorten/batch', apiKey, enterprise, controller.shortenBatch);
router.patch('/shorten/:code', apiKey, controller.update);
router.delete('/shorten/:code', apiKey, controller.remove);
router.get('/urls', apiKey, controller.list);

export default router;
