// ───────────────────────────────────────────────────────────
// githubStore — đồng bộ data/users.json lên GitHub repo
// Dùng GitHub Contents API (HTTP) → chạy được trên Render free
// (filesystem tạm thời) mà không cần git local.
//
// Biến môi trường (bắt buộc khi DATA_SYNC_ENABLED=true):
//   DATA_SYNC_ENABLED = "true"
//   GITHUB_TOKEN      = Personal Access Token (quyền repo / contents:write)
//   GITHUB_REPO       = "owner/repo"  (ví dụ: HuyHoagnn/LootBoxRoleBot)
//
// Khi DATA_SYNC_ENABLED khác "true": mọi hàm no-op → bot chạy bình
// thường với file local (dùng cho dev máy cá nhân).
// ───────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/users.json");

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO; // "owner/repo"
const ENABLED = process.env.DATA_SYNC_ENABLED === "true";

const API_BASE = "https://api.github.com";
const UA = { "User-Agent": "lootbox-role-bot" };

async function githubGet() {
    if (!TOKEN || !REPO) return null;
    try {
        const res = await fetch(
            `${API_BASE}/repos/${REPO}/contents/data/users.json`,
            { headers: { ...UA, Authorization: `Bearer ${TOKEN}` } }
        );
        if (!res.ok) return null;
        const json = await res.json();
        const content = Buffer.from(json.content, "base64").toString("utf8");
        // Chống data hỏng: chỉ nhận JSON object hợp lệ
        if (!content || JSON.parse(content) === undefined) return null;
        return { content, sha: json.sha };
    } catch {
        return null;
    }
}

async function githubPut(content, sha) {
    if (!TOKEN || !REPO) return false;
    const body = {
        message: "sync: update users.json",
        content: Buffer.from(content).toString("base64"),
    };
    if (sha) body.sha = sha;

    const res = await fetch(
        `${API_BASE}/repos/${REPO}/contents/data/users.json`,
        {
            method: "PUT",
            headers: {
                ...UA,
                Authorization: `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        }
    );
    return res.ok;
}

// ── Debounce push: gộp nhiều save trong 15s thành 1 request ──
let pushTimer = null;
let lastSha = null;

function schedulePush() {
    if (!ENABLED) return;
    if (pushTimer) return; // đã có lịch push chờ
    pushTimer = setTimeout(async () => {
        pushTimer = null;
        try {
            if (!fs.existsSync(filePath)) return;
            const localContent = fs.readFileSync(filePath, "utf8");

            // Lấy sha mới nhất để tránh 409 conflict
            const remote = await githubGet();
            const sha = remote ? remote.sha : lastSha;

            let ok = await githubPut(localContent, sha);

            // Retry 1 lần nếu conflict (sha đã cũ)
            if (!ok) {
                const fresh = await githubGet();
                if (fresh) ok = await githubPut(localContent, fresh.sha);
            }

            if (ok) {
                const r = await githubGet();
                if (r) lastSha = r.sha;
                console.log("☁️ Đã sync users.json lên GitHub");
            } else {
                console.warn("⚠️ Push users.json lên GitHub thất bại (sẽ thử lại lúc save sau)");
            }
        } catch (err) {
            console.error("⚠️ GitHub sync lỗi:", err.message);
        }
    }, 15000);
}

// ── Pull bản mới nhất về local khi bot khởi động ──
async function pullOnStart() {
    if (!ENABLED) return;
    try {
        const remote = await githubGet();
        if (remote) {
            fs.writeFileSync(filePath, remote.content);
            lastSha = remote.sha;
            console.log("✅ Đã pull users.json mới nhất từ GitHub");
        }
    } catch (err) {
        console.error("⚠️ GitHub pull lỗi:", err.message);
    }
}

module.exports = { schedulePush, pullOnStart, ENABLED, githubGet, githubPut };
