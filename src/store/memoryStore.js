// In-memory store. Used automatically during tests (NODE_ENV=test) and as a
// fallback when no MONGODB_URI is configured. It is a thin async wrapper around
// the original pure functions, so they remain the tested core of the domain
// logic. The async signatures match the Mongo store so routes stay identical.

const { addTask, deleteTask, toggleTask, countTasks } = require("../lib/taskLogic");

let tasks = [];
let seq = 1; // monotonic counter -> guaranteed-unique ids

const nextId = () => seq++;

async function connect() {} // no-op
async function disconnect() {} // no-op

async function list() {
  return tasks;
}

async function add(text) {
  const before = countTasks(tasks);
  tasks = addTask(tasks, text, nextId);
  if (countTasks(tasks) === before) {
    return null; // blank text was ignored by addTask
  }
  return tasks[tasks.length - 1];
}

async function remove(id) {
  const before = countTasks(tasks);
  tasks = deleteTask(tasks, Number(id));
  return countTasks(tasks) < before;
}

async function toggle(id) {
  const numId = Number(id);
  if (!tasks.some((t) => t.id === numId)) {
    return null;
  }
  tasks = toggleTask(tasks, numId);
  return tasks.find((t) => t.id === numId);
}

async function count() {
  return countTasks(tasks);
}

async function reset() {
  tasks = [];
  seq = 1;
}

module.exports = { connect, disconnect, list, add, remove, toggle, count, reset };
