const { loadUsers, saveUsers } = require("./database");

function findCode(code) {

    const users = loadUsers();

    for (const userId in users) {

        const user = users[userId];

        const found = user.codes?.find(c => c.code === code);

        if (found) {
            return {
                ownerId: userId,
                user,
                code: found,
                users,
            };
        }

    }

    return null;

}

function markCodeUsed(ownerId, codeText) {

    const users = loadUsers();
    const user = users[ownerId];
    if (!user) return false;

    const code = user.codes.find(c => c.code === codeText);
    if (!code) return false;

    code.used = true;
    code.usedAt = Date.now();

    saveUsers(users);
    return true;

}

function addRole(ownerId, role) {

    const users = loadUsers();
    const user = users[ownerId];
    if (!user) return;

    user.roles ??= [];
    user.roles.push({
        id: role.id,
        name: role.name,
        time: Date.now(),
    });

    saveUsers(users);

}

module.exports = {
    findCode,
    markCodeUsed,
    addRole,
};
