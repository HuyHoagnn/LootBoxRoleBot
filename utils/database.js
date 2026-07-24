const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/users.json");

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
}

module.exports = {
    loadUsers,
    saveUsers,
};