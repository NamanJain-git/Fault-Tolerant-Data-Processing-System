import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

const exampleEvent = {
  source: "client_A",
  payload: {
    metric: "sale",
    amount: "1200",
    timestamp: "2024/01/01"
  }
};

function App() {

  const [events, setEvents] = useState([]);
  const [failedEvents, setFailedEvents] = useState([]);

  const [aggregates, setAggregates] = useState({
    totalEvents: 0,
    totalAmount: 0
  });

  // Submission mode
  const [submissionMode, setSubmissionMode] = useState("form");

  // Form input states
  const [source, setSource] = useState("");
  const [metric, setMetric] = useState("");
  const [amount, setAmount] = useState("");
  const [timestamp, setTimestamp] = useState("");

  // Raw JSON
  const [rawJson, setRawJson] = useState("");

  // Failure simulation
  const [simulateFailure, setSimulateFailure] = useState(false);

  // Filters
  const [filterClient, setFilterClient] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [message, setMessage] = useState("");


  const loadData = async () => {

    try {

      const params = new URLSearchParams();

      if (filterClient) {
        params.append("client", filterClient);
      }

      if (filterFrom) {
        params.append("from", filterFrom);
      }

      if (filterTo) {
        params.append("to", filterTo);
      }

      const aggregateUrl = params.toString()
        ? `${API_URL}/api/aggregates?${params.toString()}`
        : `${API_URL}/api/aggregates`;

      const [
        eventsResponse,
        failedResponse,
        aggregateResponse
      ] = await Promise.all([
        fetch(`${API_URL}/api/events`),
        fetch(`${API_URL}/api/events/failed`),
        fetch(aggregateUrl)
      ]);

      const eventsData = await eventsResponse.json();
      const failedData = await failedResponse.json();
      const aggregateData = await aggregateResponse.json();

      setEvents(eventsData);
      setFailedEvents(failedData);
      setAggregates(aggregateData);

    } catch (error) {

      console.error(error);
      setMessage("Could not load data");

    }
  };


  const submitEvent = async () => {

    let eventData;

    // FORM MODE
    if (submissionMode === "form") {

      if (!source || !metric || !amount || !timestamp) {
        setMessage("Please fill all fields");
        return;
      }

      eventData = {
        source,
        payload: {
          metric,
          amount,
          timestamp
        }
      };
    }

    // RAW JSON MODE
    else {

      if (!rawJson.trim()) {
        setMessage("Please enter raw JSON");
        return;
      }

      try {

        eventData = JSON.parse(rawJson);

      } catch (error) {

        setMessage("Invalid JSON. Please check your input.");
        return;
      }
    }

    eventData.simulateFailure = simulateFailure;

    try {

      const response = await fetch(`${API_URL}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(eventData)
      });

      const data = await response.json();

      if (data.status === "success") {
        setMessage("Event processed successfully");
      }
      else if (data.status === "duplicate") {
        setMessage("Duplicate event — already processed");
      }
      else if (data.status === "rejected") {
        setMessage(`Event rejected: ${data.message}`);
      }
      else {
        setMessage(`Event processing failed: ${data.message}`);
      }

      loadData();

    } catch (error) {

      console.error(error);
      setMessage("Could not connect to server");

    }
  };


  const loadExample = () => {
    setRawJson(JSON.stringify(exampleEvent, null, 2));
  };


  useEffect(() => {
    loadData();
  }, []);


  return (
    <div className="app">

      <h1>Fault-Tolerant Data Processing System</h1>


      {/* EVENT SUBMISSION */}

      <section className="card">

        <div className="section-header">
          <div>
            <h2>Submit Event</h2>
            <p className="section-description">
              Submit a standard event or test an unreliable raw payload.
            </p>
          </div>
        </div>


        {/* MODE TOGGLE */}

        <div className="mode-toggle">

          <button
            className={
              submissionMode === "form"
                ? "mode-button active"
                : "mode-button"
            }
            onClick={() => {
              setSubmissionMode("form");
              setMessage("");
            }}
          >
            Form Input
          </button>

          <button
            className={
              submissionMode === "json"
                ? "mode-button active"
                : "mode-button"
            }
            onClick={() => {
              setSubmissionMode("json");
              setMessage("");
            }}
          >
            Raw JSON
          </button>

        </div>


        {/* FORM INPUT */}

        {submissionMode === "form" && (

          <div className="form-grid">

            <div className="field">

              <label>Client ID</label>

              <input
                type="text"
                placeholder="e.g. client_A"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />

            </div>


            <div className="field">

              <label>Metric</label>

              <input
                type="text"
                placeholder="e.g. sale"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
              />

            </div>


            <div className="field">

              <label>Amount</label>

              <input
                type="number"
                placeholder="e.g. 1200"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

            </div>


            <div className="field">

              <label>Timestamp</label>

              <input
                type="date"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
              />

            </div>

          </div>

        )}


        {/* RAW JSON */}

        {submissionMode === "json" && (

          <div className="json-section">

            <div className="json-header">

              <label>Raw Event JSON</label>

              <button
                className="example-button"
                onClick={loadExample}
              >
                Load Example
              </button>

            </div>

            <textarea
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              rows="12"
              placeholder={`{
  "source": "client_A",
  "payload": {
    "metric": "sale",
    "amount": "1200",
    "timestamp": "2024/01/01"
  }
}`}
            />

          </div>

        )}


        {/* FAILURE TOGGLE */}

        <label className="failure-toggle">

          <input
            type="checkbox"
            checked={simulateFailure}
            onChange={(e) => setSimulateFailure(e.target.checked)}
          />

          Simulate database failure

        </label>


        <button
          className="primary-button"
          onClick={submitEvent}
        >
          Process Event
        </button>


        {message && (
          <p className="message">{message}</p>
        )}

      </section>


      {/* FILTERS */}

      <section className="card">

        <h2>Aggregation Filters</h2>

        <div className="filter-grid">

          <div className="field">

            <label>Client ID</label>

            <input
              type="text"
              placeholder="All clients"
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
            />

          </div>


          <div className="field">

            <label>From</label>

            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
            />

          </div>


          <div className="field">

            <label>To</label>

            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
            />

          </div>

        </div>


        <div className="filter-actions">

          <button
            className="primary-button"
            onClick={loadData}
          >
            Apply Filters
          </button>

          <button
            className="secondary-button"
            onClick={() => {
              setFilterClient("");
              setFilterFrom("");
              setFilterTo("");

              setTimeout(() => {
                loadData();
              }, 0);
            }}
          >
            Clear
          </button>

        </div>

      </section>


      {/* AGGREGATES */}

      <section className="stats">

        <div className="stat-card">

          <span>Total Events</span>

          <strong>
            {aggregates.totalEvents}
          </strong>

        </div>


        <div className="stat-card">

          <span>Total Amount</span>

          <strong>
            {aggregates.totalAmount}
          </strong>

        </div>

      </section>


      {/* PROCESSED EVENTS */}

      <section className="card">

        <div className="section-header">

          <div>
            <h2>Processed Events</h2>
            <p className="section-description">
              Successfully normalized and stored events.
            </p>
          </div>

        </div>


        <div className="table-container">

          <table>

            <thead>

              <tr>
                <th>Client</th>
                <th>Metric</th>
                <th>Amount</th>
                <th>Timestamp</th>
              </tr>

            </thead>

            <tbody>

              {events.length === 0 ? (

                <tr>
                  <td colSpan="4" className="empty">
                    No processed events
                  </td>
                </tr>

              ) : (

                events.map((event) => (

                  <tr key={event.id}>

                    <td>{event.client_id}</td>
                    <td>{event.metric}</td>
                    <td>{event.amount}</td>
                    <td>{event.timestamp}</td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* FAILED EVENTS */}

      <section className="card">

        <div className="section-header">

          <div>
            <h2>Rejected / Failed Events</h2>
            <p className="section-description">
              Events that could not be processed successfully.
            </p>
          </div>

        </div>


        <div className="table-container">

          <table>

            <thead>

              <tr>
                <th>Client</th>
                <th>Status</th>
                <th>Error</th>
                <th>Received</th>
              </tr>

            </thead>

            <tbody>

              {failedEvents.length === 0 ? (

                <tr>
                  <td colSpan="4" className="empty">
                    No failed or rejected events
                  </td>
                </tr>

              ) : (

                failedEvents.map((event) => (

                  <tr key={event.id}>

                    <td>
                      {event.client_id || "Unknown"}
                    </td>

                    <td>
                      {event.status}
                    </td>

                    <td>
                      {event.error_message}
                    </td>

                    <td>
                      {event.received_at}
                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </section>

    </div>
  );
}

export default App;