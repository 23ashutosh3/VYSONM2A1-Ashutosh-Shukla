import app from './app.js';
import { close, DB_PATH } from './db.js';

const port = Number(process.env.PORT ?? 3000);

const server = app.listen(port, () => {
  console.log(`URL shortener listening on http://localhost:${port}`);
  console.log(`SQLite database: ${DB_PATH}`);
});

// Surface the common "port already taken" case instead of a bare stack trace.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Set PORT to something else, e.g. PORT=3001 npm start`);
    process.exit(1);
  }
  throw err;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      close();
      process.exit(0);
    });
  });
}
