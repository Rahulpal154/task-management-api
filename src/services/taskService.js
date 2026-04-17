const { v4: uuidv4 } = require('uuid');

let tasks = [];

const getAll = () => [...tasks];

const findById = (id) => tasks.find((t) => t.id === id);

// BUG FIX 2: was t.status.includes(status) which treated the status string as a
// substring container, so querying status="do" would match tasks with status="todo".
// Correct behaviour is a strict equality check.
const getByStatus = (status) => tasks.filter((t) => t.status === status);

// BUG FIX 1: offset was calculated as page * limit, which meant page=1 skipped
// the first `limit` items entirely (e.g. page=1, limit=10 → offset=10).
// The correct formula is (page - 1) * limit so page=1 starts at index 0.
const getPaginated = (page, limit) => {
  const offset = (page - 1) * limit;
  return tasks.slice(offset, offset + limit);
};

const getStats = () => {
  const now = new Date();
  const counts = { todo: 0, in_progress: 0, done: 0 };
  let overdue = 0;

  tasks.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status]++;
    if (t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now) {
      overdue++;
    }
  });

  return { ...counts, overdue };
};

const create = ({
  title,
  description = '',
  status = 'todo',
  priority = 'medium',
  dueDate = null,
}) => {
  const task = {
    id: uuidv4(),
    title,
    description,
    status,
    priority,
    dueDate,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  return task;
};

const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updated = { ...tasks[index], ...fields };
  tasks[index] = updated;
  return updated;
};

const remove = (id) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;

  tasks.splice(index, 1);
  return true;
};

// BUG FIX 3: the original function hard-coded priority: 'medium', silently
// discarding the task's real priority (e.g. a 'high' priority task became
// 'medium' after completing it). Removed that line so priority is preserved.
const completeTask = (id) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };

  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;
  return updated;
};

// NEW FEATURE: store an assignee name on the task.
// Design decisions:
//   - Any non-empty string is a valid assignee name.
//   - Re-assigning is allowed (overwrites the previous value).
//   - Validation (non-empty string) is enforced in the route layer, not here,
//     to keep service functions simple and consistent with the rest of the codebase.
const assignTask = (id, assignee) => {
  const task = findById(id);
  if (!task) return null;

  const updated = { ...task, assignee };
  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;
  return updated;
};

const _reset = () => {
  tasks = [];
};

module.exports = {
  getAll,
  findById,
  getByStatus,
  getPaginated,
  getStats,
  create,
  update,
  remove,
  completeTask,
  assignTask,
  _reset,
};