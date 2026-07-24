// Chuyển đổi số giây thành chuỗi "Xh Ym Zs" (bỏ phần = 0 cho gọn).
// VD: 3661 -> "1h 1m 1s", 90 -> "1m 30s", 45 -> "45s", 0 -> "0s"
function formatDuration(totalSeconds) {
    let s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    s %= 3600;
    const m = Math.floor(s / 60);
    const sec = s % 60;

    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (sec > 0) parts.push(`${sec}s`);
    if (parts.length === 0) return "0s";
    return parts.join(" ");
}

module.exports = { formatDuration };
