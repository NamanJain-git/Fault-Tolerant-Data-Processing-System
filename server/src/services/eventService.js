const db = require("../db/database");

function saveEvent(event, dedupeKey, rawEvent, simulateFailure) {

    const transaction = db.transaction(() => {

        const rawStatement = db.prepare(`
            INSERT INTO raw_events (
                client_id,
                raw_payload,
                received_at,
                status,
                error_message
            )
            VALUES (?, ?, ?, ?, ?)
        `);

        rawStatement.run(
            event.client_id,
            JSON.stringify(rawEvent),
            new Date().toISOString(),
            "processed",
            null
        );


        if (simulateFailure) {
            throw new Error("SIMULATED_DATABASE_FAILURE");
        }


        const eventStatement = db.prepare(`
            INSERT INTO events (
                client_id,
                metric,
                amount,
                timestamp,
                dedupe_key,
                status,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = eventStatement.run(
            event.client_id,
            event.metric,
            event.amount,
            event.timestamp,
            dedupeKey,
            "processed",
            new Date().toISOString()
        );

        return result;
    });

    return transaction();
}


function saveRejectedEvent(rawEvent, clientId, errorMessage) {

    const statement = db.prepare(`
        INSERT INTO raw_events (
            client_id,
            raw_payload,
            received_at,
            status,
            error_message
        )
        VALUES (?, ?, ?, ?, ?)
    `);

    statement.run(
        clientId || null,
        JSON.stringify(rawEvent),
        new Date().toISOString(),
        "rejected",
        errorMessage
    );
}


function saveFailedEvent(rawEvent, clientId, errorMessage) {

    const statement = db.prepare(`
        INSERT INTO raw_events (
            client_id,
            raw_payload,
            received_at,
            status,
            error_message
        )
        VALUES (?, ?, ?, ?, ?)
    `);

    statement.run(
        clientId || null,
        JSON.stringify(rawEvent),
        new Date().toISOString(),
        "failed",
        errorMessage
    );
}


module.exports = {
    saveEvent,
    saveRejectedEvent,
    saveFailedEvent
};