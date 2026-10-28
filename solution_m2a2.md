## Q1

> Write a SQL query to find the last 10 URLs which were shortened. How would you handle the latter case of sharing the analytics real-time?

### Last 10 shortened URLs

```sql
SELECT short_code, original_url, created_at
FROM url_shortner
ORDER BY created_at DESC, id DESC
LIMIT 10;
```

### Sharing the analytics in real time

There are few ways to do it ,

- For small user base we can create an end point `/latest` , that can be called from dashboad by the user , user can see latest web url that has been shortend .
- We can reddis cache for better user expirience and faster response

  suppose one user call that api and got the res then that resposne can be stored in cache , and multiple can access the same result and avoid the db call latency.

---

## Q2

> [Q2] When an empty URL is sent in the request, return an error message along with an appropriate http status code. Add this as a test case as well.

Already handled that condition if url not present , send res 400 **(400)**

Added the test case .

---

## Q3

> [Q3] When the `/redirect` endpoint is called, increment a counter in a new column in the `url_shortener` table. This will let us know how many times a particular short code has been viewed. In yet another column, keep a track of last access time for each URL as well, i.e. set it to current timestamp whenever the short code is accessed via the `/redirect` endpoint. Write a SQL query to show the 10 most popular short codes, i.e. the top URLs with the most number of clicks. Break ties by `last_accessed_at`.

### Added column

![count](screenshots/count.png)

- When user redirect , increasing the count by 1 each time
- `last_accessed_at` - timestamp when any user visit any url

### Query

```sql
SELECT short_code, click_count, last_accessed_at
FROM url_shortner
ORDER BY click_count DESC, last_accessed_at DESC
LIMIT 10;
```

- `desc` from `click_count` will return 10 most accessed url with the time when last visited
- `desc` with `last_accessed_at` will break ties

### Changes maded in api as well

check this below function

src/models/url.sequelize.model.js recordVisit(code) Runs click_count = click_count + 1 and sets last_accessed_at to now in one UPDATE, then returns the row (or null if the code does not exist)

---

## Q4

> [Q4] Allow multiple short codes for the same URL. Write a SQL query to show the top 10 URLs being shortened. The output would contain a list of rows where each row would have a URL along with the number of times it has been shortened.

### Allowing multiple short codes

The table never had a `UNIQUE` constraint on `original_url`; only the API returned the old code for a repeated URL. That check is removed, so every `POST /shorten` now creates a new row with a new short code.

Now after the changes
It will not look into the existing row , It will always create new row
it will always return 201 not sometime 200
### Dummy records
Added sone dummy record into table , it contains 44 record now

### Top 10 URLs being shortened

```sql
SELECT original_url, COUNT(*) AS times_shortened
FROM url_shortner
GROUP BY original_url
ORDER BY times_shortened DESC, original_url
LIMIT 10;
```

- `GROUP BY original_url` puts all short codes of the same URL in one group
- `COUNT(*)` gives how many times that URL has been shortened
- `ORDER BY times_shortened DESC` puts the most shortened first, `original_url` breaks ties

### Solution

![times shortened](screenshots/time_shotand.png)


[Q5] The easiest way to support this is by adding API keys. You’ll need to make a lot of changes in a lot of places for this.


this is the table i created
CREATE TABLE `users` (
  `id`         INTEGER  PRIMARY KEY AUTOINCREMENT,
  `email`      TEXT     NOT NULL UNIQUE,
  `name`       TEXT,
  `api_key`    TEXT     NOT NULL UNIQUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
Added these record
id  email              name   api_key                           created_at         
--  -----------------  -----  --------------------------------  -------------------
1   alice@example.com  Alice  49d42c77fc660ecc494d5655606840d0  2026-10-28 09:42:06
2   bob@example.com    Bob    fa38583164ea4f5d7f8d26dcc7db12c5  2026-10-28 09:42:06
3   carol@example.com  Carol  3352ba44b10df4010df387bc102716c1  2026-10-28 09:42:06
(.venv) ashutosh@Ashutoshs-MacBook-Air VYSONM2A1-Ashutosh-Shukla % 

Added foreign key in url_shortner 

user.sequelize.model.js: new findByApiKey(apiKey), which returns the matching user or null.
url.sequelize.model.js: shorten(originalUrl, userId) now saves user_id.
url.controller.js:
shorten() reads the x-api-key header and passes the user's id.
remove() returns 404 if the code doesn't exist and 403 if the caller isn't the owner, then deletes.


Why not the URL (/shorten?api_key=...)

When the browser leaves the page, the URL can be sent to the next site in the Referer header.So a key in the URL leaks easily, and anyone who sees the URL can use the key.


Showing key URL is not , it can be accessed ,so we can not send it in query


Why not the body ({ "url": "...", "api_key": "..." })

GET and DELETE requests normally have no body, so the key would only work on POST. Our delete endpoint needs the key too.


Why the header (x-api-key: ...)

Headers are the standard place for credentials, like Authorization or x-api-key.
They are usually not logged or cached, and they don't show up in browser history.
The same header works on every endpoint and every method.



[Q6] What are the issues with using API keys?

If key can leak , whoever find that can do some action like create or delete and server can't tell the difference

it never expire so a stolen key work next year also until we change it .

Changing the key is a hassle , user need to update it in app that uses it

There is no password check or login , it proves who sent the request not who the person is

## Q7

> [Q7] List down as many more ways to manage users as you can find.

There are many ways

### Logging in (provide authorisation , know who you are)

There are multiple ways to login

- Using username and password with session
- Login with **JWT token** => after login user give a token , that's use for authorisation purpose
- **Oauth2.0** - login via google , faceboook, linkedIn, amazon etc
- **SSO** : sed by companies: one company login works for every tool, such as Slack, Jira and email. When an employee leaves, one account is disabled everywhere.
- **OTP** with mobile number or email
- **Passkeys**: user logs with a fingerprint

We can make login stronger using

- **2FA / MFA**

### Deciding what user can do (Authorization)

- **RBAC** - ROle based authentication system
- **ABAC** (Attribute-Based Access Control). Rules are based on details such as "the owner can delete" or "only users from India".
- **Scopes / permissions on tokens.** A token says what it may do, such as `urls:create` or `urls:delete`. This fixes the Q6 problem of one key being able to do everything.


[Q8] Add an expiry date field to the URLs. Modify the API to accept optional expiry date during creation. Write tests to verify expired URLs return appropriate error codes.


Expiry date field: url_shortner has a new expires_at column.
Expired links: /redirect returns 410 Gone once a link has expired.
Tests: an expired link returns 410, and a link that hasn't expired yet still redirects.

Files and functions changed:

- `src/models/url.sequelize.model.js`: added `expires_at` column, new `isExpired(row)` and `toIsoText(date)`, `shorten()` now takes `expiresAt`
- `src/controllers/url.controller.js`: new `parseExpiresAt(value)`, `shorten()` reads `expires_at` from body, `redirect()` returns 410 if expired
- `test/integration.test.js`: 2 new tests for expired and not-expired links


[Q9] In the /shorten API endpoint, allow an optional parameter to set the custom code as requested by the user (e.g., user wants https://short.ly/awesome-article). Add tests as well.

Added custom code and test

Files and functions changed:

- `src/models/url.sequelize.model.js`: `shorten()` now takes `customCode`, uses it instead of a random code and returns `null` if it is taken
- `src/controllers/url.controller.js`: `shorten()` reads `custom_code` from body, returns 409 if the code is not available
- `test/integration.test.js`: 2 new tests for a free custom code and a taken one (409)
