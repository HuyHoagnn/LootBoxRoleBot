const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("redeem")
        .setDescription("Đổi Code lấy Color Role"),

    async execute(interaction){

        const embed = new EmbedBuilder()

            .setColor("#8b5cf6")

            .setTitle("🎁 Đổi Color Role")

            .setDescription(
                "Nhấn nút bên dưới để nhập Code."
            );

        const row = new ActionRowBuilder()

            .addComponents(

                new ButtonBuilder()

                    .setCustomId("redeem_button")

                    .setLabel("🎁 Nhập Code")

                    .setStyle(ButtonStyle.Success)

            );

        await interaction.reply({

            embeds:[embed],

            components:[row]

        });

    }

};