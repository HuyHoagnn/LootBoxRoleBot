const { loadUsers, saveUsers } = require("../utils/database");

module.exports = {
    name: "voiceStateUpdate",

    async execute(oldState, newState) {

        // ⚠️ VoiceState.id là GUILD ID, KHÔNG phải user id.
        // Phải lấy qua member.user.id, nếu không user thật sẽ KHÔNG được tính giờ.
        const member = newState.member;
        if (!member) return;
        const userId = member.user.id;

        const users = loadUsers();

        if (!users[userId]) {
            users[userId] = {
                voiceTime: 0,
                claimedSeconds: 0,
                joinAt: null,
                codes: [],
                roles: []
            };
        }

        // Vào Voice (từ ngoài vào, hoặc reconnect sau disconnect)
        if (!oldState.channel && newState.channel) {

            users[userId].joinAt = Date.now();

            saveUsers(users);

            console.log(`${member.user.username} đã vào Voice`);

            return;
        }

        // Rời Voice (hoặc mất kết nối tạm thời)
        if (oldState.channel && !newState.channel) {

            if (!users[userId].joinAt) return;

            // Tính chính xác từng GIÂY (thay vì phút).
            const seconds = Math.round(
                (Date.now() - users[userId].joinAt) / 1000
            );

            if (seconds > 0) {
                users[userId].voiceTime += seconds;
            }
            users[userId].joinAt = null;

            saveUsers(users);

            console.log(
                `${member.user.username} đã treo ${seconds} giây`
            );
        }

    },
};