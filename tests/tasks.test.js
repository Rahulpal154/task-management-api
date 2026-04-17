const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// ─────────────────────────────────────────────
// POST /tasks
// ─────────────────────────────────────────────
describe('POST /tasks', () => {
  it('creates a task with valid data', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Write tests', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Write tests');
    expect(res.body.priority).toBe('high');
    expect(res.body.status).toBe('todo');
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.completedAt).toBeNull();
  });

  it('creates a task with only a title — defaults fill in', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Minimal task' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('todo');
    expect(res.body.priority).toBe('medium');
    expect(res.body.description).toBe('');
    expect(res.body.dueDate).toBeNull();
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({ priority: 'low' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when title is an empty string', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid status value', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Test', status: 'pending' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid priority value', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Test', priority: 'urgent' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for a non-parseable dueDate', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Test', dueDate: 'tomorrow' });
    expect(res.status).toBe(400);
  });

  it('accepts a valid ISO dueDate', async () => {
    const due = new Date(Date.now() + 86400000).toISOString();
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'With due date', dueDate: due });
    expect(res.status).toBe(201);
    expect(res.body.dueDate).toBe(due);
  });
});

// ─────────────────────────────────────────────
// GET /tasks
// ─────────────────────────────────────────────
describe('GET /tasks', () => {
  beforeEach(async () => {
    await request(app).post('/tasks').send({ title: 'Task A', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'Task B', status: 'in_progress' });
    await request(app).post('/tasks').send({ title: 'Task C', status: 'done' });
  });

  it('returns all tasks', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
  });

  it('returns empty array when no tasks exist', async () => {
    taskService._reset();
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('filters by status=todo returns only todo tasks', async () => {
    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].status).toBe('todo');
  });

  it('filters by status=in_progress returns only in_progress tasks', async () => {
    const res = await request(app).get('/tasks?status=in_progress');
    expect(res.status).toBe(200);
    expect(res.body.every((t) => t.status === 'in_progress')).toBe(true);
  });

  // BUG TEST: getByStatus uses .includes() instead of ===
  // "todo".includes("do") === true, so "do" would wrongly match "todo"
  it('status filter uses exact match — partial strings return nothing', async () => {
    const res = await request(app).get('/tasks?status=do');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0); // "do" must NOT match "todo" or "done"
  });

  // BUG TEST: getPaginated offset is page * limit instead of (page-1) * limit
  // page=1 should return items 0-1, not items 10-19
  it('pagination page=1 returns the FIRST items (offset bug check)', async () => {
    const allRes = await request(app).get('/tasks');
    const pagedRes = await request(app).get('/tasks?page=1&limit=2');

    expect(pagedRes.status).toBe(200);
    expect(pagedRes.body.length).toBe(2);
    expect(pagedRes.body[0].id).toBe(allRes.body[0].id); // must start from index 0
  });

  it('pagination page=2 returns the remaining item', async () => {
    const res = await request(app).get('/tasks?page=2&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('pagination page=3 beyond total returns empty array', async () => {
    const res = await request(app).get('/tasks?page=3&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });
});

// ─────────────────────────────────────────────
// GET /tasks/stats
// ─────────────────────────────────────────────
describe('GET /tasks/stats', () => {
  it('returns zero counts on empty store', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(0);
    expect(res.body.in_progress).toBe(0);
    expect(res.body.done).toBe(0);
    expect(res.body.overdue).toBe(0);
  });

  it('counts tasks correctly per status', async () => {
    await request(app).post('/tasks').send({ title: 'T1', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'T2', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'T3', status: 'in_progress' });
    await request(app).post('/tasks').send({ title: 'T4', status: 'done' });

    const res = await request(app).get('/tasks/stats');
    expect(res.body.todo).toBe(2);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
  });

  it('counts overdue non-done tasks', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    await request(app).post('/tasks').send({ title: 'Overdue', dueDate: pastDate });
    await request(app).post('/tasks').send({ title: 'Not yet', dueDate: futureDate });

    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(1);
  });

  it('does not count done tasks as overdue even if past due', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    await request(app)
      .post('/tasks')
      .send({ title: 'Done late', dueDate: pastDate, status: 'done' });

    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(0);
  });
});

// ─────────────────────────────────────────────
// PUT /tasks/:id
// ─────────────────────────────────────────────
describe('PUT /tasks/:id', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Original title', priority: 'low' });
    taskId = res.body.id;
  });

  it('updates title and priority', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ title: 'Updated title', priority: 'high' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated title');
    expect(res.body.priority).toBe('high');
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app)
      .put('/tasks/does-not-exist')
      .send({ title: 'Nope' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid status', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ status: 'invalid_status' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an empty title', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid dueDate', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// DELETE /tasks/:id
// ─────────────────────────────────────────────
describe('DELETE /tasks/:id', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app).post('/tasks').send({ title: 'To delete' });
    taskId = res.body.id;
  });

  it('returns 204 on successful delete', async () => {
    const res = await request(app).delete(`/tasks/${taskId}`);
    expect(res.status).toBe(204);
  });

  it('task is gone after deletion', async () => {
    await request(app).delete(`/tasks/${taskId}`);
    const res = await request(app).get('/tasks');
    expect(res.body.find((t) => t.id === taskId)).toBeUndefined();
  });

  it('returns 404 for a non-existent task', async () => {
    const res = await request(app).delete('/tasks/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('returns 404 on a second delete of the same task', async () => {
    await request(app).delete(`/tasks/${taskId}`);
    const res = await request(app).delete(`/tasks/${taskId}`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────
// PATCH /tasks/:id/complete
// ─────────────────────────────────────────────
describe('PATCH /tasks/:id/complete', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'To complete', priority: 'high' });
    taskId = res.body.id;
  });

  it('marks a task as done and sets completedAt', async () => {
    const res = await request(app).patch(`/tasks/${taskId}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  it('returns 404 for a non-existent task', async () => {
    const res = await request(app).patch('/tasks/does-not-exist/complete');
    expect(res.status).toBe(404);
  });

  // BUG TEST: completeTask() was hard-coding priority: 'medium', discarding original
  it('preserves the original priority when completing (was resetting to medium)', async () => {
    const res = await request(app).patch(`/tasks/${taskId}/complete`);
    expect(res.body.priority).toBe('high'); // must NOT silently become 'medium'
  });
});

// ─────────────────────────────────────────────
// PATCH /tasks/:id/assign  (new feature)
// ─────────────────────────────────────────────
describe('PATCH /tasks/:id/assign', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Task to assign' });
    taskId = res.body.id;
  });

  it('assigns a task to a user and returns the updated task', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
    expect(res.body.id).toBe(taskId);
    expect(res.body.title).toBe('Task to assign');
  });

  it('allows re-assigning an already-assigned task', async () => {
    await request(app).patch(`/tasks/${taskId}/assign`).send({ assignee: 'Alice' });
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'Bob' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  it('returns 404 for a non-existent task', async () => {
    const res = await request(app)
      .patch('/tasks/does-not-exist/assign')
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when assignee field is missing', async () => {
    const res = await request(app).patch(`/tasks/${taskId}/assign`).send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when assignee is an empty string', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when assignee is whitespace only', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when assignee is not a string', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 42 });
    expect(res.status).toBe(400);
  });
});