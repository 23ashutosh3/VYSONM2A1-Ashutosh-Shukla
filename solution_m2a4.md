## Q1

> [Q1] In 1582, we switched from Julian Calendar to Gregorian Calendar. Find out the differences. For the curious, it led to some "missing days" in history as well!

**Major difference i got**

|                          | julian calendor | Gregorian calendar |
| ------------------------ | :-------------: | :----------------: |
| Leap year per 400 years. |       100       |         97         |

The Julian year is 11 minutes too long, and by 1582 that had added up to 10 days. The spring equinox, which sets the date of Easter, had moved from about 21 March to about 11 March. The Church wanted the calendar to match the seasons again.

Countries switched at different times, so the gap grew the longer they waited:

| Country                                  | Year |   Gap   | Jump            |
| ---------------------------------------- | :--: | :-----: | --------------- |
| Catholic Europe                          | 1582 | 10 days | 4 Oct → 15 Oct  |
| Britain and its colonies (incl. America) | 1752 | 11 days | 2 Sep → 14 Sep  |
| Russia                                   | 1918 | 13 days | 31 Jan → 14 Feb |
| Greece                                   | 1923 | 13 days | 15 Feb → 1 Mar  |

---

## Q2

> [Q2] We added a /health checkpoint. Is this change breaking or non-breaking?

No , this is complelety new end point , we are not updating the existing one

---

## Q3

> [Q3] We added the bulk creation feature. Is this change breaking or non-breaking?

For this also we created a new end point `POST /shorten/batch` , that does not effect previous

`POST /shorten` still takes the same body (`{ "url": ... }`) and returns the same response (`201` with `short_code`, `original_url`, `created_at`, `expires_at`).

---

## Q4

> [Q4] We allowed multiple short codes for the same URL. Is this change breaking or non-breaking?

**Its a breaking change**

- **Before:** if you shortened the same URL twice, you got the same code back, with status `200`.
- **After:** you get a new code every time, with status `201`.

Any change that forces users to update their code is a breaking change. it would be non breaking if it was optonal

---

## Q5

> [Q5] We supported setting custom short codes. Is this change breaking or non-breaking?

**Non breaking**

- `custom_code` is an optional field in the `/shorten` request.
- If you don't send it, `/shorten` works exactly as before and creates a random code.
- Only users who choose to send `custom_code` get the new behaviour.

---

## Q6

> [Q6] We allowed edit requests on short codes. Is this change breaking or non-breaking?

**Non braking**

- Editing is done through a new endpoint, `PATCH /shorten/:code`.
- The existing endpoints (`/shorten`, `/redirect`, `DELETE`) work the same as before.
- Only users who want to edit a code call the new endpoint.

---

## Q7

> [Q7] We supported adding a password on the short code while creating and editing them. Is this change breaking or non-breaking?

**Non breaking**

`password` is optional field , If you don't send it, nothing changes: the code is created and redirects exactly as before.

---

## Q8

> [Q8] Let’s say we rewrite the current implementation in a new language, but the API contracts don't change. Is this change breaking or non-breaking?

**Non breaking**

- No change in url
- No change in behaviour

---

## Q9

> [Q9] Explore how does Twitter (X) version its API. What’s the latest version number?

https://api.x.com/1.1/live_pipeline/update_subscriptions

The version is part of the url

Only breaking changes get a new version. A new major version comes out only when X needs a breaking change, and at most once a year

https://x.com/i/api/graphql/q4Npr1-FYRWyXsRzPckwEA/ViewerBadgeCounts?variables=%7B%7D

Non-breaking changes don't change the version number. New endpoints or new optional parameters are added straight to the current version. This is the same breaking / non-breaking idea as Q2–Q8.

figured it out , current version 2 is the latest

v1.1 Legacy, with limited support

---

## Q10

> [Q10] Facebook has a GraphQL API instead of REST. What’s the latest version number?

The latest version of Facebook's API is **v26.0**, released on 29 July 2026.

refer - https://developers.facebook.com/docs/graph-api/changelog/versions/

there is is in the url like twitter

`https://graph.facebook.com/v26.0/...`

---

## Q11

> [Q11] Publish a changelog for your URL shortener using semantic versioning.

Many APIs have been built, so I focused only on the `/shorten` endpoints. Each major version can have many minor and patch versions, for example `1.x.x` and `2.x.x`.

Changelog for the `/shorten` endpoints:

| Version | Date   | Type          | Change                                                         |
| ------- | ------ | ------------- | -------------------------------------------------------------- |
| 1.0.0   | 2 Oct  | first release | `POST /shorten`, `GET /redirect`                               |
| 1.1.0   | 26 Oct | minor         | Added `DELETE /shorten/:code`                                  |
| 2.0.0   | 28 Oct | major         | The same URL now gets a new code; DELETE needs the owner's key |
| 2.1.0   | 29 Oct | minor         | Added `POST /shorten/batch` (enterprise only)                  |
| 2.2.0   | 29 Oct | minor         | Added `PATCH /shorten/:code`                                   |
| 3.0.0   | 30 Oct | major         | Protected routes return `401` for a missing or invalid key     |
| 3.1.1   | 2 Nov  | patch         | The user is fetched only once; each middleware is timed        |

There are two major versions.

**2.0.0:** the same URL now gives a new code. This is a breaking change, because client code that expected the old code back no longer works. Making DELETE owner-only also breaks anyone who used to delete without a key.

**3.0.0:** following the same practice as Twitter (X), a breaking change should get a new major version in the URL (for example `/v3/shorten`), while a non-breaking change keeps the same URL. The change below is breaking.

The API key middleware: DELETE without a key now returns `401` instead of `403` or `404`.

---

## Q12

> [Q12] Write a migration guide for your app when we introduced authentication as a major change.

- **Version 1** - Authentication is not applied
- **version 2** - Recent changes we added `x-api-key` in header , so any who wants to update or delete must own the key

**These migration guide**

Include your assigned key in the HTTP request headers using the `x-api-key` name

- **`401` Unauthorized:** The `x-api-key` header was omitted from a protected request.
- **`403` Forbidden:** The provided `x-api-key` is invalid, expired, or lacks write permissions.

**before v1**

```bash
curl -X DELETE "https://api.example.com/v1/items/101"
```

**After (v2):**

```bash
curl -X DELETE "https://api.example.com/v2/items/101" \
 -H "x-api-key: YOUR_API_KEY"
```

You don't keep v1 forever. The usual steps are the same ones X and Facebook follow:

1. Release `/v2` and publish the migration guide.
2. Mark `/v1` as deprecated and announce an end date. You can also add a `Deprecation` or `Sunset` response header to `/v1` responses.
3. After the end date, remove `/v1` (it returns `410 Gone`, or simply `404`).

---

## Q13

> [Q13] Publish your latest API version on Postman. Create a collection. Add documentation.

This is the collection ,
This is just example , end point won't work because ,api's are not deployed

https://www.postman.com/descent-module-candidate-42180242-s-team/vyson-url-shortener

---

## Q14

> [Q14 BONUS] What happens if the client doesn't specify a version for an API call? Two ways to go about this. Either we can return an error or respond using a “default” version of the API. Which one would you choose and why?

**Use a fixed old version (v1).**

`/shorten` → always acts like `/v1/shorten`

The old app works exactly as before, and nothing breaks.

New apps are told to use `/v2/shorten` directly.

**When an error is fine**

If our API is brand new and nobody uses it yet, you can require a version from the first day, so nobody breaks.

---

This is incorrect if users kept deleting records without a code required in latest version . We must give users short notice, such as 2-3 weeks. After that, we enforce it everywhere.
