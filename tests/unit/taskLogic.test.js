const {
  addTask,
  deleteTask,
  toggleTask,
  countTasks,
} = require("../../src/lib/taskLogic");

describe("addTask", () => {
  test("adds a trimmed task", () => {
    const result = addTask([], "  Buy milk  ");
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Buy milk");
    expect(result[0].completed).toBe(false);
  });

  test("ignores empty or whitespace-only text", () => {
    expect(addTask([], "")).toHaveLength(0);
    expect(addTask([], "   ")).toHaveLength(0);
  });

  test("does not mutate the original array", () => {
    const original = [];
    addTask(original, "x");
    expect(original).toHaveLength(0);
  });

  test("uses a custom id generator when provided", () => {
    const result = addTask([], "x", () => 42);
    expect(result[0].id).toBe(42);
  });
});

describe("deleteTask", () => {
  test("removes the task with the matching id", () => {
    const tasks = [{ id: 1, text: "a", completed: false }];
    expect(deleteTask(tasks, 1)).toHaveLength(0);
  });

  test("leaves other tasks untouched", () => {
    const tasks = [
      { id: 1, text: "a", completed: false },
      { id: 2, text: "b", completed: false },
    ];
    const result = deleteTask(tasks, 1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });
});

describe("toggleTask", () => {
  test("flips completion of the matching task only", () => {
    const tasks = [
      { id: 1, text: "a", completed: false },
      { id: 2, text: "b", completed: false },
    ];
    const result = toggleTask(tasks, 1);
    expect(result[0].completed).toBe(true);
    expect(result[1].completed).toBe(false);
  });
});

describe("countTasks", () => {
  test("returns the number of tasks", () => {
    expect(countTasks([])).toBe(0);
    expect(countTasks([{ id: 1 }, { id: 2 }])).toBe(2);
  });
});
