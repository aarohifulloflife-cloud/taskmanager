// Pure functions — easy to unit test.
// These are the original front-end functions, kept intact so the existing
// unit tests still pass. The only change is an OPTIONAL `idFn` argument on
// addTask (defaults to Date.now()), which lets the server inject a
// collision-safe id without changing the original call signature.

function addTask(tasks, text, idFn = () => Date.now()) {
  if (!text || text.trim() === "") {
    return tasks;
  }
  return [...tasks, { id: idFn(), text: text.trim(), completed: false }];
}

function deleteTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

function toggleTask(tasks, id) {
  return tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );
}

function countTasks(tasks) {
  return tasks.length;
}

module.exports = { addTask, deleteTask, toggleTask, countTasks };
