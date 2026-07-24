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

    // Fix lỗi cộng dư thời gian: nếu bot restart khi user đang trong
    // voice, joinAt cũ giữ nguyên → tính sai. Reset hết joinAt về null
    // để chỉ tính thời gian thực tế từ lúc bot sống lại.
    const { loadUsers, saveUsers } = require("./utils/database");
    const users = loadUsers();
    let reset = 0;
    for (const id in users) {
        if (users[id].joinAt) {
            users[id].joinAt = null;
            reset++;
        }
    }
    if (reset > 0) saveUsers(users);
    if (reset > 0) console.log(`🔄 Đã reset joinAt của ${reset} user (tránh tính dư thời gian sau restart)`);
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
