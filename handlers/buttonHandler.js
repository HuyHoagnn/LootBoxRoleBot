const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    MessageFlags,
} = require("discord.js");

const {
    homeView,
    profileView,
    claimView,
    collectionView,
    leaderboardView,
    helpView,
} = require("../ui/panelViews");

const { loadUsers, saveUsers } = require("../utils/database");
const generateCode = require("../utils/codeGenerator");
const { MINUTES_PER_CODE, TEST_MODE } = require("../config");

function redeemModal() {
    const modal = new ModalBuilder()
        .setCustomId("redeem_modal")
        .setTitle("🎲 Đổi Role — Nhập Code");

    const input = new TextInputBuilder()
        .setCustomId("code_input")
        .setLabel("Nhập Code của bạn")
        .setPlaceholder("VD: AB92-XKQ1")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return modal;
}

module.exports = async (interaction) => {

    if (!interaction.isButton()) return;

    switch (interaction.customId) {

        // ── Điều hướng dashboard: sửa trực tiếp embed ──
        case "panel_home":
            return interaction.update(homeView());

        case "panel_profile": {
            await interaction.deferUpdate();
            const view = await profileView(interaction);
            return interaction.editReply(view);
        }

        case "panel_claim":
            return interaction.update(claimView(interaction.user.id));

        case "panel_collection":
            return interaction.update(collectionView(interaction.user.id));

        case "panel_leaderboard": {
            await interaction.deferUpdate();
            const view = await leaderboardView(interaction.guild);
            return interaction.editReply(view);
        }

        case "panel_help":
            return interaction.update(helpView());

        // ── Nhận Code ──
        case "panel_claim_confirm": {

            const users = loadUsers();
            const userId = interaction.user.id;

            users[userId] ??= {
                voiceTime: 0,
                claimedMinutes: 0,
                codes: [],
                roles: [],
            };
            const user = users[userId];

            user.voiceTime ??= 0;
            user.claimedMinutes ??= 0;
            user.codes ??= [];
            user.roles ??= [];

            const availableMinutes = user.voiceTime - user.claimedMinutes;
            const totalCodes = TEST_MODE
                ? 1
                : Math.floor(availableMinutes / MINUTES_PER_CODE);

            if (totalCodes <= 0) {
                return interaction.reply({
                    content: `❌ Chưa đủ thời gian. Cần ${MINUTES_PER_CODE} phút cho 1 Code.`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            const newCodes = [];
            for (let i = 0; i < totalCodes; i++) {
                let code;
                do {
                    code = generateCode();
                } while (user.codes.some(c => c.code === code));

                user.codes.push({
                    code,
                    used: false,
                    createdAt: Date.now(),
                    usedAt: null,
                });
                newCodes.push(code);
            }

            if (!TEST_MODE) {
                user.claimedMinutes += totalCodes * MINUTES_PER_CODE;
            }
            saveUsers(users);

            // Code gửi riêng tư (ephemeral), panel cập nhật lại
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#22c55e")
                        .setTitle("🎁 Nhận Code Thành Công")
                        .setDescription(`Bạn nhận được **${totalCodes} Code**`)
                        .addFields({
                            name: "🎟 Danh sách Code",
                            value: "```" + newCodes.join("\n") + "```",
                        })
                        .setFooter({ text: "Lootbox Role System" })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });

            return interaction.message.edit(claimView(userId)).catch(() => null);
        }

        // ── Đổi Role: mở modal nhập Code ──
        case "panel_redeem":
        case "redeem_button":
            return interaction.showModal(redeemModal());

    }

};
