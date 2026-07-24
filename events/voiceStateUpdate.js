const { loadUsers, saveUsers } = require("../utils/database");

module.exports = {
    name: "voiceStateUpdate",

    async execute(oldState, newState) {

        const userId = newState.id;

        const users = loadUsers();

        if (!users[userId]) {
            users[userId] = {
                voiceTime: 0,
                claimedMinutes: 0,
                joinAt: null,
                codes: [],
                roles: []
            };
        }

        // Vào Voice
        if (!oldState.channel && newState.channel) {

            users[userId].joinAt = Date.now();

            saveUsers(users);

            console.log(`${newState.member.user.username} đã vào Voice`);

            return;
        }

        // Rời Voice
        if (oldState.channel && !newState.channel) {

            if (!users[userId].joinAt) return;

            const minutes = Math.floor(
                (Date.now() - users[userId].joinAt) / 60000
            );

            users[userId].voiceTime += minutes;
            users[userId].joinAt = null;

            saveUsers(users);

            console.log(
                `${newState.member.user.username} đã treo ${minutes} phút`
            );
        }

    },
};