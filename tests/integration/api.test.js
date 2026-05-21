const request = require("supertest");
const app = require("../../src/app");
const store = require("../../src/store");

let token;

beforeAll(async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ username: "demo", password: "demo123" });
  token = res.body.token;
});

beforeEach(async () => {
  await store.reset();
});

describe("auth gating", () => {
  test("rejects task access without a token", async () => {
    await request(app).get("/api/tasks").expect(401);
  });

  test("rejects invalid credentials", async () => {
    await request(app)
      .post("/api/auth/login")
      .send({ username: "demo", password: "wrong" })
      .expect(401);
  });

  test("issues a token for valid credentials", () => {
    expect(typeof token).toBe("string");
  });
});

describe("health and metrics", () => {
  test("/health returns ok", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.body.status).toBe("ok");
  });

  test("/metrics exposes prometheus data", async () => {
    const res = await request(app).get("/metrics").expect(200);
    expect(res.text).toContain("tasks_total");
  });
});

describe("task CRUD (authenticated)", () => {
  const auth = () => ({ Authorization: `Bearer ${token}` });

  test("creates a task", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set(auth())
      .send({ text: "Write report" })
      .expect(201);
    expect(res.body.text).toBe("Write report");
  });

  test("rejects empty task text", async () => {
    await request(app)
      .post("/api/tasks")
      .set(auth())
      .send({ text: "   " })
      .expect(400);
  });

  test("lists tasks", async () => {
    await request(app).post("/api/tasks").set(auth()).send({ text: "A" });
    const res = await request(app).get("/api/tasks").set(auth()).expect(200);
    expect(res.body.count).toBe(1);
  });

  test("toggles a task", async () => {
    const created = await request(app)
      .post("/api/tasks")
      .set(auth())
      .send({ text: "Toggle me" });
    const res = await request(app)
      .patch(`/api/tasks/${created.body.id}/toggle`)
      .set(auth())
      .expect(200);
    expect(res.body.completed).toBe(true);
  });

  test("deletes a task", async () => {
    const created = await request(app)
      .post("/api/tasks")
      .set(auth())
      .send({ text: "Delete me" });
    await request(app)
      .delete(`/api/tasks/${created.body.id}`)
      .set(auth())
      .expect(204);
    const res = await request(app).get("/api/tasks").set(auth());
    expect(res.body.count).toBe(0);
  });

  test("returns 404 toggling a missing task", async () => {
    await request(app).patch("/api/tasks/999/toggle").set(auth()).expect(404);
  });
});
