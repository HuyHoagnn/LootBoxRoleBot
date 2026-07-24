const {
    SlashCommandBuilder,
    EmbedBuilder,
} = require("discord.js");

const {
    loadUsers,
    saveUsers,
} = require("../utils/database");

const generateCode = require("../utils/codeGenerator");

const {
    SECONDS_PER_CODE,
} = require("../config");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("questrole")
        .setDescription("Nhận Code đổi Color Role"),

    async execute(interaction) {

        const users = loadUsers();

        const userId = interaction.user.id;

        const user = users[userId];

        if (!user) {

            return interaction.reply({
                content: "❌ Bạn chưa có dữ liệu Voice.",
            });

        }

        user.voiceTime ??= 0;
        user.claimedSeconds ??= 0;
        user.codes ??= [];
        user.roles ??= [];

        const availableSeconds =
            user.voiceTime - user.claimedSeconds;

        const totalCodes =
            Math.floor(
                availableSeconds / SECONDS_PER_CODE
            );

        if (totalCodes <= 0) {

            return interaction.reply({

                embeds: [

                    new EmbedBuilder()

                        .setColor("Red")

                        .setTitle("❌ Chưa đủ thời gian")

                        .setDescription(
                            `Bạn cần **${SECONDS_PER_CODE} giây** (${(SECONDS_PER_CODE/60).toFixed(0)} phút) để nhận 1 Code.\n\n` +
                            `⏰ Hiện tại còn **${availableSeconds} giây** có thể quy đổi.`
                        )

                ]

            });

        }

        const newCodes = [];

        for (let i = 0; i < totalCodes; i++) {

            let code;

            do {

                code = generateCode();

            } while (
                user.codes.some(c => c.code === code)
            );

            const data = {

                code,

                used: false,

                createdAt: Date.now(),

                usedAt: null

            };

            user.codes.push(data);

            newCodes.push(code);

        }

        user.claimedSeconds +=
            totalCodes * SECONDS_PER_CODE;

        saveUsers(users);

        const embed = new EmbedBuilder()

            .setColor("#8b5cf6")

            .setTitle("🎁 Nhận Code Thành Công")

            .setDescription(
                `Bạn đã nhận được **${totalCodes} Code**`
            )

            .addFields(

                {
                    name: "🎟 Danh sách Code",

                    value:
                        "```" +
                        newCodes.join("\n") +
                        "```"
                },

                {
                    name: "⏰ Đã quy đổi",

                    value:
                        `${totalCodes * SECONDS_PER_CODE} giây`,

                    inline: true
                },

                {
                    name: "📦 Tổng Code",

                    value:
                        `${user.codes.length}`,

                    inline: true
                }

            )

            .setFooter({

                text: "Lootbox Role System"

            })

            .setTimestamp();

        await interaction.reply({

            embeds: [embed]

        });

    },

};