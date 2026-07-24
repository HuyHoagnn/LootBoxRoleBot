const { SlashCommandBuilder } = require("discord.js");
const { loadUsers } = require("../utils/database");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Xem thông tin của bạn"),

    async execute(interaction) {

        const users = loadUsers();

        const user = users[interaction.user.id];

        if (!user) {

            return interaction.reply({
                content: "Bạn chưa từng treo Voice.",
                ephemeral: true
            });

        }

        const voiceTime = user.voiceTime ?? 0;
        const codes = user.codes ?? [];
        const roles = user.roles ?? [];

        const duration = require("../utils/format").formatDuration(voiceTime);

        await interaction.reply({
            embeds: [
                {
                    color: 0x00ff99,
                    title: "👤 Hồ sơ",

                    fields: [
                        {
                            name: "⏰ Tổng thời gian Voice",
                            value: `${duration}`,
                            inline: true
                        },
                        {
                            name: "🎁 Code đã nhận",
                            value: `${codes.length}`,
                            inline: true
                        },
                        {
                            name: "🌈 Role đã mở",
                            value: `${roles.length}`,
                            inline: true
                        }
                    ]
                }
            ]
        });

    }

};