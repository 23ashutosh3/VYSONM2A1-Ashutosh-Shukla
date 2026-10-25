// Q12: Vercel entry point. Vercel runs this file as a serverless function and
// calls the exported Express app for each request, so there is no listen().
import app from '../src/app.js';

export default app;
