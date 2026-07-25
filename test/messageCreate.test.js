const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("path");

// Cô lập file data riêng để tránh race với test khác (EBUSY trên Windows)
const isoFile = path.join(__dirname, "../data/users.msg-isolated.json");
process.env.USERS_FILE = isoFile;
if (fs.existsSync(isoFile)) fs.unlinkSync(isoFile);

const dataFile = path.join(__dirname, "../data/users.json");
const backupFile = path.join(__dirname, "../data/users.msg-snapshot.json");

test.before(() => {
    if (fs.existsSync(dataFile)) fs.copyFileSync(dataFile, backupFile);
});
test.after(() => {
    if (fs.existsSync(backupFile)) {
        fs.copyFileSync(backupFile, dataFile);
        fs.unlinkSync(backupFile);
    }
    if (fs.existsSync(isoFile)) fs.unlinkSync(isoFile);
});

// Fake message có thể edit (để test animation)
function fakeMessage(content, userId, withAvatar = true) {
    const sent = { edits: [], content: null };
    const fakeRole = { id: "any-role" };
    const member = {
        id: userId,
        guild: { id: "g1", roles: { cache: { get: () => fakeRole } } },
        roles: { add: async () => {} },
    };
    return {
        content,
        author: {
            id: userId,
            username: "chatter",
            displayAvatarURL: withAvatar ? () => "https://cdn.discordapp.com/avatar.png" : undefined,
            createDM: async () => ({ send: async () => {} }),
        },
        member,
        guild: { id: "g1" },
        reply: async (payload) => {
            sent.content = payload;
            return {
                edit: async (p) => { sent.edits.push(p); return p; },
            };
        },
    };
}

// Chạy nối tiếp (concurrency:1) để tránh 2 test ghi chung isoFile cùng lúc
test.describe("messageCreate", { concurrency: 1 }, () => {

    test("nhập code hợp lệ trong chat → đổi role + animation", async () => {
        const { loadUsers, saveUsers } = require("../utils/database");
        const handler = require("../events/messageCreate");

        const UID = "msg-user";
        const users = loadUsers();
        users[UID] = {
            voiceTime: 100000,
            claimedSeconds: 0,
            joinAt: null,
            codes: [{ code: "CHAT-2349", used: false, createdAt: Date.now(), usedAt: null }],
            roles: [],
        };
        saveUsers(users);

        const msg = fakeMessage("CHAT-2349", UID);
        await handler.execute(msg);

        const after = loadUsers()[UID];
        assert.strictEqual(after.codes[0].used, true, "code phải được đánh dấu used");
        assert.strictEqual(after.roles.length, 1, "phải có 1 role được thêm");
    });

    test("code sai format → bỏ qua (không reply)", async () => {
        const handler = require("../events/messageCreate");
        let replied = false;
        const msg = {
            content: "xin chào mọi người",
            author: { id: "x", bot: false, createDM: async () => ({}) },
            member: { guild: {} },
            guild: { id: "g1" },
            reply: async () => { replied = true; return { edit: async () => {} }; },
        };
        await handler.execute(msg);
        assert.strictEqual(replied, false, "tin nhắn thường không được xử lý");
    });

    test("code không thuộc user → báo lỗi", async () => {
        const { loadUsers, saveUsers } = require("../utils/database");
        const handler = require("../events/messageCreate");

        const users = loadUsers();
        users["other-msg-user"] = {
            voiceTime: 0, claimedSeconds: 0, joinAt: null,
            codes: [{ code: "KWN2-9999", used: false, createdAt: Date.now(), usedAt: null }],
            roles: [],
        };
        saveUsers(users);

        let content = "";
        const msg = {
            content: "KWN2-9999",
            author: { id: "stranger", username: "s", createDM: async () => ({}) },
            member: { guild: {} },
            guild: { id: "g1" },
            reply: async (p) => { content = p.content; return { edit: async () => {} }; },
        };
        await handler.execute(msg);
        assert.match(content, /không tồn tại|không thuộc/, "phải báo code không thuộc về bạn");
    });

    test("tin nhắn bình thường có dấu cách → bỏ qua (không reply)", async () => {
        const handler = require("../events/messageCreate");
        let replied = false;
        const msg = {
            content: "anh coi r a",
            author: { id: "x", bot: false, createDM: async () => ({}) },
            member: { guild: {} },
            guild: { id: "g1" },
            reply: async () => { replied = true; return { edit: async () => {} }; },
        };
        await handler.execute(msg);
        assert.strictEqual(replied, false, "tin nhắn thường không được xử lý");
    });

    test("8 ký tự liền (copy thiếu gạch từ DM) → vẫn được coi là code", async () => {
        const { isLikelyCode } = require("../utils/redeemService");
        assert.strictEqual(isLikelyCode("ABCD2349"), true, "8 ký tự liền phải là code");
        assert.strictEqual(isLikelyCode("ABCD-2349"), true, "XXXX-XXXX phải là code");
        assert.strictEqual(isLikelyCode("anh coi r a"), false, "tin nhắn thường không phải code");
        assert.strictEqual(isLikelyCode("hello world"), false, "có dấu cách không phải code");
    });

    test("chat bình thường không bị nhận nhầm thành code", async () => {
        const { isLikelyCode } = require("../utils/redeemService");
        // Các chuỗi chat thường hay gặp — tất cả phải là false
        // (chỉ bảng CODE_CHARS ABCDEFGHJKLMNPQRSTUVWXYZ23456789 mới hợp lệ)
        for (const t of [
            "camonanh",      // 8 chữ thường
            "chaudem1",      // chứa số 1 (không nằm trong bảng code)
            "xinchaocacban", // 12 ký tự
            "hello",         // ngắn
            "anh coi r a",   // có dấu cách
            "CamonAnh",      // chữ thường + hoa, không nằm bảng
            "cảm ơn anh",     // có dấu tiếng Việt
            "DEPOXY01",      // chứa O và 0 (bị loại khỏi bảng code)
            "OKLA-1234",     // chứa O,K,A không nằm đúng (O bị loại)
            "test1234",      // chứa t,e,s (thường, không nằm bảng)
        ]) {
            assert.strictEqual(isLikelyCode(t), false, `phải bỏ qua tin nhắn thường: "${t}"`);
        }
        // Code thật (từ bảng CODE_CHARS) vẫn nhận đúng
        assert.strictEqual(isLikelyCode("K7P2-MQ9X"), true, "code thật phải được nhận");
        assert.strictEqual(isLikelyCode("K7P2MQ9X"), true, "code thật 8 ký tự liền phải được nhận");
    });

});
