const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "../data/codes.json");

function loadCodes() {

    if (!fs.existsSync(file))
        return [];

    return JSON.parse(fs.readFileSync(file, "utf8"));

}

function saveCodes(data) {

    fs.writeFileSync(file, JSON.stringify(data, null, 2));

}

function findCode(code) {

    const codes = loadCodes();

    return codes.find(c => c.code === code);

}

function markUsed(code, userId) {

    const codes = loadCodes();

    const item = codes.find(c => c.code === code);

    if (!item) return false;

    item.used = true;
    item.userId = userId;
    item.usedAt = Date.now();

    saveCodes(codes);

    return true;

}

module.exports = {

    loadCodes,
    saveCodes,
    findCode,
    markUsed

};