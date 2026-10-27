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


[Q2] When an empty URL is sent in the request, return an error message along with an appropriate http status code. Add this as a test case as well.

Already handled that condition if url not present , send res 400 
(400)


