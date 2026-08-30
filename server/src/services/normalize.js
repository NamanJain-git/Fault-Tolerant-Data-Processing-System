const fieldAliases = {
    client_id: ["source", "client"],
    metric: ["metric", "metric_name"],
    amount: ["amount", "value"],
    timestamp: ["timestamp", "time", "date"]
};


function getField(object, aliases) {
    for (const key of aliases) {
        if (object && object[key] !== undefined) {
            return object[key];
        }
    }

    return undefined;
}


function normalizeEvent(rawEvent) {

    const payload = rawEvent.payload || rawEvent.data || {};

    const clientId = getField(rawEvent, fieldAliases.client_id);

    const metric = getField(payload, fieldAliases.metric);

    const rawAmount = getField(payload, fieldAliases.amount);

    const rawTimestamp = getField(payload, fieldAliases.timestamp);


    const amount = Number(rawAmount);

    const date = new Date(rawTimestamp);


    if (!clientId) {
        throw new Error("Missing source");
    }

    if (!metric) {
        throw new Error("Missing metric");
    }

    if (rawAmount === undefined || Number.isNaN(amount)) {
        throw new Error("Invalid amount");
    }

    if (
        rawTimestamp === undefined ||
        Number.isNaN(date.getTime())
    ) {
        throw new Error("Invalid timestamp");
    }


    return {
        client_id: clientId,
        metric: metric,
        amount: amount,
        timestamp: date.toISOString()
    };
}


module.exports = normalizeEvent;