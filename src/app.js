import express from 'express';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes sit at the root so the paths match the spec exactly:
// POST /shorten and GET /redirect?code={code}
app.use('/', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
