const { SlashCommandBuilder } = require("discord.js");
const { homeView } = require("../ui/panelViews");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("panel")
        .setDescription("Mở bảng điều khiển Lootbox Role"),

    async execute(interaction) {
        await interaction.reply(homeView());
    },

};
