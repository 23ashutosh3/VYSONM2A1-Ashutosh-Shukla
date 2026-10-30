import express from 'express';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { blacklist } from './middleware/blacklist.js';
import { responseTime } from './middleware/responseTime.js';
import { timed, logMiddlewareTimings } from './middleware/middlewareTimer.js';
import { reportToSentry } from './middleware/observability.js';

const app = express();

// M2A3 Q1: on Vercel requests arrive through a proxy, so req.ip is read from
// X-Forwarded-For to get the visitor's IP instead of the proxy's.
app.set('trust proxy', true);

// M2A3 Q9: prints each middleware's time (wrapped with timed() below) once
// the response is sent.
app.use(logMiddlewareTimings);

// M2A3 Q6: first, so the elapsed time covers every other middleware too.
app.use(timed('responseTime', responseTime));

// So every request is logged, including bad JSON and unknown routes.
app.use(timed('requestLogger', requestLogger));

// M2A3 Q5: after the logger, so blocked requests are still logged, and before
// the routes, so a blocked key never reaches any endpoint.
app.use(timed('blacklist', blacklist));

app.use(timed('json', express.json()));
app.use(timed('urlencoded', express.urlencoded({ extended: false })));

// Routes sit at the root so the paths match the spec exactly:
// POST /shorten and GET /redirect?code={code}
app.use('/', routes);

app.use(notFound);

// M2A3 Q10: before errorHandler, so every error reaches Sentry first.
app.use(reportToSentry);
app.use(errorHandler);

export default app;
