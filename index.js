require("dotenv").config();

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

client.login(process.env.TOKEN);

// Render free (Web Service) yêu cầu mở cổng HTTP — server tí hon để giữ bot sống
if (process.env.PORT) {
    require("http")
        .createServer((req, res) => res.end("Bot is alive!"))
        .listen(process.env.PORT, () =>
            console.log(`🌐 Keepalive server chạy tại cổng ${process.env.PORT}`)
        );
}
