const test = require("node:test");
const assert = require("node:assert");
const { formatDuration } = require("../utils/format");

test("formatDuration: chuyển giây → chuỗi giờ/phút/giây", () => {
    assert.strictEqual(formatDuration(0), "0s");
    assert.strictEqual(formatDuration(45), "45s");
    assert.strictEqual(formatDuration(90), "1m 30s");
    assert.strictEqual(formatDuration(600), "10m");
    assert.strictEqual(formatDuration(3661), "1h 1m 1s");
    assert.strictEqual(formatDuration(3600), "1h");
    assert.strictEqual(formatDuration(3725), "1h 2m 5s");
    assert.strictEqual(formatDuration(-50), "0s", "âm phải trả 0s");
});
