require("dotenv").config();

// ── Kiểm tra biến môi trường trước khi làm bất cứ gì ──
if (!process.env.TOKEN) {
    console.error("❌ THIẾU BIẾN MÔI TRƯỜNG: TOKEN");
    console.error("   → Local: tạo file .env với dòng  TOKEN=<token bot>");
    console.error("   → Render: tab Environment → Add Environment Variable → Key: TOKEN");
    console.error("   Lấy token tại: discord.com/developers → Bot → Reset Token");
    process.exit(1);
}

const {
    Client,
    GatewayIntentBits,
    Collection,
    Events,
    MessageFlags,
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const buttonHandler = require("./handlers/buttonHandler");
const modalHandler = require("./handlers/modalHandler");
const { pullOnStart } = require("./utils/githubStore");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, "commands");
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"))) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
}

// Load events
const eventsPath = path.join(__dirname, "events");
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith(".js"))) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.once(Events.ClientReady, () => {
    console.log(`✅ ${client.user.tag} đã online!`);

    // Xử lý thời gian khi bot restart: nếu user đang trong voice (joinAt tồn tại),
    // thời gian TỪ LÚC VÀO VOICE ĐẾN LÚC RESTART sẽ BỊ MẤT nếu chỉ reset null.
    // Giải pháp: cộng dồn khoảng đó vào voiceTime, rồi đặt joinAt = now để
    // tiếp tục đếm từ hiện tại (KHÔNG mất thời gian, cũng KHÔNG tính dư).
    const { loadUsers, saveUsers } = require("./utils/database");
    const users = loadUsers();
    let carry = 0;
    const now = Date.now();
    for (const id in users) {
        const u = users[id];
        if (u.joinAt) {
            const mins = Math.round((now - u.joinAt) / 60000);
            if (mins > 0) u.voiceTime += mins;
            u.joinAt = now; // tiếp tục đếm từ lúc bot sống lại
            carry++;
        }
    }
    if (carry > 0) saveUsers(users);
    if (carry > 0) console.log(`🔄 Đã cộng dồn thời gian voice của ${carry} user qua lần restart (không mất giờ)`);
});

client.on(Events.InteractionCreate, async (interaction) => {

    try {

        if (interaction.isButton()) {
            return await buttonHandler(interaction);
        }

        if (interaction.isModalSubmit()) {
            return await modalHandler(interaction);
        }

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        await command.execute(interaction);

    } catch (error) {

        console.error("===== ERROR =====");
        console.error(error);
        console.error("=================");

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "❌ Có lỗi xảy ra.",
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.reply({
                    content: "❌ Có lỗi xảy ra.",
                    flags: MessageFlags.Ephemeral,
                });
            }
        } catch { /* interaction đã hết hạn */ }

    }

});

// Pull data mới nhất từ GitHub trước khi login (chỉ chạy khi bật sync).
// Đợi xong mới login để tránh race condition (data reset bị pull cũ ghi đè).
(async () => {
    try {
        await pullOnStart();
    } catch {
        /* ignore */
    }

    client.login(process.env.TOKEN).catch((err) => {
        console.error("❌ Đăng nhập Discord thất bại:", err.message);
        if (err.code === "TokenInvalid") {
            console.error("   → Token sai hoặc đã bị thu hồi. Reset Token trong Developer Portal");
            console.error("     rồi cập nhật lại biến TOKEN (Render: tab Environment).");
        }
        process.exit(1);
    });
})();

// Render free (Web Service) yêu cầu mở cổng HTTP — server tí hon để giữ bot sống
if (process.env.PORT) {
    require("http")
        .createServer((req, res) => res.end("Bot is alive!"))
        .listen(process.env.PORT, () =>
            console.log(`🌐 Keepalive server chạy tại cổng ${process.env.PORT}`)
        );
}
