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
