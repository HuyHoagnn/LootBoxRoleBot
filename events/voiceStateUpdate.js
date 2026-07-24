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

        // Vào Voice (từ ngoài vào, hoặc reconnect sau disconnect)
        if (!oldState.channel && newState.channel) {

            users[userId].joinAt = Date.now();

            saveUsers(users);

            console.log(`${newState.member.user.username} đã vào Voice`);

            return;
        }

        // Rời Voice (hoặc mất kết nối tạm thời)
        if (oldState.channel && !newState.channel) {

            if (!users[userId].joinAt) return;

            // Làm tròn đến phút gần nhất (thay vì floor) để ít sai lệch hơn.
            // VD: 89s -> 1 phút, 91s -> 2 phút. Sai lệch tối đa ±30s.
            const minutes = Math.round(
                (Date.now() - users[userId].joinAt) / 60000
            );

            if (minutes > 0) {
                users[userId].voiceTime += minutes;
            }
            users[userId].joinAt = null;

            saveUsers(users);

            console.log(
                `${newState.member.user.username} đã treo ${minutes} phút`
            );
        }

    },
};