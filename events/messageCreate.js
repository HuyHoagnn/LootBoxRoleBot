const { normalizeCode, isLikelyCode } = require("../utils/redeemService");
const { findCode, markCodeUsed, addRole } = require("../utils/redeemService");
const { randomRole } = require("../utils/roleManager");
const { giveRole } = require("../services/roleService");
const { formatDuration } = require("../utils/format");
const { SECONDS_PER_CODE } = require("../config");
const { MessageFlags } = require("discord.js");

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Hiệu ứng mở Lootbox phong cách Valorant VN (dựa trên message, không phải interaction)
const OPEN_FRAMES = [
    { box: "📦", bar: "▱▱▱▱▱▱▱▱", text: "Đang quét code..." },
    { box: "📭", bar: "▓▱▱▱▱▱▱▱", text: "Mở khóa hòm kho báu..." },
    { box: "🎁", bar: "▓▓▱▱▱▱▱▱", text: "Lootbox đã mở!" },
    { box: "✨", bar: "▓▓▓▓▱▱▱▱", text: "Đang lắc lấy phần thưởng..." },
    { box: "💥", bar: "▓▓▓▓▓▱▱▱", text: "Rung lắc..." },
    { box: "🌟", bar: "▓▓▓▓▓▓▱▱", text: "Gần xong..." },
    { box: "🎊", bar: "▓▓▓▓▓▓▓▱", text: "Sắp lộ diện!" },
    { box: "🏆", bar: "▓▓▓▓▓▓▓▓", text: "HOÀN TẤT!" },
];

function frameEmbed(f) {
    return {
        color: 0x8b5cf6,
        title: `${f.box}  MỞ LOOTBOX`,
        description:
            "```\n" + f.bar + "\n```\n" +
            `**${f.text}**`,
        footer: { text: "Lootbox Role System" },
    };
}

module.exports = {
    name: "messageCreate",

    async execute(message) {

        // Bỏ qua bot / webhook / hệ thống
        if (message.author.bot) return;
        if (!message.guild) return; // chỉ hoạt động trong server
        if (message.content.startsWith("/")) return; // bỏ qua slash command

        // Chỉ xử lý khi tin nhắn GIỐNG code (XXXX-XXXX hoặc 8 ký tự liền).
        // Tin nhắn bình thường (có dấu cách) → bỏ qua, KHÔNG reply, KHÔNG hiện kênh.
        const raw = message.content.trim();
        if (!isLikelyCode(raw)) return;

        const code = normalizeCode(raw);

        const result = findCode(code, message.author.id);
        if (!result) {
            return message.reply({
                content: "❌ Code không tồn tại hoặc không thuộc về bạn.",
                flags: MessageFlags.Ephemeral, // chỉ người gõ thấy, không hiện kênh tổng
            }).catch(() => null);
        }
        if (result.code.used) {
            return message.reply({
                content: "❌ Code đã được sử dụng.",
                flags: MessageFlags.Ephemeral,
            }).catch(() => null);
        }

        const member = message.member;
        const ownedRoles = result.user.roles?.map(r => r.id) || [];
        const reward = randomRole(ownedRoles);

        if (!reward) {
            return message.reply({
                content: "🎉 Bạn đã sở hữu toàn bộ Role.",
                flags: MessageFlags.Ephemeral,
            }).catch(() => null);
        }

        // ── Animation mở Lootbox (public trong channel) ──
        const anim = await message.reply({ embeds: [frameEmbed(OPEN_FRAMES[0])] }).catch(() => null);
        if (!anim) return;

        for (let i = 1; i < OPEN_FRAMES.length; i++) {
            await sleep(650);
            await anim.edit({ embeds: [frameEmbed(OPEN_FRAMES[i])] }).catch(() => null);
        }

        // Thêm role vào user
        try {
            await giveRole(member, reward);
        } catch (err) {
            console.error(err);
            await anim.edit({
                embeds: [{
                    color: 0xef4444,
                    title: "❌ Lỗi",
                    description: "Không thể thêm Role (kiểm tra quyền bot / vị trí role).",
                }],
            }).catch(() => null);
            return;
        }

        markCodeUsed(result.ownerId, code);
        addRole(result.ownerId, reward);

        // ── Reveal kết quả đẹp (CÔNG KHAI trong kênh, không gửi DM) ──
        const totalVoice = result.user.voiceTime ?? 0;
        const claimed = result.user.claimedSeconds ?? 0;
        const availableNow = Math.max(0, totalVoice - claimed);
        const codesEarned = Math.floor(totalVoice / SECONDS_PER_CODE);
        const remainingForNext = availableNow % SECONDS_PER_CODE;

        await sleep(500);
        await anim.edit({
            embeds: [{
                color: 0xfacc15,
                title: `🎉 CHÚC MỪNG ${message.author.username}!`,
                description:
                    "🎊🎊🎊\n\n" +
                    `# ${reward.name}\n\n` +
                    "🎊🎊🎊",
                thumbnail: { url: message.author.displayAvatarURL({ dynamic: true, size: 256 }) },
                fields: [
                    { name: "⏰ Tổng thời gian treo", value: formatDuration(totalVoice), inline: true },
                    { name: "🎟 Code đã đổi", value: `${codesEarned}`, inline: true },
                    { name: "⏳ Còn lại cho lần sau", value: formatDuration(remainingForNext), inline: false },
                ],
                footer: { text: "Lootbox Role System • Treo voice tiếp để nhận thêm Code!" },
                timestamp: new Date().toISOString(),
            }],
        }).catch(() => null);

        // ── Bill công khai trong kênh ──
        try {
            const { generateBill } = require("../utils/billGenerator");
            const bill = generateBill(message.member, reward, code, totalVoice);
            await message.channel.send({ embeds: [bill] }).catch(() => null);
        } catch { /* bỏ qua nếu không tạo được bill */ }
    },
};
