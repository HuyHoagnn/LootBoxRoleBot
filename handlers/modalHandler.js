const { EmbedBuilder, MessageFlags } = require("discord.js");

const { findCode, markCodeUsed, addRole } = require("../utils/redeemService");
const { normalizeCode } = require("../utils/redeemService");
const { randomRole } = require("../utils/roleManager");
const { giveRole } = require("../services/roleService");
const generateBill = require("../utils/billGenerator");

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Các khung hình animation mở Lootbox
const FRAMES = [
    "⬜⬜⬜⬜⬜",
    "🟪⬜⬜⬜⬜",
    "🟪🟪🟪⬜⬜",
    "🟪🟪🟪🟪🟪",
    "✨✨✨✨✨",
];

function frameEmbed(bar) {
    return new EmbedBuilder()
        .setColor("#8b5cf6")
        .setTitle("🎲 Đang mở Lootbox...")
        .setDescription(bar)
        .setFooter({ text: "Lootbox Role System" });
}

module.exports = async (interaction) => {

    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== "redeem_modal") return;

    const codeInput = normalizeCode(
        interaction.fields.getTextInputValue("code_input")
    );

    const result = findCode(codeInput, interaction.user.id);

    if (!result) {
        return interaction.reply({
            content: "❌ Code không tồn tại hoặc không thuộc về bạn.",
            flags: MessageFlags.Ephemeral,
        });
    }

    if (result.code.used) {
        return interaction.reply({
            content: "❌ Code đã được sử dụng.",
            flags: MessageFlags.Ephemeral,
        });
    }

    const member = interaction.member;
    const ownedRoles = result.user.roles?.map(r => r.id) || [];
    const reward = randomRole(ownedRoles);

    if (!reward) {
        return interaction.reply({
            content: "🎉 Bạn đã sở hữu toàn bộ Role.",
            flags: MessageFlags.Ephemeral,
        });
    }

    try {
        await giveRole(member, reward);
    } catch (err) {
        console.error(err);
        return interaction.reply({
            content: "❌ Không thể thêm Role (kiểm tra quyền bot / vị trí role).",
            flags: MessageFlags.Ephemeral,
        });
    }

    markCodeUsed(result.ownerId, codeInput);
    addRole(result.ownerId, reward);

    // ── Tính toán thông tin báo cáo (kiểu bot Valorant VN) ──
    const { SECONDS_PER_CODE } = require("../config");
    const totalVoice = result.user.voiceTime ?? 0;
    const claimed = result.user.claimedSeconds ?? 0;
    const availableNow = Math.max(0, totalVoice - claimed);
    const codesEarned = Math.floor(totalVoice / SECONDS_PER_CODE);
    const remainingForNext = availableNow % SECONDS_PER_CODE;
    const { formatDuration } = require("../utils/format");

    // ── Animation mở Lootbox (CÔNG KHAI trong kênh) ──
    await interaction.reply({
        embeds: [frameEmbed(FRAMES[0])],
    });

    for (let i = 1; i < FRAMES.length; i++) {
        await sleep(700);
        await interaction.editReply({ embeds: [frameEmbed(FRAMES[i])] }).catch(() => null);
    }

    await sleep(700);

    // ── Reveal kết quả CÔNG KHAI (thay vì DM) ──
    await interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor("#facc15")
                .setTitle(`🎉 CHÚC MỪNG ${interaction.user.username}!`)
                .setDescription(
                    "🎊🎊🎊\n\n" +
                    `# ${reward.name}\n\n` +
                    "🎊🎊🎊"
                )
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: "⏰ Tổng thời gian treo", value: formatDuration(totalVoice), inline: true },
                    { name: "🎟 Code đã đổi", value: `${codesEarned}`, inline: true },
                    { name: "⏳ Còn lại cho lần sau", value: formatDuration(remainingForNext), inline: false }
                )
                .setFooter({ text: "Lootbox Role System • Treo voice tiếp để nhận thêm Code!" })
                .setTimestamp(),
        ],
    }).catch(() => null);

    // ── Bill công khai trong kênh ──
    const bill = generateBill(member, reward, codeInput, result.user.voiceTime);
    await interaction.channel.send({ embeds: [bill] }).catch(() => null);

};
