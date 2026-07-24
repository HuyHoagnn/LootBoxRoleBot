const test = require("node:test");
const assert = require("node:assert");

// ── Test githubStore với GitHub API giả lập (mock global.fetch) ──
// Mục tiêu: chứng minh githubPut / githubGet đúng định dạng, không gọi mạng thật.

test("githubStore.githubGet: parse base64 JSON, trả {content, sha}", async () => {
    const payload = { "123": { voiceTime: 10 } };
    const b64 = Buffer.from(JSON.stringify(payload)).toString("base64");

    global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ sha: "sha-xyz", content: b64 }),
    });

    process.env.GITHUB_TOKEN = "t";
    process.env.GITHUB_REPO = "owner/repo";
    delete require.cache[require.resolve("../utils/githubStore")];
    const { githubGet } = require("../utils/githubStore");

    const r = await githubGet();
    assert.strictEqual(r.sha, "sha-xyz");
    assert.deepStrictEqual(JSON.parse(r.content), payload);
});

test("githubStore.githubPut: gửi PUT đúng headers + body base64", async () => {
    let captured = null;
    global.fetch = async (url, opts) => {
        if (opts && opts.method === "PUT") {
            captured = { url, opts };
            return { ok: true, status: 200 };
        }
        return { ok: true, json: async () => ({}) };
    };

    process.env.GITHUB_TOKEN = "t";
    process.env.GITHUB_REPO = "owner/repo";
    delete require.cache[require.resolve("../utils/githubStore")];
    const { githubPut } = require("../utils/githubStore");

    const content = JSON.stringify({ a: 1 });
    const ok = await githubPut(content, "sha-1");

    assert.strictEqual(ok, true);
    assert.ok(captured.url.includes("/contents/data/users.json"));
    assert.strictEqual(captured.opts.headers.Authorization, "Bearer t");
    const body = JSON.parse(captured.opts.body);
    assert.strictEqual(Buffer.from(body.content, "base64").toString("utf8"), content);
    assert.strictEqual(body.sha, "sha-1");

    // Dọn env
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPO;
    delete require.cache[require.resolve("../utils/githubStore")];
});

test("githubStore: thiếu TOKEN/REPO thì githubPut=false, githubGet=null", async () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPO;
    delete require.cache[require.resolve("../utils/githubStore")];
    const { githubPut, githubGet } = require("../utils/githubStore");

    assert.strictEqual(await githubPut("x", null), false);
    assert.strictEqual(await githubGet(), null);
});
