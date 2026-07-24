const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Kiểm tra bot hoạt động"),

    async execute(interaction) {
        await interaction.reply("🏓 Pong!");
    },
};