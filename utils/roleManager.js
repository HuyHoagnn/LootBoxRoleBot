const roles = require("./roles");

function randomRole(userRoleIds = []) {

    const available = roles.filter(
        role => !userRoleIds.includes(role.id)
    );

    if (!available.length) return null;

    const totalWeight = available.reduce(
        (sum, role) => sum + role.chance,
        0
    );

    let random = Math.random() * totalWeight;

    for (const role of available) {

        random -= role.chance;

        if (random <= 0) {

            return role;

        }

    }

    return available[0];

}

module.exports = {

    randomRole

};