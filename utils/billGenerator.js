const { EmbedBuilder } = require("discord.js");

function generateBill(member, role, code, voiceTime) {

    const duration = require("./format").formatDuration(voiceTime);

    return new EmbedBuilder()

        .setColor("#8b5cf6")

        .setTitle("🧾 PHIẾU ĐỔI ROLE")

        .setThumbnail(
            member.guild.iconURL({ dynamic: true })
        )

        .addFields(

            {
                name: "👤 Người dùng",
                value: member.user.username
            },

            {
                name: "🎁 Role",
                value: role.name
            },

            {
                name: "🕒 Voice",
                value: duration
            },

            {
                name: "🎟 Code",
                value: code
            },

            {
                name: "🏦 Ngân hàng",
                value: "Techcombank",
                inline: true
            },

            {
                name: "💳 STK",
                value: "190020260724",
                inline: true
            },

            {
                name: "👤 Chủ TK",
                value: "LOOTBOX ROLE"
            },

            {
                name: "📝 Nội dung",
                value: "ĐỔI CODE THÀNH CÔNG"
            }

        )

        .setFooter({

            text: "Lootbox Role System"

        })

        .setTimestamp();

}

module.exports = generateBill;