const crypto = require("crypto");

function generateDedupeKey(event) {
    const canonicalData = [
        event.client_id,
        event.metric,
        event.amount,
        event.timestamp
    ].join("|");

    return crypto
        .createHash("sha256")
        .update(canonicalData)
        .digest("hex");
}

module.exports = generateDedupeKey;