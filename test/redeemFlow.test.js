const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

// ── Tái hiện lỗi: nhập code thứ 2 trở đi báo "không tồn tại" ──
// Mô phỏng: user nhận 2 code (questrole/claim) rồi redeem từng code.

const dataFile = path.join(__dirname, "../data/users.json");
const backupFile = path.join(__dirname, "../data/users.redeem-snapshot.json");

test.before(() => {
    if (fs.existsSync(dataFile)) fs.copyFileSync(dataFile, backupFile);
});
test.after(() => {
    if (fs.existsSync(backupFile)) {
        fs.copyFileSync(backupFile, dataFile);
        fs.unlinkSync(backupFile);
    }
});

test("redeem: nhập code 1 rồi code 2 đều hợp lệ (không báo mất)", () => {
    const { loadUsers, saveUsers } = require("../utils/database");
    const { findCode, markCodeUsed, addRole } = require("../utils/redeemService");

    const users = loadUsers();
    users["redeem-flow-user"] = {
        voiceTime: 100,
        claimedMinutes: 0,
        joinAt: null,
        codes: [
            { code: "AAAA-1111", used: false, createdAt: Date.now(), usedAt: null },
            { code: "BBBB-2222", used: false, createdAt: Date.now(), usedAt: null },
        ],
        roles: [],
    };
    saveUsers(users);

    // Nhập code 1
    const r1 = findCode("AAAA-1111");
    assert.ok(r1, "code 1 phải tìm thấy");
    assert.strictEqual(r1.code.used, false);
    markCodeUsed("redeem-flow-user", "AAAA-1111");
    addRole("redeem-flow-user", { id: "r1", name: "Role 1" });

    // Nhập code 2
    const r2 = findCode("BBBB-2222");
    assert.ok(r2, "code 2 phải tìm thấy (lỗi nằm ở đây nếu fail)");
    assert.strictEqual(r2.code.used, false);
    markCodeUsed("redeem-flow-user", "BBBB-2222");
    addRole("redeem-flow-user", { id: "r2", name: "Role 2" });

    const after = loadUsers()["redeem-flow-user"];
    assert.strictEqual(after.roles.length, 2, "phải có 2 role");
    assert.strictEqual(after.codes[0].used, true);
    assert.strictEqual(after.codes[1].used, true);
});

test("redeem: findCode normalize hoa/thường + khoảng trắng + thiếu gạch ngang", () => {
    const { loadUsers, saveUsers } = require("../utils/database");
    const { findCode, normalizeCode } = require("../utils/redeemService");

    const users = loadUsers();
    users["redeem-case-user"] = {
        voiceTime: 0, claimedMinutes: 0, joinAt: null,
        codes: [{ code: "ZZZZ-9999", used: false, createdAt: Date.now(), usedAt: null }],
        roles: [],
    };
    saveUsers(users);

    assert.strictEqual(normalizeCode("zzzz-9999"), "ZZZZ-9999");
    assert.strictEqual(normalizeCode(" ZZZZ 9999 "), "ZZZZ-9999", "thiếu gạch ngang + khoảng trắng phải chuẩn hóa");
    assert.ok(findCode("zzzz-9999"), "thường hóa hoa phải tìm thấy");
    assert.ok(findCode(" ZZZZ 9999 "), "thiếu gạch ngang phải tìm thấy");
    assert.strictEqual(findCode("ZZZZ-0000"), null, "code sai phải null");
});
