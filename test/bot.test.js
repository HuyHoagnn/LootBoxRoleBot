const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

// Chạy test trên bản copy để không đụng dữ liệu thật
const dataFile = path.join(__dirname, "../data/users.json");
const backupFile = path.join(__dirname, "../data/users.test-snapshot.json");

test.before(() => {
    if (fs.existsSync(dataFile)) fs.copyFileSync(dataFile, backupFile);
});

test.after(() => {
    if (fs.existsSync(backupFile)) {
        fs.copyFileSync(backupFile, dataFile);
        fs.unlinkSync(backupFile);
    }
});

// ── config ──
test("config: các hằng số hợp lệ", () => {
    const config = require("../config");
    assert.ok(Number.isInteger(config.SECONDS_PER_CODE) && config.SECONDS_PER_CODE > 0);
    assert.strictEqual(typeof config.TEST_MODE, "boolean");
});

// ── roles ──
test("roles: 10 role, đủ id/name/chance", () => {
    const roles = require("../utils/roles");
    assert.strictEqual(roles.length, 10);
    for (const r of roles) {
        assert.ok(r.id && r.name && r.chance > 0);
    }
});

// ── roleManager ──
test("randomRole: không trả role đã sở hữu", () => {
    const roles = require("../utils/roles");
    const { randomRole } = require("../utils/roleManager");
    const ownedIds = roles.slice(0, 9).map(r => r.id);
    for (let i = 0; i < 50; i++) {
        const reward = randomRole(ownedIds);
        assert.strictEqual(reward.id, roles[9].id);
    }
});

test("randomRole: trả null khi đủ bộ", () => {
    const roles = require("../utils/roles");
    const { randomRole } = require("../utils/roleManager");
    assert.strictEqual(randomRole(roles.map(r => r.id)), null);
});

// ── codeGenerator ──
test("generateCode: đúng định dạng XXXX-XXXX", () => {
    const generateCode = require("../utils/codeGenerator");
    for (let i = 0; i < 20; i++) {
        assert.match(generateCode(), /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    }
});

// ── database + redeemService ──
test("redeemService: findCode / markCodeUsed / addRole", () => {
    const { loadUsers, saveUsers } = require("../utils/database");
    const { findCode, markCodeUsed, addRole } = require("../utils/redeemService");

    const users = loadUsers();
    users["test-user"] = {
        voiceTime: 100,
        claimedSeconds: 0,
        codes: [{ code: "TEST-CODE", used: false, createdAt: Date.now(), usedAt: null }],
        roles: [],
    };
    saveUsers(users);

    // findCode truyền ownerId (code cá nhân): chỉ tìm trong kho của user đó
    const found = findCode("TEST-CODE", "test-user");
    assert.ok(found);
    assert.strictEqual(found.ownerId, "test-user");
    // user khác không tìm thấy code của test-user
    assert.strictEqual(findCode("TEST-CODE", "other-user"), null);
    // fallback không truyền owner vẫn tìm thấy
    assert.ok(findCode("TEST-CODE"));
    assert.strictEqual(findCode("KHONG-TONTAI"), null);

    assert.strictEqual(markCodeUsed("test-user", "TEST-CODE"), true);
    assert.strictEqual(findCode("TEST-CODE").code.used, true);

    addRole("test-user", { id: "r1", name: "Role Test" });
    const after = loadUsers()["test-user"];
    assert.strictEqual(after.roles.length, 1);
    assert.strictEqual(after.roles[0].id, "r1");
});

// ── panelViews ──
test("panelViews: mọi view trả về embeds + components", async () => {
    const v = require("../ui/panelViews");

    const home = v.homeView();
    assert.strictEqual(home.embeds.length, 1);
    assert.strictEqual(home.components.length, 2);

    // profileView giờ nhận interaction (async) để lấy tên + avatar + gửi DM.
    // Dùng object giả lập có user.createDM trả reject (user tắt DM).
    const fakeInteraction = {
        user: {
            id: "user-khong-ton-tai",
            username: "TestUser",
            globalName: "Test User",
            displayAvatarURL: () => "https://cdn.discordapp.com/avatar.png",
            createDM: async () => { throw new Error("dm blocked"); },
        },
    };
    const prof = await v.profileView(fakeInteraction);
    // title chứa tên, có thumbnail, có field "Tổng thời gian Voice"
    assert.ok(prof.embeds[0].data.title.includes("Test User"));
    assert.ok(prof.embeds[0].data.thumbnail.url.includes("avatar.png"));
    const names = prof.embeds[0].data.fields.map(f => f.name);
    assert.ok(names.includes("⏰ Tổng thời gian Voice"));
    assert.ok(names.includes("🎟 Code chưa dùng"));
    assert.ok(names.includes("✅ Code đã dùng"));
    assert.ok(names.includes("🌈 Role đã mở"));

    const col = v.collectionView("user-khong-ton-tai");
    assert.ok(col.embeds[0].data.description.includes("0 / 10"));

    const claim = v.claimView("user-khong-ton-tai");
    assert.ok(claim.embeds.length === 1);

    const help = v.helpView();
    assert.ok(help.embeds[0].data.title.includes("Hướng dẫn"));
    assert.ok(help.embeds[0].data.description.includes("BƯỚC 1"));
    assert.ok(help.embeds[0].data.description.includes("/panel"));
});

test("claimView: TEST_MODE=false thì user 0 phút không có nút nhận", () => {
    const { TEST_MODE } = require("../config");
    const v = require("../ui/panelViews");
    const claim = v.claimView("user-khong-ton-tai");
    // 2 hàng nav khi không đủ code, 3 hàng khi có nút nhận
    assert.strictEqual(claim.components.length, TEST_MODE ? 3 : 2);
});

// ── commands ──
test("commands: load sạch, đủ data + execute", () => {
    const dir = path.join(__dirname, "../commands");
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith(".js"))) {
        const cmd = require(path.join(dir, file));
        assert.ok(cmd.data?.name, `${file} thiếu data.name`);
        assert.strictEqual(typeof cmd.execute, "function", `${file} thiếu execute`);
    }
});

// ── githubStore ──
test("githubStore: ENABLED=false thì no-op, không throw", () => {
    // Biến DATA_SYNC_ENABLED không đặt → coi như dev local
    delete process.env.DATA_SYNC_ENABLED;
    const store = require("../utils/githubStore");
    assert.strictEqual(store.ENABLED, false);
    // schedulePush không throw dù file không tồn tại
    assert.doesNotThrow(() => store.schedulePush());
});

test("profileView: DM thành công → báo đã gửi, không hiện code trên panel", async () => {
    const v = require("../ui/panelViews");
    let sent = null;
    const fakeInteraction = {
        user: {
            id: "dm-ok-user",
            username: "DmUser",
            globalName: "DM User",
            displayAvatarURL: () => "https://cdn.discordapp.com/a.png",
            createDM: async () => ({
                send: async (payload) => { sent = payload; },
            }),
        },
    };
    // Không có data → không code → vẫn không crash, title có tên
    const prof = await v.profileView(fakeInteraction);
    assert.ok(prof.embeds[0].data.title.includes("DM User"));
    // Không có code nên sent vẫn null (đúng, không gửi DM rỗng)
    assert.strictEqual(sent, null);
});

// ── handlers ──
test("handlers: require sạch", () => {
    assert.strictEqual(typeof require("../handlers/buttonHandler"), "function");
    assert.strictEqual(typeof require("../handlers/modalHandler"), "function");
});
