const { loadUsers, saveUsers } = require("./database");

// Bảng ký tự dùng để SINH code (giống codeGenerator.js).
// Đặc biệt: KHÔNG chứa I, O, 0, 1 → dùng để phân biệt code thật với chat bình thường.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

// Chỉ coi là "có vẻ là code" khi khớp CHÍNH XÁC bảng ký tự sinh code (CODE_CHARS):
//   - Có dấu gạch: XXXX-XXXX (mỗi phần 4 ký tự thuộc CODE_CHARS)
//   - HOẶC 8 ký tự liền thuộc CODE_CHARS (hỗ trợ copy thiếu gạch từ DM)
// Chat bình thường ("camonanh", "chaudem1", "anh coi r a") chứa chữ thường / 0 / 1 / o / i
// hoặc dấu cách → KHÔNG khớp → bot không phản ứng.
function isLikelyCode(raw) {
    const s = (raw || "").trim().toUpperCase();
    if (/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(s)) return true;
    if (/^[A-HJ-NP-Z2-9]{8}$/.test(s)) return true; // 8 ký tự liền, không dấu cách
    return false;
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
    isLikelyCode,
    CODE_CHARS,
};
