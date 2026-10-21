// Simple in-memory task store.
let tasks = [];
let nextId = 1;

const PRIORITIES = ['low', 'medium', 'high'];

function reset(seed = true) {
  tasks = [];
  nextId = 1;
  if (seed) {
    create({ title: 'Set up GitHub repository', priority: 'high' });
    create({ title: 'Configure Jenkins pipeline', priority: 'high' });
    create({ title: 'Write project README', priority: 'low' });
  }
}

function list(status = 'all') {
  if (status === 'active') return tasks.filter((t) => !t.done);
  if (status === 'done') return tasks.filter((t) => t.done);
  return tasks.slice();
}

function find(id) {
  return tasks.find((t) => t.id === id);
}

function create({ title, priority = 'medium' }) {
  const task = {
    id: nextId++,
    title,
    priority,
    done: false,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  return task;
}

function remove(id) {
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  tasks.splice(idx, 1);
  return true;
}

function stats() {
  const done = tasks.filter((t) => t.done).length;
  return { total: tasks.length, done, active: tasks.length - done };
}

reset(true);

module.exports = { PRIORITIES, reset, list, find, create, remove, stats };
