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
For small user base we can create an end point /latest , that can be called from dashboad by the user , user can see latest web url that has been shortend . 

We can reddis cache for better user expirience and faster response

suppose one user call that api and got the res then that resposne can be  stored in cache , and multiple can access the same result and avoid the db call latency.

## Q2

 > [Q2] When an empty URL is sent in the request, return an error message along with an appropriate http status code. Add this as a test case as well.

Already handled that condition if url not present , send res 400 
(400)

Added the test case .



[Q3] When the /redirect endpoint is called, increment a counter in a new column in the url_shortener table. This will let us know how many times a particular short code has been viewed. In yet another column, keep a track of last access time for each URL as well, i.e. set it to current timestamp whenever the short code is accessed via the /redirect endpoint. Write a SQL query to show the 10 most popular short codes, i.e. the top URLs with the most number of clicks. Break ties by last_accessed_at.



Added column 
count.png

When user redirect , increasing the count by 1 each time 
last_accessed_at - timestamp when any user visit any url

SELECT short_code, click_count, last_accessed_at FROM url_shortner ORDER BY click_count DESC, last_accessed_at DESC LIMIT 10;

desc from click_count  will return 10 most accessed url with the time when last visited

desc with last_accessed_at will break ties