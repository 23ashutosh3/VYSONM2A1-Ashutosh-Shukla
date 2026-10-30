As codebase increasing , I have added schema and service layer , Optimize the cod and changes the folder structure

---

## Q1

> [Q1] Create a middleware that logs the following details on every request:
>
> 1. Timestamp
> 2. HTTP method and URL
> 3. User-Agent
> 4. IP
>
> Save the logs in a file or a database table.

Logs are saved in a new `request_logs` table (a file would be lost on Vercel, its disk is temporary).

### Query

```sql
SELECT * FROM request_logs ORDER BY id DESC LIMIT 20;
```

![request log](screenshots/m2a3/requestLog.png)

### Files changed

- `src/schemas/requestLog.schema.js`: new `request_logs` table (`id`, `timestamp`, `method`, `url`, `user_agent`, `ip`)
- `src/schemas/index.js`: creates `request_logs` on startup
- `src/models/requestLog.model.js`: new `insert()` query
- `src/services/requestLog.service.js`: new `logRequest()`, adds the timestamp and saves the row
- `src/middleware/requestLogger.js`: new middleware, reads method, `originalUrl`, User-Agent and IP from the request
- `src/app.js`: `requestLogger` added as the first middleware, so every request is logged (even bad JSON and unknown routes); `trust proxy` set so the real visitor IP is logged on Vercel

---

## Q2

> [Q2] What if we only want to run the above for some routes?

### 1st way

If we want to requestlof for only specific routes , then pass in the routes only .

```js
router.post('/shorten', requestLogger, controller.shorten);
```

### 2nd way

2nd way to use it like

```js
app.use(['/shorten', '/redirect'], requestLogger); // /shorten, /shorten/batch, /shorten/:code, /redirect
```
