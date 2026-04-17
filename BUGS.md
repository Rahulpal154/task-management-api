# Bug Report

---

## Bug 1 — Pagination skips the first page entirely

**File:** `task-api/src/services/taskService.js`  
**Function:** `getPaginated`  
**Line (original):** `const offset = page * limit;`

### Expected behaviour
`GET /tasks?page=1&limit=10` should return the first 10 tasks (items at index 0–9).

### What actually happens
The offset is calculated as `page * limit`, so `page=1, limit=10` produces `offset=10`, which skips the first 10 items and returns items 11–20. Page 1 returns nothing if the store has fewer than 11 tasks.

### How I found it
Written a test that compared the first item returned by `GET /tasks` (no pagination) with the first item returned by `GET /tasks?page=1&limit=2`. They were different — the paginated call was starting one page too late.

### Fix
```js
// Before
const offset = page * limit;

// After
const offset = (page - 1) * limit;
```

**This is the bug I fixed.** The corrected `taskService.js` is included in the submission.

---

## Bug 2 — Status filter uses substring match instead of equality

**File:** `task-api/src/services/taskService.js`  
**Function:** `getByStatus`  
**Line (original):** `const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));`

### Expected behaviour
`GET /tasks?status=todo` should return only tasks whose status is exactly `"todo"`.

### What actually happens
`String.prototype.includes` is called on the task's *status* string with the *query* as the needle. So `"todo".includes("do")` is `true` — querying `status=do` accidentally returns all `todo` and `done` tasks. Conversely, querying `status=in` returns every `in_progress` task.

### How I found it
Wrote a test sending `GET /tasks?status=do` expecting an empty array, but received all `todo` tasks.

### Fix
```js
// Before
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));

// After
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

---

## Bug 3 — Completing a task silently resets its priority to "medium"

**File:** `task-api/src/services/taskService.js`  
**Function:** `completeTask`  
**Line (original):** the spread includes `priority: 'medium'`

### Expected behaviour
Marking a task complete should set `status: 'done'` and `completedAt: <timestamp>`. All other fields — including `priority` — should be left unchanged.

### What actually happens
The original code builds the updated task as:
```js
const updated = {
  ...task,
  priority: 'medium',   // ← hard-coded, always overwrites
  status: 'done',
  completedAt: new Date().toISOString(),
};
```
Any task with `priority: 'high'` or `priority: 'low'` silently becomes `'medium'` after being completed. There is no validation or warning — the data is just corrupted.

### How I found it
Wrote a test that created a `high` priority task, called `PATCH /tasks/:id/complete`, and checked that `priority` was still `'high'` in the response. It returned `'medium'` instead.

### Fix
Remove the `priority: 'medium'` line so the spread from `...task` keeps the original value:
```js
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

---

## Additional Considerations

### What I'd test next with more time
- Concurrent writes to the in-memory store (race conditions if the server is ever threaded).
- Behaviour when `dueDate` is exactly the current millisecond (boundary condition for the overdue check).
- Full coverage of the `GET /tasks` combinations (`status` + `page` + `limit` together — currently they are exclusive branches).
- Malformed JSON request bodies (no `Content-Type` header, truncated JSON).

### Anything that surprised me
- `completeTask` resetting priority was the sneakiest bug — it would pass a casual smoke-test because the status and `completedAt` are correct, and priority looks like a "reasonable default". It would only surface when a caller reads priority back from a completed task and acts on it.
- The pagination offset formula is an off-by-one that is very easy to write when thinking in zero-based pages but the API is documented as one-based.

### Questions I'd ask before shipping to production
1. Should `PATCH /tasks/:id/assign` allow re-assignment, or should it return `409 Conflict` if the task already has an assignee?
2. What should happen to `assignee` when a task is updated via `PUT /tasks/:id` — is it a protected field or can it be overwritten?
3. Is the in-memory store intentional for the long term, or is a persistent database planned? If persistent, the `_reset()` helper and test isolation strategy would need to change.
4. Should deleting a task be a soft-delete (archived) rather than a hard-delete, to preserve audit history?