import express from 'express';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

const app = express();

// M2A3 Q1: on Vercel requests arrive through a proxy, so req.ip is read from
// X-Forwarded-For to get the visitor's IP instead of the proxy's.
app.set('trust proxy', true);

// First, so every request is logged, including bad JSON and unknown routes.
app.use(requestLogger);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes sit at the root so the paths match the spec exactly:
// POST /shorten and GET /redirect?code={code}
app.use('/', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
