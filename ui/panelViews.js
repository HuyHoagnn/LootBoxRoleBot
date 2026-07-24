const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");

const { loadUsers } = require("../utils/database");
const { MINUTES_PER_CODE, TEST_MODE } = require("../config");
const roles = require("../utils/roles");

const COLOR = "#8b5cf6";
const LINE = "━━━━━━━━━━━━━━━━";

// ── Thanh nút điều hướng (luôn hiển thị dưới mọi view) ──
function navRows() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("panel_profile")
                .setLabel("👤 Hồ sơ")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("panel_claim")
                .setLabel("🎁 Nhận Code")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("panel_redeem")
                .setLabel("🎲 Đổi Role")
                .setStyle(ButtonStyle.Danger),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("panel_collection")
                .setLabel("📦 Collection")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("panel_leaderboard")
                .setLabel("🏆 BXH Voice")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("panel_help")
                .setLabel("⚙ Hướng dẫn")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("panel_home")
                .setLabel("🏠 Trang chính")
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function getUser(userId) {
    const users = loadUsers();
    const user = users[userId] ?? {
        voiceTime: 0,
        claimedMinutes: 0,
        codes: [],
        roles: [],
    };
    user.voiceTime ??= 0;
    user.claimedMinutes ??= 0;
    user.codes ??= [];
    user.roles ??= [];
    return { users, user };
}

// ── 🏠 Trang chính ──
function homeView() {
    const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle("🎁 Lootbox Role")
        .setDescription(
            `${LINE}\n` +
            "👤 **Hồ sơ** — xem thời gian voice, code, role\n" +
            "🎁 **Nhận Code** — quy đổi giờ voice thành code\n" +
            "🎲 **Đổi Role** — nhập code, quay role ngẫu nhiên\n" +
            "📦 **Collection** — bộ sưu tập role của bạn\n" +
            "🏆 **BXH Voice** — top người treo voice\n" +
            "⚙ **Hướng dẫn** — cách chơi\n" +
            `${LINE}\n` +
            "Chọn một nút bên dưới để bắt đầu 👇"
        )
        .setFooter({ text: "Lootbox Role System" })
        .setTimestamp();

    return { embeds: [embed], components: navRows() };
}

// ── 👤 Hồ sơ ──
function profileView(userId) {
    const { user } = getUser(userId);

    const hours = Math.floor(user.voiceTime / 60);
    const minutes = user.voiceTime % 60;
    const unusedCodes = user.codes.filter(c => !c.used).length;

    const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle("👤 Hồ sơ")
        .addFields(
            { name: "⏰ Tổng Voice", value: `${hours} giờ ${minutes} phút`, inline: true },
            { name: "🎟 Code chưa dùng", value: `${unusedCodes}`, inline: true },
            { name: "🎁 Code đã nhận", value: `${user.codes.length}`, inline: true },
            { name: "🌈 Role đã mở", value: `${user.roles.length} / ${roles.length}`, inline: true },
        )
        .setFooter({ text: "Lootbox Role System" })
        .setTimestamp();

    return { embeds: [embed], components: navRows() };
}

// ── 🎁 Nhận Code (xem trước) ──
function claimView(userId) {
    const { user } = getUser(userId);

    const availableMinutes = user.voiceTime - user.claimedMinutes;
    const totalCodes = TEST_MODE
        ? 1
        : Math.floor(availableMinutes / MINUTES_PER_CODE);
    const hours = Math.floor(availableMinutes / 60);
    const mins = availableMinutes % 60;

    const embed = new EmbedBuilder()
        .setColor(totalCodes > 0 ? "#22c55e" : "#ef4444")
        .setTitle("🎁 Nhận Code")
        .setDescription(
            `${LINE}\n` +
            `⏰ Voice có thể quy đổi: **${hours} giờ ${mins} phút**\n` +
            `🎟 Có thể đổi: **${totalCodes} Code**\n` +
            `📏 Tỉ lệ: ${MINUTES_PER_CODE} phút = 1 Code\n` +
            LINE
        )
        .setFooter({ text: "Lootbox Role System" })
        .setTimestamp();

    const rows = navRows();
    if (totalCodes > 0) {
        rows.unshift(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("panel_claim_confirm")
                    .setLabel(`✅ Nhận ${totalCodes} Code`)
                    .setStyle(ButtonStyle.Success),
            )
        );
    }

    return { embeds: [embed], components: rows };
}

// ── 📦 Collection ──
function collectionView(userId) {
    const { user } = getUser(userId);
    const ownedIds = user.roles.map(r => r.id);

    const list = roles
        .map(r => `${r.name}  ${ownedIds.includes(r.id) ? "✅" : "❌"}`)
        .join("\n");

    const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle("📦 Bộ sưu tập")
        .setDescription(`${list}\n${LINE}\n**${ownedIds.length} / ${roles.length}**`)
        .setFooter({ text: "Sưu tập đủ để mở khóa 👑 Master Collector" })
        .setTimestamp();

    return { embeds: [embed], components: navRows() };
}

// ── 🏆 Leaderboard ──
async function leaderboardView(guild) {
    const users = loadUsers();

    const top = Object.entries(users)
        .sort((a, b) => (b[1].voiceTime ?? 0) - (a[1].voiceTime ?? 0))
        .slice(0, 10);

    let description = "Chưa có dữ liệu.";

    if (top.length > 0) {
        const medals = ["🥇", "🥈", "🥉"];
        const lines = [];
        for (let i = 0; i < top.length; i++) {
            const [id, data] = top[i];
            const member = await guild.members.fetch(id).catch(() => null);
            const name = member ? member.user.username : "Unknown";
            const h = Math.floor((data.voiceTime ?? 0) / 60);
            const m = (data.voiceTime ?? 0) % 60;
            lines.push(`${medals[i] ?? `**${i + 1}.**`} ${name} — ${h}h ${m}p`);
        }
        description = lines.join("\n");
    }

    const embed = new EmbedBuilder()
        .setColor("Gold")
        .setTitle("🏆 BXH Voice")
        .setDescription(description)
        .setFooter({ text: "Lootbox Role System" })
        .setTimestamp();

    return { embeds: [embed], components: navRows() };
}

// ── ⚙ Hướng dẫn ──
function helpView() {
    const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle("📖 Hướng dẫn nhận & đổi Code")
        .setDescription(
            `${LINE}\n` +
            "**BƯỚC 1 — Treo Voice** 🎧\n" +
            "Vào bất kỳ kênh Voice nào trong server và ở lại đó.\n" +
            "Bot tự động đếm thời gian cho bạn, không cần bật mic.\n" +
            `👉 Cứ **${MINUTES_PER_CODE} phút** voice = **1 Code**\n\n` +

            "**BƯỚC 2 — Nhận Code** 🎁\n" +
            "Gõ **/panel** → bấm nút **🎁 Nhận Code**\n" +
            "Bot hiện số giờ voice của bạn và số Code có thể đổi.\n" +
            "Bấm **✅ Nhận Code** → bot gửi Code riêng cho bạn\n" +
            "(chỉ mình bạn thấy — đừng chia sẻ Code cho ai!)\n\n" +

            "**BƯỚC 3 — Đổi Code lấy Role** 🎲\n" +
            "Trong /panel → bấm nút **🎲 Đổi Role**\n" +
            "Nhập Code vào ô (VD: `AB92-XKQ1`) → bấm Gửi\n" +
            "Lootbox sẽ mở với hiệu ứng quay... và bạn nhận\n" +
            "**1 Role ngẫu nhiên** trong 10 Role của server!\n\n" +

            "**BƯỚC 4 — Sưu tập** 📦\n" +
            "Mỗi Code chỉ dùng được 1 lần, mỗi Role chỉ trúng 1 lần.\n" +
            "Xem bộ sưu tập tại nút **📦 Collection**.\n" +
            "Sưu tập đủ **10/10** để mở khóa **👑 Master Collector**\n" +
            "— role đặc biệt KHÔNG THỂ quay ra được!\n" +
            `${LINE}\n` +
            "❓ Role hiếm nhất: ✨ Con Cưng RNG (tỉ lệ chỉ 1%)\n" +
            "💡 Mẹo: treo voice qua đêm vẫn được tính giờ!"
        )
        .setFooter({ text: "Lootbox Role System • Chỉ cần nhớ 1 lệnh: /panel" })
        .setTimestamp();

    return { embeds: [embed], components: navRows() };
}

module.exports = {
    homeView,
    profileView,
    claimView,
    collectionView,
    leaderboardView,
    helpView,
    navRows,
    COLOR,
    LINE,
};
