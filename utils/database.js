const fs = require("fs");
const path = require("path");
const { schedulePush } = require("./githubStore");

// Cho phép test cô lập dùng file riêng qua env USERS_FILE
const filePath = process.env.USERS_FILE
    ? path.resolve(process.env.USERS_FILE)
    : path.join(__dirname, "../data/users.json");

function loadUsers() {
    if (!fs.existsSync(filePath)) return {};

    try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        // Chống dữ liệu hỏng: phải là object thuần, không phải array
        if (!data || typeof data !== "object" || Array.isArray(data)) return {};
        return data;
    } catch {
        return {};
    }
}

function saveUsers(users) {
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
    // Đồng bộ lên GitHub (nếu DATA_SYNC_ENABLED=true).
    // Không await → không làm chậm bot; được debounce 15s trong githubStore.
    schedulePush();
}

module.exports = {
    loadUsers,
    saveUsers,
};
