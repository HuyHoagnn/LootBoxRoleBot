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
            codes: [{ code: "CHAT-1234", used: false, createdAt: Date.now(), usedAt: null }],
            roles: [],
        };
        saveUsers(users);

        const msg = fakeMessage("CHAT-1234", UID);
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
            codes: [{ code: "OWN2-9999", used: false, createdAt: Date.now(), usedAt: null }],
            roles: [],
        };
        saveUsers(users);

        let content = "";
        const msg = {
            content: "OWN2-9999",
            author: { id: "stranger", username: "s", createDM: async () => ({}) },
            member: { guild: {} },
            guild: { id: "g1" },
            reply: async (p) => { content = p.content; return { edit: async () => {} }; },
        };
        await handler.execute(msg);
        assert.match(content, /không tồn tại|không thuộc/, "phải báo code không thuộc về bạn");
    });

});
