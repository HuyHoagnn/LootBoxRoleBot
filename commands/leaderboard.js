const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { loadUsers } = require("../utils/database");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Top người treo voice"),

    async execute(interaction) {

        const users = loadUsers();

        const leaderboard = Object.entries(users)
            .sort((a, b) => b[1].voiceTime - a[1].voiceTime)
            .slice(0, 10);

        if (leaderboard.length === 0) {

            return interaction.reply("Chưa có dữ liệu.");

        }

        let description = "";

        for (let i = 0; i < leaderboard.length; i++) {

            const [id, data] = leaderboard[i];

            const member = await interaction.guild.members.fetch(id).catch(() => null);

            description += `**${i + 1}.** ${member ? member.user.username : "Unknown"} - ${require("../utils/format").formatDuration(data.voiceTime)}\n`;

        }

        const embed = new EmbedBuilder()
            .setColor("Gold")
            .setTitle("🏆 Leaderboard Voice")
            .setDescription(description);

        await interaction.reply({
            embeds: [embed]
        });

    }

};