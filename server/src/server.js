const express = require("express");
const cors = require("cors");

const app = express();

const db = require("./db/database");
const normalizeEvent = require("./services/normalize");
const generateDedupeKey = require("./services/dedupe");
const {
    saveEvent,
    saveRejectedEvent,
    saveFailedEvent
} = require("./services/eventService");
const getAggregates = require("./services/aggregationService");

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Server is running"
    });
})

app.get("/api/raw-events", (req, res) => {
    try {

        const rawEvents = db.prepare(`
            SELECT *
            FROM raw_events
            ORDER BY received_at DESC
        `).all();

        res.json(rawEvents);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            status: "error",
            message: "Failed to fetch raw events"
        });
    }
});

app.get("/api/events", (req, res) => {
    try {
        const events = db.prepare(`
            SELECT *
            FROM events
            ORDER BY created_at DESC
        `).all();

        res.json(events);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            status: "error",
            message: "Failed to fetch events"
        });
    }
});

app.post("/api/events", (req, res) => {

    let normalizedEvent;

    try {

        normalizedEvent = normalizeEvent(req.body);

        const dedupeKey = generateDedupeKey(normalizedEvent);

        const simulateFailure = req.body.simulateFailure === true;

        const result = saveEvent(
            normalizedEvent,
            dedupeKey,
            req.body,
            simulateFailure
        );

        res.status(201).json({
            status: "success",
            message: "Event processed successfully",
            eventId: result.lastInsertRowid,
            normalizedEvent
        });

    } catch (error) {

        // Invalid input
        if (
            error.message === "Missing source" ||
            error.message === "Missing metric" ||
            error.message === "Invalid amount" ||
            error.message === "Invalid timestamp"
        ) {

            let clientId = req.body.source || req.body.client || null;

            saveRejectedEvent(
                req.body,
                clientId,
                error.message
            );

            return res.status(400).json({
                status: "rejected",
                message: error.message
            });
        }


        // Duplicate event
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {

            return res.status(200).json({
                status: "duplicate",
                message: "Event has already been processed"
            });
        }


        // Database / unexpected failure
        console.error(error);

        let clientId = req.body.source || req.body.client || null;

        saveFailedEvent(
            req.body,
            clientId,
            error.message
        );

        return res.status(500).json({
            status: "error",
            message: "Failed to process event"
        });
    }
});

app.get("/api/aggregates", (req, res) => {
    try {

        const filters = {
            client: req.query.client,
            from: req.query.from,
            to: req.query.to
        };

        const aggregates = getAggregates(filters);

        res.json(aggregates);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            status: "error",
            message: "Failed to fetch aggregates"
        });
    }
});

app.get("/api/events/failed", (req, res) => {

    try {

        const failedEvents = db.prepare(`
            SELECT *
            FROM raw_events
            WHERE status IN ('failed', 'rejected')
            ORDER BY received_at DESC
        `).all();

        res.json(failedEvents);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            status: "error",
            message: "Failed to fetch failed events"
        });
    }
});

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});