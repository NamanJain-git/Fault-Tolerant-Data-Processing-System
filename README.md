# Fault-Tolerant Data Processing System

A full-stack event ingestion and processing system designed to handle unreliable client data, duplicate requests, partial database failures, and consistent aggregated outputs.

## Tech Stack

* **Frontend:** React.js
* **Backend:** Node.js, Express.js
* **Database:** SQLite
* **Language:** JavaScript
* **API:** REST API

---

## 1. What assumptions did I make?

* Clients may use different field names, data types, and date formats.
* The normalization layer supports common field aliases such as `source`/`client`, `metric`/`metric_name`, `amount`/`value`, and `timestamp`/`time`/`date`.
* Missing or malformed required fields are rejected rather than guessed.
* Common date formats that can be reliably parsed are accepted; invalid dates are rejected.
* Since clients do not provide a guaranteed unique event ID, the system generates a deterministic SHA-256 deduplication key from the normalized event data.
* Two events that produce the same normalized values are treated as the same event.
* Raw input is stored separately from normalized successfully processed events.
* SQLite was chosen because the assignment is scoped as a small single-service application and explicitly asks to avoid unnecessary infrastructure.

---

## 2. How does the system prevent double counting?

Incoming data is normalized before the deduplication key is generated. This ensures that equivalent representations such as `"1200"` and `1200` are converted to the same canonical value.

A deterministic SHA-256 hash is generated from the normalized event data and stored as `dedupe_key` in the `events` table. The database also enforces a `UNIQUE` constraint on this key.

When a client retries the same event, the same deduplication key is generated. The database prevents the duplicate event from being inserted, and the API returns a duplicate response instead.

Aggregations are calculated only from successfully processed events in the `events` table. Therefore, retries do not increase event counts or totals.

---

## 3. What happens if the database fails mid-request?

Successful event processing is performed inside a database transaction.

The raw event and normalized event are written as part of the same transaction. If a database failure occurs before the transaction commits, the transaction is rolled back. This prevents a partially processed event from remaining in the processed `events` table.

The failed ingestion attempt is then recorded separately in `raw_events` with a `failed` status and error information.

If the client retries after the failure and the database is available, the event can be processed successfully. If the successfully processed event is submitted again, the deterministic deduplication key prevents it from being processed twice.

The frontend includes a **Simulate Database Failure** option to demonstrate this behavior.

---

## 4. What would break first at scale?

The SQLite database and synchronous request-processing path would be the first major limitations.

With higher concurrent write traffic, database locking and write throughput could become bottlenecks. As the number of events grows, aggregation queries could also become increasingly expensive.

At larger scale, I would consider:

* Moving from SQLite to PostgreSQL.
* Adding indexes for frequently filtered fields.
* Introducing asynchronous processing through a durable message queue.
* Separating ingestion from processing.
* Adding caching or pre-aggregated data for frequently requested aggregations.

These components were intentionally not implemented because the assignment specifically asks to avoid unnecessary infrastructure and microservices.

---

## Running the Project

### 1. Start the Backend

Open a terminal:

```bash
cd server
npm install
npm start
```

The API will run on:

```text
http://localhost:5000
```

You can verify it with:

```text
GET http://localhost:5000/api/health
```

---

### 2. Start the Frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Open the local URL displayed by Vite, usually:

```text
http://localhost:5173
```

---

## Main API Endpoints

| Method | Endpoint             | Purpose                           |
| ------ | -------------------- | --------------------------------- |
| GET    | `/api/health`        | Check server status               |
| POST   | `/api/events`        | Submit and process an event       |
| GET    | `/api/events`        | Get successfully processed events |
| GET    | `/api/raw-events`    | Get raw ingestion records         |
| GET    | `/api/events/failed` | Get rejected and failed events    |
| GET    | `/api/aggregates`    | Get aggregated event totals       |

### Aggregation Filters

The aggregation endpoint supports optional client and date filters:

```text
GET /api/aggregates?client=client_A
```

```text
GET /api/aggregates?from=2024-01-01&to=2024-01-31
```

```text
GET /api/aggregates?client=client_A&from=2024-01-01&to=2024-01-31
```

---

## Event Processing Flow

```text
Raw Client Event
       ↓
Normalization
       ↓
Validation
       ↓
Deduplication
       ↓
Database Transaction
       ↓
Successfully Processed Event
       ↓
Aggregation
```

Invalid events are rejected, duplicate events are ignored, and database failures are rolled back safely.
