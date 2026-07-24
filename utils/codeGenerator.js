function generateCode(length = 8) {

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let result = "";

    for (let i = 0; i < length; i++) {

        result += chars.charAt(
            Math.floor(Math.random() * chars.length)
        );

    }

    return result.slice(0,4) + "-" + result.slice(4);

}

module.exports = generateCode;