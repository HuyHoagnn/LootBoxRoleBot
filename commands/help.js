const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags,
} = require("discord.js");

const { MINUTES_PER_CODE } = require("../config");

const LINE = "━━━━━━━━━━━━━━━━";

module.exports = {

    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Hướng dẫn chi tiết cách nhận Code và đổi Role"),

    async execute(interaction) {

        const embed = new EmbedBuilder()
            .setColor("#8b5cf6")
            .setTitle("📖 Hướng dẫn nhận & đổi Code")
            .setDescription(
                `${LINE}\n` +
                "**BƯỚC 1 — Treo Voice** 🎧\n" +
                "Vào bất kỳ kênh Voice nào trong server và ở lại đó.\n" +
                "Bot tự động đếm thời gian, **không cần bật mic**.\n" +
                `👉 Cứ **${MINUTES_PER_CODE} phút** voice = **1 Code**\n\n` +

                "**BƯỚC 2 — Nhận Code** 🎁\n" +
                "Gõ **/panel** → bấm nút **🎁 Nhận Code**\n" +
                "Bot hiện số giờ voice và số Code bạn có thể đổi.\n" +
                "Bấm **✅ Nhận Code** → Code gửi riêng cho bạn.\n" +
                "⚠ Chỉ mình bạn thấy Code — **đừng chia sẻ cho ai!**\n\n" +

                "**BƯỚC 3 — Đổi Code lấy Role** 🎲\n" +
                "Trong /panel → bấm nút **🎲 Đổi Role**\n" +
                "Nhập Code vào ô (VD: `AB92-XKQ1`) → bấm Gửi\n" +
                "Lootbox mở với hiệu ứng quay... và bạn nhận\n" +
                "**1 Role ngẫu nhiên** trong 10 Role của server!\n\n" +

                "**BƯỚC 4 — Sưu tập** 📦\n" +
                "Mỗi Code dùng được 1 lần, mỗi Role chỉ trúng 1 lần.\n" +
                "Xem bộ sưu tập tại nút **📦 Collection** trong /panel.\n" +
                "Đủ **10/10** → mở khóa **👑 Master Collector**\n" +
                "— role đặc biệt KHÔNG THỂ quay ra được!\n" +
                `${LINE}\n` +
                "❓ Role hiếm nhất: ✨ King (tỉ lệ chỉ 1%)\n" +
                "💡 Mẹo: treo voice qua đêm vẫn được tính giờ!"
            )
            .setFooter({ text: "Lootbox Role System • Chỉ cần nhớ 1 lệnh: /panel" })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
        });

    },

};
