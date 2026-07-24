async function giveRole(member, role) {

    const discordRole = member.guild.roles.cache.get(role.id);

    if (!discordRole) {

        throw new Error("Không tìm thấy Role.");

    }

    await member.roles.add(discordRole);

}

module.exports = {

    giveRole

};