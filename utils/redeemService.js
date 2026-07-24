const { loadUsers, saveUsers } = require("./database");

// Chuẩn hóa code: bỏ khoảng trắng, hoa thường, đảm bảo định dạng XXXX-XXXX.
// Xử lý trường hợp user copy thiếu/thon dấu gạch ngang (do wrap line trong DM).
function normalizeCode(raw) {
    let s = (raw || "").trim().toUpperCase().replace(/\s+/g, "");
    // Nếu thiếu dấu gạch ngang mà đủ 8 ký tự → chèn dấu - ở giữa
    if (!s.includes("-") && s.length === 8) {
        s = s.slice(0, 4) + "-" + s.slice(4);
    }
    return s;
}

function findCode(code, ownerId) {

    code = normalizeCode(code);
    const users = loadUsers();

    // Nếu biết chủ sở hữu (người đang đổi) → chỉ tìm trong kho code của họ.
    // Code là CÁ NHÂN: user A không thể dùng code của user B.
    if (ownerId) {
        const user = users[ownerId];
        if (!user) return null;
        const found = user.codes?.find(c => normalizeCode(c.code) === code);
        if (!found) return null;
        return { ownerId, user, code: found, users };
    }

    // Fallback (không truyền ownerId): tìm toàn hệ thống
    for (const userId in users) {

        const user = users[userId];

        const found = user.codes?.find(c => normalizeCode(c.code) === code);

        if (found) {
            return {
                ownerId: userId,
                user,
                code: found,
                users,
            };
        }

    }

    return null;

}

function markCodeUsed(ownerId, codeText) {

    codeText = normalizeCode(codeText);
    const users = loadUsers();
    const user = users[ownerId];
    if (!user) return false;

    const code = user.codes.find(c => normalizeCode(c.code) === codeText);
    if (!code) return false;

    code.used = true;
    code.usedAt = Date.now();

    saveUsers(users);
    return true;

}

function addRole(ownerId, role) {

    const users = loadUsers();
    const user = users[ownerId];
    if (!user) return;

    user.roles ??= [];
    user.roles.push({
        id: role.id,
        name: role.name,
        time: Date.now(),
    });

    saveUsers(users);

}

module.exports = {
    findCode,
    markCodeUsed,
    addRole,
    normalizeCode,
};
