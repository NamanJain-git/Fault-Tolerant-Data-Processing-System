const db = require("../db/database");

function getAggregates(filters = {}) {

    let query = `
        SELECT
            COUNT(*) AS totalEvents,
            COALESCE(SUM(amount), 0) AS totalAmount
        FROM events
        WHERE status = 'processed'
    `;

    const params = [];


    if (filters.client) {
        query += ` AND client_id = ?`;
        params.push(filters.client);
    }


    if (filters.from) {
        query += ` AND timestamp >= ?`;
        params.push(`${filters.from}T00:00:00.000Z`);
    }


    if (filters.to) {
        query += ` AND timestamp < ?`;

        const nextDay = new Date(`${filters.to}T00:00:00.000Z`);

        nextDay.setUTCDate(nextDay.getUTCDate() + 1);

        params.push(nextDay.toISOString());
    }


    const result = db.prepare(query).get(...params);

    return {
        totalEvents: result.totalEvents,
        totalAmount: result.totalAmount
    };
}


module.exports = getAggregates;