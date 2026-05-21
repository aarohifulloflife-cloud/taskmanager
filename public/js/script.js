// Front-end logic. The UI now talks to the REST API instead of holding
// state in memory. It logs in once to obtain a JWT, then drives CRUD through
// the API. The rendering logic is the same shape as the original.

const API = "";
let token = null;

const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const counter = document.getElementById("counter");

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function login() {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "demo", password: "demo123" }),
  });
  const data = await res.json();
  token = data.token;
}

async function fetchTasks() {
  const res = await fetch(`${API}/api/tasks`, { headers: authHeaders() });
  const data = await res.json();
  return data.tasks;
}

function render(tasks) {
  taskList.innerHTML = "";
  tasks.forEach((task) => {
    const li = document.createElement("li");
    if (task.completed) li.classList.add("completed");

    const span = document.createElement("span");
    span.textContent = task.text;
    span.addEventListener("click", async () => {
      await fetch(`${API}/api/tasks/${task.id}/toggle`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      refresh();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete-btn";
    deleteBtn.addEventListener("click", async () => {
      await fetch(`${API}/api/tasks/${task.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      refresh();
    });

    li.appendChild(span);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });

  counter.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;
}

async function refresh() {
  const tasks = await fetchTasks();
  render(tasks);
}

addBtn.addEventListener("click", async () => {
  const text = taskInput.value;
  if (!text || text.trim() === "") return;
  await fetch(`${API}/api/tasks`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ text }),
  });
  taskInput.value = "";
  refresh();
});

taskInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addBtn.click();
});

(async function init() {
  await login();
  refresh();
})();
