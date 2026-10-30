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

---

## Q3

> [Q3] Create a middleware that checks whether the provided API key is valid or not. If not, return the request at this step itself without running the endpoint logic.

### Files changed

- `src/middleware/requireApiKey.js`: new middleware, returns `401` if the `x-api-key` header is missing or invalid, so the controller never runs; otherwise sets `req.user` and calls `next()`
- `src/services/user.service.js`: new `findByApiKey()`, used by the middleware to look up the user
- `src/routes/index.js`: `requireApiKey` added to `POST /shorten/batch`, `PATCH /shorten/:code`, `DELETE /shorten/:code` and `GET /urls`
- `test/integration.test.js`: deleting without an api key now expects `401` instead of `403`; deleting a code that does not exist now sends a valid api key, so it still gets `404`

---

## Q4

> [Q4] In the bulk endpoint, move the authorization logic to a middleware (that checks if the plan is enterprise or not). This makes it reusable for future.

### Files changed

- `src/middleware/requireEnterprise.js`: new middleware, returns `403` unless `req.user.tier` is `enterprise`; runs after `requireApiKey`, which sets `req.user`
- `src/routes/index.js`: `POST /shorten/batch` now uses `requireApiKey, requireEnterprise`; any future enterprise-only route can use the same two middlewares
- `src/services/url.service.js`: removed the enterprise tier check from `shortenBatch()`