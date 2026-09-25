const API_BASE_URL = "https://supportiq-api-pg9k.onrender.com";

const DATA_FILES = {
    metrics: "./data/dashboard_metrics.csv",
    segments: "./data/segment_dashboard.json",
    satisfaction: "./data/satisfaction_dashboard.json",
    ticketData: "./ticket_data.json",
    resolutionPriority: "./data/resolution_by_priority.json",
    resolutionType: "./data/resolution_by_type.json",
    resolutionChannel: "./data/resolution_by_channel.json"
};

let dashboardMetrics = {};
let segmentData = [];
let satisfactionData = {};
let ticketData = [];
let resolutionData = {
    priority: [],
    type: [],
    channel: []
};

let charts = {};
let currentFilteredTickets = [];

document.addEventListener("DOMContentLoaded", initializeDashboard);

async function initializeDashboard() {
    console.log("Initializing SupportIQ dashboard...");

    try {
        await Promise.allSettled([
            loadDashboardMetrics(),
            loadSegmentData(),
            loadSatisfactionData(),
            loadTicketData(),
            loadResolutionData()
        ]);

        initializeInteractiveFilters();
        updateResolutionCharts();
        updateFilteredStats();
        setupAPIAnalysis();

        console.log("SupportIQ dashboard initialized successfully.");
    } catch (error) {
        console.error("Dashboard initialization error:", error);
    }
}

/* =========================================================
   DASHBOARD METRICS
   ========================================================= */

async function loadDashboardMetrics() {
    try {
        const response = await fetch(DATA_FILES.metrics);

        if (!response.ok) {
            throw new Error(`Failed to load metrics: ${response.status}`);
        }

        const csvText = await response.text();
        dashboardMetrics = parseMetricsCSV(csvText);

        updateMetricElement(
            "total-tickets",
            formatNumber(dashboardMetrics["Total Tickets"])
        );

        updateMetricElement(
            "average-satisfaction",
            dashboardMetrics["Average Satisfaction"] !== undefined
                ? `${Number(dashboardMetrics["Average Satisfaction"]).toFixed(2)} / 5`
                : "N/A"
        );

        updateMetricElement(
            "average-resolution",
            dashboardMetrics["Average Resolution Time"] !== undefined
                ? `${Number(dashboardMetrics["Average Resolution Time"]).toFixed(2)} hrs`
                : "N/A"
        );

        updateMetricElement(
            "customer-segments",
            formatNumber(dashboardMetrics["Customer Segments"])
        );

    } catch (error) {
        console.error("Error loading dashboard metrics:", error);
    }
}

function parseMetricsCSV(csvText) {
    const result = {};

    const lines = csvText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

    if (lines.length < 2) {
        return result;
    }

    const headers = lines[0].split(",").map(header => header.trim());

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");

        if (values.length < 2) {
            continue;
        }

        const key = values[0].trim();
        const value = values.slice(1).join(",").trim();

        const numericValue = Number(value);

        result[key] = Number.isNaN(numericValue)
            ? value
            : numericValue;
    }

    return result;
}

function updateMetricElement(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function formatNumber(value) {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
        return "N/A";
    }

    return Number(value).toLocaleString();
}

/* =========================================================
   SEGMENT DATA
   ========================================================= */

async function loadSegmentData() {
    try {
        const response = await fetch(DATA_FILES.segments);

        if (!response.ok) {
            throw new Error(`Failed to load segment data: ${response.status}`);
        }

        const json = await response.json();

        if (Array.isArray(json)) {
            segmentData = json;
        } else if (Array.isArray(json.data)) {
            segmentData = json.data;
        } else if (Array.isArray(json.segments)) {
            segmentData = json.segments;
        } else {
            segmentData = [];
        }

        renderSegmentSection(segmentData);
        renderSegmentDistribution(segmentData);

    } catch (error) {
        console.error("Error loading segment data:", error);

        const container = document.getElementById("segment-container");

        if (container) {
            container.innerHTML = `
                <div class="dashboard-status error">
                    Customer segment data could not be loaded.
                </div>
            `;
        }
    }
}

function renderSegmentSection(data) {
    const container = document.getElementById("segment-container");

    if (!container) {
        console.warn("segment-container element not found.");
        return;
    }

    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = `
            <div class="dashboard-status">
                No customer segment data available.
            </div>
        `;
        return;
    }

    container.innerHTML = data.map((segment, index) => {
        const name =
            segment.segment ||
            segment.name ||
            segment.segment_name ||
            `Segment ${index + 1}`;

        const description =
            segment.description ||
            segment.profile ||
            segment.summary ||
            "Customer segment identified through clustering analysis.";

        return `
            <div class="insight-item">
                <h4>${escapeHTML(name)}</h4>
                <p>${escapeHTML(description)}</p>
            </div>
        `;
    }).join("");
}

function renderSegmentDistribution(data) {
    const canvas = document.getElementById("segment-distribution-chart");
    const legend = document.getElementById("segment-chart-legend");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const labels = data.map((segment, index) =>
        segment.segment ||
        segment.name ||
        segment.segment_name ||
        `Segment ${index + 1}`
    );

    const values = data.map(segment =>
        Number(
            segment.count ??
            segment.customer_count ??
            segment.ticket_count ??
            segment.size ??
            0
        )
    );

    if (charts.segmentDistribution) {
        charts.segmentDistribution.destroy();
    }

    charts.segmentDistribution = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data: values
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    if (legend) {
        legend.innerHTML = labels.map((label, index) => `
            <div class="legend-item">
                <span class="legend-label">
                    ${escapeHTML(label)}
                </span>
                <span class="legend-value">
                    ${formatNumber(values[index])}
                </span>
            </div>
        `).join("");
    }
}

/* =========================================================
   SATISFACTION DATA
   ========================================================= */

async function loadSatisfactionData() {
    try {
        const response = await fetch(DATA_FILES.satisfaction);

        if (!response.ok) {
            throw new Error(
                `Failed to load satisfaction data: ${response.status}`
            );
        }

        const json = await response.json();

        satisfactionData = json.data || json;

        const lowCount = Number(
            satisfactionData.low_satisfaction ??
            satisfactionData.low_satisfaction_count ??
            satisfactionData["Low Satisfaction"] ??
            1102
        );

        const satisfiedCount = Number(
            satisfactionData.satisfied ??
            satisfactionData.satisfied_count ??
            satisfactionData["Satisfied"] ??
            1667
        );

        const riskPercentage = Number(
            satisfactionData.low_satisfaction_rate ??
            satisfactionData.low_satisfaction_percentage ??
            satisfactionData["Low Satisfaction Rate"] ??
            39.8
        );

        const accuracy = Number(
            satisfactionData.model_accuracy ??
            satisfactionData.accuracy ??
            satisfactionData["Model Accuracy"] ??
            59.75
        );

        updateMetricElement(
            "low-satisfaction-count",
            formatNumber(lowCount)
        );

        updateMetricElement(
            "satisfied-count",
            formatNumber(satisfiedCount)
        );

        updateMetricElement(
            "satisfaction-risk-percentage",
            Number.isFinite(riskPercentage)
                ? `${riskPercentage.toFixed(1)}%`
                : "N/A"
        );

        updateMetricElement(
            "satisfaction-model-accuracy",
            Number.isFinite(accuracy)
                ? `${accuracy.toFixed(2)}%`
                : "N/A"
        );

    } catch (error) {
        console.error("Error loading satisfaction data:", error);

        // Known exported values from the SupportIQ dataset.
        updateMetricElement("low-satisfaction-count", "1,102");
        updateMetricElement("satisfied-count", "1,667");
        updateMetricElement("satisfaction-risk-percentage", "39.8%");
        updateMetricElement("satisfaction-model-accuracy", "59.75%");
    }
}

/* =========================================================
   TICKET DATA
   ========================================================= */

async function loadTicketData() {
    try {
        const response = await fetch(DATA_FILES.ticketData);

        if (!response.ok) {
            throw new Error(
                `Failed to load ticket data: ${response.status}`
            );
        }

        const json = await response.json();

        if (Array.isArray(json)) {
            ticketData = json;
        } else if (Array.isArray(json.data)) {
            ticketData = json.data;
        } else if (Array.isArray(json.tickets)) {
            ticketData = json.tickets;
        } else {
            ticketData = [];
        }

        ticketData = ticketData.filter(
            ticket => ticket && typeof ticket === "object"
        );

        window.supportIQTickets = ticketData;

        console.log(
            `Loaded ${ticketData.length} support tickets.`
        );

        initializeInteractiveFilters();
        populateTicketSelectorForAPI();
        updateFilteredStats();

    } catch (error) {
        console.error("Error loading ticket data:", error);

        ticketData = [];
        window.supportIQTickets = [];

        const selector = document.getElementById("ticket-selector");

        if (selector) {
            selector.innerHTML = `
                <option value="">
                    Unable to load tickets
                </option>
            `;
        }

        const preview = document.getElementById(
            "selected-ticket-preview"
        );

        if (preview) {
            preview.innerHTML = `
                <div class="dashboard-status error">
                    Ticket data could not be loaded.
                </div>
            `;
        }
    }
}

/* =========================================================
   RESOLUTION DATA
   ========================================================= */

async function loadResolutionData() {
    const files = [
        {
            key: "priority",
            file: DATA_FILES.resolutionPriority
        },
        {
            key: "type",
            file: DATA_FILES.resolutionType
        },
        {
            key: "channel",
            file: DATA_FILES.resolutionChannel
        }
    ];

    await Promise.all(
        files.map(async item => {
            try {
                const response = await fetch(item.file);

                if (!response.ok) {
                    throw new Error(
                        `Failed to load ${item.key} resolution data`
                    );
                }

                const json = await response.json();

                resolutionData[item.key] =
                    normalizeResolutionData(json);

            } catch (error) {
                console.error(
                    `Error loading ${item.key} resolution data:`,
                    error
                );

                resolutionData[item.key] = [];
            }
        })
    );
}

function normalizeResolutionData(json) {
    if (Array.isArray(json)) {
        return json;
    }

    if (Array.isArray(json.data)) {
        return json.data;
    }

    return [];
}

function updateResolutionCharts() {
    renderResolutionChart(
        "priority-chart",
        resolutionData.priority,
        "priority",
        "Priority",
        "Average Resolution Time"
    );

    renderResolutionChart(
        "type-chart",
        resolutionData.type,
        "ticket_type",
        "Ticket Type",
        "Average Resolution Time"
    );

    renderResolutionChart(
        "channel-chart",
        resolutionData.channel,
        "support_channel",
        "Support Channel",
        "Average Resolution Time"
    );
}

function renderResolutionChart(
    canvasId,
    data,
    key,
    label,
    seriesLabel
) {
    const canvas = document.getElementById(canvasId);

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    if (!Array.isArray(data) || data.length === 0) {
        return;
    }

    const labels = data.map(item =>
        item[key] ||
        item.name ||
        item.label ||
        "Unknown"
    );

    const values = data.map(item =>
        Number(
            item.average_resolution_hours ??
            item.avg_resolution_hours ??
            item.value ??
            0
        )
    );

    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    charts[canvasId] = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: seriesLabel,
                data: values
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Hours"
                    }
                }
            }
        }
    });
}

/* =========================================================
   FILTERS
   ========================================================= */

function initializeInteractiveFilters() {
    const priorityFilter =
        document.getElementById("priority-filter");

    const typeFilter =
        document.getElementById("ticket-type-filter");

    const channelFilter =
        document.getElementById("channel-filter");

    const segmentFilter =
        document.getElementById("segment-filter");

    const resetButton =
        document.getElementById("reset-filters");

    populateFilter(
        priorityFilter,
        getUniqueValues(ticketData, "Ticket Priority")
    );

    populateFilter(
        typeFilter,
        getUniqueValues(ticketData, "Ticket Type")
    );

    populateFilter(
        channelFilter,
        getUniqueValues(ticketData, "Ticket Channel")
    );

    populateSegmentFilter(segmentFilter);

    [
        priorityFilter,
        typeFilter,
        channelFilter,
        segmentFilter
    ].forEach(filter => {
        if (filter) {
            filter.removeEventListener(
                "change",
                handleFilterChange
            );

            filter.addEventListener(
                "change",
                handleFilterChange
            );
        }
    });

    if (resetButton) {
        resetButton.removeEventListener(
            "click",
            resetAllFilters
        );

        resetButton.addEventListener(
            "click",
            resetAllFilters
        );
    }

    updateFilteredStats();
}

function populateFilter(selectElement, values) {
    if (!selectElement) {
        return;
    }

    const currentValue = selectElement.value;

    selectElement.innerHTML =
        `<option value="all">All</option>`;

    values.forEach(value => {
        if (value === null || value === undefined || value === "") {
            return;
        }

        const option = document.createElement("option");

        option.value = String(value);
        option.textContent = String(value);

        selectElement.appendChild(option);
    });

    if (
        Array.from(selectElement.options)
            .some(option => option.value === currentValue)
    ) {
        selectElement.value = currentValue;
    }
}

function populateSegmentFilter(selectElement) {
    if (!selectElement) {
        return;
    }

    selectElement.innerHTML =
        `<option value="all">All</option>`;

    const segments = new Set();

    segmentData.forEach(segment => {
        const name =
            segment.segment ||
            segment.name ||
            segment.segment_name;

        if (name) {
            segments.add(String(name));
        }
    });

    Array.from(segments)
        .sort()
        .forEach(segment => {
            const option = document.createElement("option");

            option.value = segment;
            option.textContent = segment;

            selectElement.appendChild(option);
        });
}

function getUniqueValues(data, field) {
    return [
        ...new Set(
            data
                .map(item => item[field])
                .filter(value =>
                    value !== undefined &&
                    value !== null &&
                    value !== ""
                )
        )
    ].sort();
}

function handleFilterChange() {
    updateFilteredStats();
}

function resetAllFilters() {
    const filters = [
        "priority-filter",
        "ticket-type-filter",
        "channel-filter",
        "segment-filter"
    ];

    filters.forEach(id => {
        const element = document.getElementById(id);

        if (element) {
            element.value = "all";
        }
    });

    updateFilteredStats();
}

/* =========================================================
   FILTERED TICKETS
   ========================================================= */

function getFilteredTickets() {
    const priority =
        document.getElementById("priority-filter")?.value || "all";

    const type =
        document.getElementById("ticket-type-filter")?.value || "all";

    const channel =
        document.getElementById("channel-filter")?.value || "all";

    const segment =
        document.getElementById("segment-filter")?.value || "all";

    return ticketData.filter(ticket => {
        const priorityMatch =
            priority === "all" ||
            String(ticket["Ticket Priority"]) === priority;

        const typeMatch =
            type === "all" ||
            String(ticket["Ticket Type"]) === type;

        const channelMatch =
            channel === "all" ||
            String(ticket["Ticket Channel"]) === channel;

        const segmentMatch =
            segment === "all" ||
            inferSegment(ticket) === segment;

        return (
            priorityMatch &&
            typeMatch &&
            channelMatch &&
            segmentMatch
        );
    });
}

function updateFilteredStats() {
    const filtered = getFilteredTickets();

    currentFilteredTickets = filtered;

    const ticketCountElement =
        document.getElementById("filtered-ticket-count");

    const satisfactionElement =
        document.getElementById("filtered-satisfaction");

    const resolutionElement =
        document.getElementById("filtered-resolution");

    if (ticketCountElement) {
        ticketCountElement.textContent =
            formatNumber(filtered.length);
    }

    const satisfactionValues = filtered
        .map(ticket =>
            Number(ticket["Customer Satisfaction Rating"])
        )
        .filter(value => Number.isFinite(value));

    if (satisfactionElement) {
        if (satisfactionValues.length > 0) {
            const average =
                satisfactionValues.reduce(
                    (sum, value) => sum + value,
                    0
                ) / satisfactionValues.length;

            satisfactionElement.textContent =
                `${average.toFixed(2)} / 5`;
        } else {
            satisfactionElement.textContent = "N/A";
        }
    }

    if (resolutionElement) {
        const resolutionAverage =
            getFilteredResolutionAverage(filtered);

        resolutionElement.textContent =
            resolutionAverage !== null
                ? `${resolutionAverage.toFixed(2)} hrs`
                : "See analytics";
    }

    updateResolutionCharts();
}

function getFilteredResolutionAverage(filteredTickets) {
    if (!filteredTickets.length) {
        return null;
    }

    const priorities = new Set(
        filteredTickets
            .map(ticket => ticket["Ticket Priority"])
            .filter(Boolean)
    );

    const types = new Set(
        filteredTickets
            .map(ticket => ticket["Ticket Type"])
            .filter(Boolean)
    );

    const channels = new Set(
        filteredTickets
            .map(ticket => ticket["Ticket Channel"])
            .filter(Boolean)
    );

    // Use aggregate data only when exactly one dimension
    // is selected. Do not invent ticket-level resolution
    // values because the raw ticket data has no complete
    // Time to Resolution field.

    if (priorities.size === 1) {
        const priority = [...priorities][0];

        const match = resolutionData.priority.find(
            item =>
                String(item.priority) === String(priority)
        );

        if (match) {
            return Number(match.average_resolution_hours);
        }
    }

    if (types.size === 1) {
        const type = [...types][0];

        const match = resolutionData.type.find(
            item =>
                String(
                    item.ticket_type ??
                    item.type
                ) === String(type)
        );

        if (match) {
            return Number(match.average_resolution_hours);
        }
    }

    if (channels.size === 1) {
        const channel = [...channels][0];

        const match = resolutionData.channel.find(
            item =>
                String(
                    item.support_channel ??
                    item.channel
                ) === String(channel)
        );

        if (match) {
            return Number(match.average_resolution_hours);
        }
    }

    return null;
}

/* =========================================================
   SEGMENT INFERENCE
   ========================================================= */

function inferSegment(ticket) {
    const age = Number(ticket["Customer Age"]);
    const satisfaction = Number(
        ticket["Customer Satisfaction Rating"]
    );

    const resolution = Number(
        ticket["Time to Resolution"]
    );

    if (!Number.isFinite(age)) {
        return null;
    }

    if (
        Number.isFinite(satisfaction) &&
        satisfaction <= 2
    ) {
        return age >= 50
            ? "Older - At Risk and Fast"
            : "Younger - At Risk";
    }

    if (
        Number.isFinite(satisfaction) &&
        satisfaction >= 4
    ) {
        return age >= 50
            ? "Older - Satisfied"
            : "Younger - Satisfied";
    }

    if (Number.isFinite(resolution)) {
        return resolution <= 12
            ? "Fast Resolution"
            : "Slow Resolution";
    }

    return "Other";
}

/* =========================================================
   AI TICKET ANALYSIS
   ========================================================= */

function setupAPIAnalysis() {
    const button =
        document.getElementById("analyze-ticket-button");

    if (!button) {
        return;
    }

    button.removeEventListener(
        "click",
        analyzeSelectedTicket
    );

    button.addEventListener(
        "click",
        analyzeSelectedTicket
    );

    populateTicketSelectorForAPI();
}

function populateTicketSelectorForAPI() {
    const selector =
        document.getElementById("ticket-selector");

    if (!selector) {
        return;
    }

    selector.innerHTML =
        `<option value="">Select a ticket</option>`;

    ticketData.slice(0, 500).forEach((ticket, index) => {
        const option = document.createElement("option");

        option.value = index;

        const ticketId =
            ticket["Ticket ID"] ??
            index + 1;

        const subject =
            ticket["Ticket Subject"] ??
            "Support ticket";

        option.textContent =
            `#${ticketId} — ${subject}`;

        selector.appendChild(option);
    });

    selector.removeEventListener(
        "change",
        handleTicketSelection
    );

    selector.addEventListener(
        "change",
        handleTicketSelection
    );
}

function handleTicketSelection(event) {
    const index = Number(event.target.value);

    if (
        event.target.value === "" ||
        !Number.isInteger(index) ||
        !ticketData[index]
    ) {
        return;
    }

    renderSelectedTicketPreview(ticketData[index]);
}

function renderSelectedTicketPreview(ticket) {
    const preview =
        document.getElementById(
            "selected-ticket-preview"
        );

    if (!preview) {
        return;
    }

    const ticketId =
        ticket["Ticket ID"] ?? "N/A";

    const subject =
        ticket["Ticket Subject"] ?? "N/A";

    const priority =
        ticket["Ticket Priority"] ?? "N/A";

    const type =
        ticket["Ticket Type"] ?? "N/A";

    const channel =
        ticket["Ticket Channel"] ?? "N/A";

    preview.innerHTML = `
        <div class="ticket-preview-card">
            <h4>Ticket #${escapeHTML(ticketId)}</h4>
            <p><strong>Subject:</strong>
                ${escapeHTML(subject)}
            </p>
            <p><strong>Priority:</strong>
                ${escapeHTML(priority)}
            </p>
            <p><strong>Type:</strong>
                ${escapeHTML(type)}
            </p>
            <p><strong>Channel:</strong>
                ${escapeHTML(channel)}
            </p>
        </div>
    `;
}

async function analyzeSelectedTicket() {
    const selector =
        document.getElementById("ticket-selector");

    const result =
        document.getElementById("ai-analysis-result");

    const button =
        document.getElementById("analyze-ticket-button");

    if (!selector || !result) {
        return;
    }

    const index = Number(selector.value);

    if (
        selector.value === "" ||
        !ticketData[index]
    ) {
        result.innerHTML = `
            <div class="dashboard-status">
                Please select a ticket first.
            </div>
        `;
        return;
    }

    const ticket = ticketData[index];

    if (button) {
        button.disabled = true;
        button.textContent = "Analyzing...";
    }

    result.innerHTML = `
        <div class="dashboard-status">
            Analyzing ticket...
        </div>
    `;

    const payload = {
        customer_age: Number(
            ticket["Customer Age"]
        ) || 0,

        ticket_priority:
            ticket["Ticket Priority"] || "",

        ticket_type:
            ticket["Ticket Type"] || "",

        support_channel:
            ticket["Ticket Channel"] || "",

        ticket_description:
            ticket["Ticket Description"] ||
            ticket["Ticket Subject"] ||
            ""
    };

    try {
        const response = await fetch(
            `${API_BASE_URL}/analyze`,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify(payload)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail ||
                `API request failed: ${response.status}`
            );
        }

        renderAPIAnalysisResult(data);

    } catch (error) {
        console.error(
            "AI ticket analysis error:",
            error
        );

        result.innerHTML = `
            <div class="dashboard-status error">
                Unable to analyze this ticket.
                Please check that the backend API is running.
                <br>
                <small>${escapeHTML(
                    error.message
                )}</small>
            </div>
        `;
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Analyze Selected Ticket";
        }
    }
}

function renderAPIAnalysisResult(data) {
    const result =
        document.getElementById("ai-analysis-result");

    if (!result) {
        return;
    }

    const risk =
        data.satisfaction_risk ??
        data.risk ??
        "Unknown";

    const probability =
        data.risk_probability ??
        data.satisfaction_risk_probability;

    const keywords =
        data.keywords ||
        data.extracted_keywords ||
        [];

    result.innerHTML = `
        <div class="ai-analysis-card">
            <h4>AI Ticket Analysis</h4>

            <div class="analysis-row">
                <strong>Satisfaction Risk:</strong>
                <span>${escapeHTML(risk)}</span>
            </div>

            ${
                probability !== undefined
                    ? `
                    <div class="analysis-row">
                        <strong>Risk Probability:</strong>
                        <span>
                            ${(
                                Number(probability) * 100
                            ).toFixed(2)}%
                        </span>
                    </div>
                    `
                    : ""
            }

            <div class="analysis-row">
                <strong>Extracted Keywords:</strong>
                <span>
                    ${
                        Array.isArray(keywords)
                            ? keywords
                                .map(
                                    keyword =>
                                        escapeHTML(keyword)
                                )
                                .join(", ")
                            : escapeHTML(keywords)
                    }
                </span>
            </div>
        </div>
    `;
}

/* =========================================================
   HELPERS
   ========================================================= */

function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
/* =========================================================
   ADDITIONAL DASHBOARD UTILITIES
   ========================================================= */

function getTicketField(ticket, possibleFields) {
    if (!ticket || !Array.isArray(possibleFields)) {
        return null;
    }

    for (const field of possibleFields) {
        if (
            Object.prototype.hasOwnProperty.call(
                ticket,
                field
            ) &&
            ticket[field] !== null &&
            ticket[field] !== undefined &&
            ticket[field] !== ""
        ) {
            return ticket[field];
        }
    }

    return null;
}

function getTicketId(ticket) {
    return getTicketField(ticket, [
        "Ticket ID",
        "ticket_id",
        "TicketID",
        "id"
    ]);
}

function getCustomerEmail(ticket) {
    return getTicketField(ticket, [
        "Customer Email",
        "customer_email",
        "CustomerEmail",
        "email"
    ]);
}

function getCustomerAge(ticket) {
    const value = getTicketField(ticket, [
        "Customer Age",
        "customer_age",
        "Age",
        "age"
    ]);

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}

function getCustomerSatisfaction(ticket) {
    const value = getTicketField(ticket, [
        "Customer Satisfaction Rating",
        "customer_satisfaction_rating",
        "Satisfaction Rating",
        "satisfaction"
    ]);

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}

function getTicketPriority(ticket) {
    return getTicketField(ticket, [
        "Ticket Priority",
        "ticket_priority",
        "Priority",
        "priority"
    ]);
}

function getTicketType(ticket) {
    return getTicketField(ticket, [
        "Ticket Type",
        "ticket_type",
        "Type",
        "type"
    ]);
}

function getTicketChannel(ticket) {
    return getTicketField(ticket, [
        "Ticket Channel",
        "ticket_channel",
        "Support Channel",
        "support_channel",
        "Channel",
        "channel"
    ]);
}

function getTicketSubject(ticket) {
    return getTicketField(ticket, [
        "Ticket Subject",
        "ticket_subject",
        "Subject",
        "subject"
    ]);
}

function getTicketDescription(ticket) {
    return getTicketField(ticket, [
        "Ticket Description",
        "ticket_description",
        "Description",
        "description"
    ]);
}

/* =========================================================
   TICKET STATUS HELPERS
   ========================================================= */

function getTicketStatus(ticket) {
    return getTicketField(ticket, [
        "Ticket Status",
        "ticket_status",
        "Status",
        "status"
    ]);
}

function isClosedTicket(ticket) {
    const status = getTicketStatus(ticket);

    if (!status) {
        return false;
    }

    return String(status)
        .trim()
        .toLowerCase() === "closed";
}

/* =========================================================
   SATISFACTION HELPERS
   ========================================================= */

function isLowSatisfaction(ticket) {
    const satisfaction =
        getCustomerSatisfaction(ticket);

    return (
        satisfaction !== null &&
        satisfaction <= 2
    );
}

function isSatisfied(ticket) {
    const satisfaction =
        getCustomerSatisfaction(ticket);

    return (
        satisfaction !== null &&
        satisfaction >= 4
    );
}

function calculateAverage(values) {
    const numericValues = values
        .map(Number)
        .filter(Number.isFinite);

    if (numericValues.length === 0) {
        return null;
    }

    const total = numericValues.reduce(
        (sum, value) => sum + value,
        0
    );

    return total / numericValues.length;
}

function calculateTicketSatisfaction(tickets) {
    if (!Array.isArray(tickets)) {
        return null;
    }

    const values = tickets
        .map(getCustomerSatisfaction)
        .filter(value => value !== null);

    return calculateAverage(values);
}

function calculateLowSatisfactionRate(tickets) {
    if (!Array.isArray(tickets) || tickets.length === 0) {
        return null;
    }

    const ratedTickets = tickets.filter(
        ticket =>
            getCustomerSatisfaction(ticket) !== null
    );

    if (ratedTickets.length === 0) {
        return null;
    }

    const lowSatisfactionTickets =
        ratedTickets.filter(isLowSatisfaction);

    return (
        lowSatisfactionTickets.length /
        ratedTickets.length
    ) * 100;
}

/* =========================================================
   FILTER SUMMARY
   ========================================================= */

function calculateFilteredSummary(tickets) {
    const totalTickets = tickets.length;

    const satisfaction =
        calculateTicketSatisfaction(tickets);

    const lowSatisfactionRate =
        calculateLowSatisfactionRate(tickets);

    const lowSatisfactionCount =
        tickets.filter(isLowSatisfaction).length;

    const satisfiedCount =
        tickets.filter(isSatisfied).length;

    return {
        totalTickets,
        satisfaction,
        lowSatisfactionRate,
        lowSatisfactionCount,
        satisfiedCount
    };
}

function renderFilteredSummary(summary) {
    const countElement =
        document.getElementById(
            "filtered-ticket-count"
        );

    const satisfactionElement =
        document.getElementById(
            "filtered-satisfaction"
        );

    const riskElement =
        document.getElementById(
            "filtered-risk"
        );

    if (countElement) {
        countElement.textContent =
            formatNumber(summary.totalTickets);
    }

    if (satisfactionElement) {
        satisfactionElement.textContent =
            summary.satisfaction !== null
                ? `${summary.satisfaction.toFixed(2)} / 5`
                : "N/A";
    }

    if (riskElement) {
        riskElement.textContent =
            summary.lowSatisfactionRate !== null
                ? `${summary.lowSatisfactionRate.toFixed(1)}%`
                : "N/A";
    }
}

/* =========================================================
   FILTERED TICKET DETAILS
   ========================================================= */

function getActiveFilters() {
    return {
        priority:
            document.getElementById(
                "priority-filter"
            )?.value || "all",

        type:
            document.getElementById(
                "ticket-type-filter"
            )?.value || "all",

        channel:
            document.getElementById(
                "channel-filter"
            )?.value || "all",

        segment:
            document.getElementById(
                "segment-filter"
            )?.value || "all"
    };
}

function ticketMatchesFilters(ticket, filters) {
    const priority =
        getTicketPriority(ticket);

    const type =
        getTicketType(ticket);

    const channel =
        getTicketChannel(ticket);

    const segment =
        inferSegment(ticket);

    const priorityMatches =
        filters.priority === "all" ||
        String(priority) ===
            String(filters.priority);

    const typeMatches =
        filters.type === "all" ||
        String(type) ===
            String(filters.type);

    const channelMatches =
        filters.channel === "all" ||
        String(channel) ===
            String(filters.channel);

    const segmentMatches =
        filters.segment === "all" ||
        String(segment) ===
            String(filters.segment);

    return (
        priorityMatches &&
        typeMatches &&
        channelMatches &&
        segmentMatches
    );
}

/* =========================================================
   RESOLUTION HELPERS
   ========================================================= */

function normalizeResolutionValue(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return null;
    }

    return number;
}

function findResolutionValue(
    collection,
    fieldNames,
    targetValue
) {
    if (
        !Array.isArray(collection) ||
        targetValue === null ||
        targetValue === undefined
    ) {
        return null;
    }

    const target =
        String(targetValue)
            .trim()
            .toLowerCase();

    const item = collection.find(entry => {
        if (!entry || typeof entry !== "object") {
            return false;
        }

        for (const field of fieldNames) {
            if (
                entry[field] !== undefined &&
                entry[field] !== null
            ) {
                const value =
                    String(entry[field])
                        .trim()
                        .toLowerCase();

                if (value === target) {
                    return true;
                }
            }
        }

        return false;
    });

    if (!item) {
        return null;
    }

    const resolution =
        item.average_resolution_hours ??
        item.avg_resolution_hours ??
        item.average_resolution ??
        item.value;

    return normalizeResolutionValue(
        resolution
    );
}

function getPriorityResolution(priority) {
    return findResolutionValue(
        resolutionData.priority,
        [
            "priority",
            "Ticket Priority",
            "ticket_priority"
        ],
        priority
    );
}

function getTypeResolution(type) {
    return findResolutionValue(
        resolutionData.type,
        [
            "ticket_type",
            "Ticket Type",
            "type"
        ],
        type
    );
}

function getChannelResolution(channel) {
    return findResolutionValue(
        resolutionData.channel,
        [
            "support_channel",
            "Support Channel",
            "channel",
            "Ticket Channel"
        ],
        channel
    );
}

/* =========================================================
   FILTERED RESOLUTION EXPLANATION
   ========================================================= */

function getResolutionExplanation() {
    const filters = getActiveFilters();

    const selectedDimensions = [];

    if (filters.priority !== "all") {
        selectedDimensions.push("priority");
    }

    if (filters.type !== "all") {
        selectedDimensions.push("ticket type");
    }

    if (filters.channel !== "all") {
        selectedDimensions.push("support channel");
    }

    if (selectedDimensions.length === 0) {
        return "See analytics";
    }

    if (selectedDimensions.length > 1) {
        return "See analytics";
    }

    return "See analytics";
}

/* =========================================================
   UPDATED FILTERED RESOLUTION
   ========================================================= */

function calculateFilteredResolution(tickets) {
    if (
        !Array.isArray(tickets) ||
        tickets.length === 0
    ) {
        return null;
    }

    /*
     * The source ticket_data.json does not contain
     * complete ticket-level Time to Resolution values.
     *
     * Therefore this function intentionally does not
     * calculate a fake average from missing values.
     */

    const filters = getActiveFilters();

    if (filters.priority !== "all") {
        return getPriorityResolution(
            filters.priority
        );
    }

    if (filters.type !== "all") {
        return getTypeResolution(
            filters.type
        );
    }

    if (filters.channel !== "all") {
        return getChannelResolution(
            filters.channel
        );
    }

    return null;
}

/* =========================================================
   RESOLUTION UI
   ========================================================= */

function updateFilteredResolutionDisplay(tickets) {
    const element =
        document.getElementById(
            "filtered-resolution"
        );

    if (!element) {
        return;
    }

    const value =
        calculateFilteredResolution(tickets);

    if (value === null) {
        element.textContent =
            getResolutionExplanation();
        return;
    }

    element.textContent =
        `${value.toFixed(2)} hrs`;
}

/* =========================================================
   FILTERED DASHBOARD UPDATE
   ========================================================= */

function refreshFilteredDashboard() {
    const filters = getActiveFilters();

    const filteredTickets =
        ticketData.filter(ticket =>
            ticketMatchesFilters(
                ticket,
                filters
            )
        );

    currentFilteredTickets =
        filteredTickets;

    const summary =
        calculateFilteredSummary(
            filteredTickets
        );

    renderFilteredSummary(summary);

    updateFilteredResolutionDisplay(
        filteredTickets
    );

    updateResolutionCharts();

    return filteredTickets;
}

/* =========================================================
   IMPROVED FILTER INITIALIZATION
   ========================================================= */

function setupFilterListeners() {
    const filterIds = [
        "priority-filter",
        "ticket-type-filter",
        "channel-filter",
        "segment-filter"
    ];

    filterIds.forEach(id => {
        const element =
            document.getElementById(id);

        if (!element) {
            return;
        }

        element.addEventListener(
            "change",
            refreshFilteredDashboard
        );
    });

    const resetButton =
        document.getElementById(
            "reset-filters"
        );

    if (resetButton) {
        resetButton.addEventListener(
            "click",
            () => {
                filterIds.forEach(id => {
                    const element =
                        document.getElementById(id);

                    if (element) {
                        element.value = "all";
                    }
                });

                refreshFilteredDashboard();
            }
        );
    }
}

/* =========================================================
   TICKET PREVIEW
   ========================================================= */

function createTicketPreviewHTML(ticket) {
    const ticketId =
        getTicketId(ticket) ?? "N/A";

    const email =
        getCustomerEmail(ticket) ?? "N/A";

    const age =
        getCustomerAge(ticket);

    const priority =
        getTicketPriority(ticket) ?? "N/A";

    const type =
        getTicketType(ticket) ?? "N/A";

    const channel =
        getTicketChannel(ticket) ?? "N/A";

    const subject =
        getTicketSubject(ticket) ?? "N/A";

    const description =
        getTicketDescription(ticket) ?? "N/A";

    const satisfaction =
        getCustomerSatisfaction(ticket);

    return `
        <div class="ticket-preview-card">

            <div class="ticket-preview-header">
                <h4>
                    Ticket #${escapeHTML(ticketId)}
                </h4>
            </div>

            <div class="ticket-preview-grid">

                <div>
                    <strong>Customer Email</strong>
                    <span>
                        ${escapeHTML(email)}
                    </span>
                </div>

                <div>
                    <strong>Customer Age</strong>
                    <span>
                        ${
                            age !== null
                                ? escapeHTML(age)
                                : "N/A"
                        }
                    </span>
                </div>

                <div>
                    <strong>Priority</strong>
                    <span>
                        ${escapeHTML(priority)}
                    </span>
                </div>

                <div>
                    <strong>Ticket Type</strong>
                    <span>
                        ${escapeHTML(type)}
                    </span>
                </div>

                <div>
                    <strong>Channel</strong>
                    <span>
                        ${escapeHTML(channel)}
                    </span>
                </div>

                <div>
                    <strong>Satisfaction</strong>
                    <span>
                        ${
                            satisfaction !== null
                                ? `${satisfaction} / 5`
                                : "N/A"
                        }
                    </span>
                </div>

            </div>

            <div class="ticket-preview-content">

                <div>
                    <strong>Subject</strong>
                    <p>
                        ${escapeHTML(subject)}
                    </p>
                </div>

                <div>
                    <strong>Description</strong>
                    <p>
                        ${escapeHTML(description)}
                    </p>
                </div>

            </div>

        </div>
    `;
}

function updateTicketPreview(ticket) {
    const preview =
        document.getElementById(
            "selected-ticket-preview"
        );

    if (!preview) {
        return;
    }

    if (!ticket) {
        preview.innerHTML = `
            <div class="dashboard-status">
                Select a ticket to preview its details.
            </div>
        `;

        return;
    }

    preview.innerHTML =
        createTicketPreviewHTML(ticket);
}

/* =========================================================
   TICKET SELECTOR EVENTS
   ========================================================= */

function setupTicketSelector() {
    const selector =
        document.getElementById(
            "ticket-selector"
        );

    if (!selector) {
        return;
    }

    selector.addEventListener(
        "change",
        event => {
            const value =
                event.target.value;

            if (value === "") {
                updateTicketPreview(null);
                return;
            }

            const index =
                Number(value);

            if (
                !Number.isInteger(index) ||
                !ticketData[index]
            ) {
                updateTicketPreview(null);
                return;
            }

            updateTicketPreview(
                ticketData[index]
            );
        }
    );
}

/* =========================================================
   POPULATE AI TICKET SELECTOR
   ========================================================= */

function populateAITicketSelector() {
    const selector =
        document.getElementById(
            "ticket-selector"
        );

    if (!selector) {
        return;
    }

    selector.innerHTML = `
        <option value="">
            Select a ticket
        </option>
    `;

    if (
        !Array.isArray(ticketData) ||
        ticketData.length === 0
    ) {
        selector.innerHTML = `
            <option value="">
                No tickets available
            </option>
        `;

        return;
    }

    /*
     * Limit the number of options so the browser
     * does not have to render thousands of options.
     */

    const ticketsToShow =
        ticketData.slice(0, 500);

    ticketsToShow.forEach(
        (ticket, index) => {
            const option =
                document.createElement(
                    "option"
                );

            const id =
                getTicketId(ticket) ??
                index + 1;

            const subject =
                getTicketSubject(ticket) ??
                "Support ticket";

            option.value =
                String(index);

            option.textContent =
                `#${id} — ${subject}`;

            selector.appendChild(option);
        }
    );

    setupTicketSelector();
}

/* =========================================================
   API RESPONSE HELPERS
   ========================================================= */

function getAPIValue(
    object,
    possibleKeys,
    fallback = null
) {
    if (
        !object ||
        typeof object !== "object"
    ) {
        return fallback;
    }

    for (const key of possibleKeys) {
        if (
            Object.prototype.hasOwnProperty.call(
                object,
                key
            ) &&
            object[key] !== undefined &&
            object[key] !== null
        ) {
            return object[key];
        }
    }

    return fallback;
}

function normalizeProbability(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return null;
    }

    if (number > 1) {
        return number;
    }

    return number * 100;
}

function normalizeKeywords(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === "string") {
        return value
            .split(",")
            .map(item => item.trim())
            .filter(Boolean);
    }

    return [];
}

/* =========================================================
   API ANALYSIS RESULT
   ========================================================= */

function renderDetailedAPIResult(data) {
    const result =
        document.getElementById(
            "ai-analysis-result"
        );

    if (!result) {
        return;
    }

    const risk =
        getAPIValue(
            data,
            [
                "satisfaction_risk",
                "risk",
                "risk_level",
                "prediction"
            ],
            "Unknown"
        );

    const probability =
        normalizeProbability(
            getAPIValue(
                data,
                [
                    "risk_probability",
                    "satisfaction_risk_probability",
                    "probability"
                ]
            )
        );

    const keywords =
        normalizeKeywords(
            getAPIValue(
                data,
                [
                    "keywords",
                    "extracted_keywords"
                ],
                []
            )
        );

    const tfidf =
        getAPIValue(
            data,
            [
                "tfidf_analysis",
                "text_analysis",
                "tfidf"
            ]
        );

    const riskClass =
        String(risk)
            .toLowerCase()
            .includes("low")
            ? "low-risk"
            : String(risk)
                .toLowerCase()
                .includes("high")
                ? "high-risk"
                : "medium-risk";

    result.innerHTML = `
        <div class="ai-analysis-card">

            <div class="analysis-header">
                <h4>AI Ticket Analysis</h4>
            </div>

            <div class="analysis-grid">

                <div class="analysis-item">
                    <span class="analysis-label">
                        Satisfaction Risk
                    </span>

                    <span class="analysis-value ${riskClass}">
                        ${escapeHTML(risk)}
                    </span>
                </div>

                ${
                    probability !== null
                        ? `
                        <div class="analysis-item">
                            <span class="analysis-label">
                                Risk Probability
                            </span>

                            <span class="analysis-value">
                                ${probability.toFixed(2)}%
                            </span>
                        </div>
                        `
                        : ""
                }

            </div>

            ${
                keywords.length > 0
                    ? `
                    <div class="analysis-section">
                        <strong>
                            Extracted Keywords
                        </strong>

                        <div class="keyword-list">
                            ${keywords
                                .map(
                                    keyword => `
                                        <span class="keyword">
                                            ${escapeHTML(
                                                keyword
                                            )}
                                        </span>
                                    `
                                )
                                .join("")}
                        </div>
                    </div>
                    `
                    : ""
            }

            ${
                tfidf
                    ? `
                    <div class="analysis-section">
                        <strong>
                            Text Analysis
                        </strong>

                        <pre class="tfidf-output">${escapeHTML(
                            typeof tfidf === "string"
                                ? tfidf
                                : JSON.stringify(
                                    tfidf,
                                    null,
                                    2
                                )
                        )}</pre>
                    </div>
                    `
                    : ""
            }

        </div>
    `;
}

/* =========================================================
   API HEALTH CHECK
   ========================================================= */

async function checkAPIHealth() {
    try {
        const response =
            await fetch(
                `${API_BASE_URL}/health`
            );

        if (!response.ok) {
            return false;
        }

        const data =
            await response.json();

        return (
            data.status === "healthy" ||
            data.status === "ok" ||
            response.ok
        );

    } catch (error) {
        console.error(
            "API health check failed:",
            error
        );

        return false;
    }
}

/* =========================================================
   DASHBOARD STATUS
   ========================================================= */

function showDashboardStatus(
    message,
    type = "info"
) {
    const status =
        document.getElementById(
            "dashboard-status"
        );

    if (!status) {
        return;
    }

    status.className =
        `dashboard-status ${type}`;

    status.textContent =
        message;
}

function clearDashboardStatus() {
    const status =
        document.getElementById(
            "dashboard-status"
        );

    if (!status) {
        return;
    }

    status.textContent = "";
    status.className =
        "dashboard-status";
}

/* =========================================================
   SAFE JSON FETCH
   ========================================================= */

async function fetchJSON(url) {
    const response =
        await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Request failed with status ${response.status}`
        );
    }

    return response.json();
}

async function fetchText(url) {
    const response =
        await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Request failed with status ${response.status}`
        );
    }

    return response.text();
}

/* =========================================================
   GENERIC CHART CLEANUP
   ========================================================= */

function destroyChart(chartKey) {
    if (
        charts[chartKey] &&
        typeof charts[chartKey].destroy ===
            "function"
    ) {
        charts[chartKey].destroy();
        charts[chartKey] = null;
    }
}

function destroyAllCharts() {
    Object.keys(charts).forEach(
        destroyChart
    );
}

/* =========================================================
   NUMBER FORMATTING
   ========================================================= */

function formatDecimal(
    value,
    decimals = 2
) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "N/A";
    }

    return number.toFixed(decimals);
}

function formatPercentage(
    value,
    decimals = 1
) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "N/A";
    }

    return `${number.toFixed(decimals)}%`;
}

/* =========================================================
   DOM SAFETY HELPERS
   ========================================================= */

function setTextContent(
    id,
    value
) {
    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            value;
    }
}

function setHTML(
    id,
    html
) {
    const element =
        document.getElementById(id);

    if (element) {
        element.innerHTML =
            html;
    }
}

function elementExists(id) {
    return Boolean(
        document.getElementById(id)
    );
}

/* =========================================================
   DASHBOARD INITIALIZATION HELPERS
   ========================================================= */

function finalizeDashboardInitialization() {
    try {
        initializeInteractiveFilters();
    } catch (error) {
        console.error(
            "Filter initialization failed:",
            error
        );
    }

    try {
        populateAITicketSelector();
    } catch (error) {
        console.error(
            "Ticket selector initialization failed:",
            error
        );
    }

    try {
        updateFilteredStats();
    } catch (error) {
        console.error(
            "Filtered stats update failed:",
            error
        );
    }

    try {
        updateResolutionCharts();
    } catch (error) {
        console.error(
            "Resolution chart update failed:",
            error
        );
    }

    try {
        setupAPIAnalysis();
    } catch (error) {
        console.error(
            "API analysis initialization failed:",
            error
        );
    }
}

/* =========================================================
   WINDOW EXPORTS
   ========================================================= */

window.supportIQ = {
    getFilteredTickets,
    refreshFilteredDashboard,
    calculateTicketSatisfaction,
    calculateLowSatisfactionRate,
    calculateFilteredResolution,
    checkAPIHealth,
    destroyAllCharts
};

window.supportIQTickets =
    ticketData;
/* =========================================================
   SEGMENT ANALYTICS UTILITIES
   ========================================================= */

function getSegmentNames() {
    if (!Array.isArray(segmentData)) {
        return [];
    }

    return segmentData
        .map(segment =>
            segment.segment ||
            segment.name ||
            segment.segment_name
        )
        .filter(Boolean);
}

function getSegmentByName(name) {
    if (!name || !Array.isArray(segmentData)) {
        return null;
    }

    return segmentData.find(segment => {
        const segmentName =
            segment.segment ||
            segment.name ||
            segment.segment_name;

        return String(segmentName) === String(name);
    }) || null;
}

function getSegmentCount(segment) {
    if (!segment) {
        return 0;
    }

    const value =
        segment.count ??
        segment.customer_count ??
        segment.ticket_count ??
        segment.size ??
        segment.total ??
        0;

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}

function getSegmentPercentage(segment) {
    if (!segment) {
        return null;
    }

    const value =
        segment.percentage ??
        segment.percent ??
        segment.share;

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}

/* =========================================================
   SEGMENT INSIGHTS
   ========================================================= */

function buildSegmentInsight(segment) {
    if (!segment) {
        return "";
    }

    const name =
        segment.segment ||
        segment.name ||
        segment.segment_name ||
        "Customer Segment";

    const count =
        getSegmentCount(segment);

    const percentage =
        getSegmentPercentage(segment);

    const satisfaction =
        Number(
            segment.average_satisfaction ??
            segment.avg_satisfaction ??
            segment.satisfaction
        );

    const resolution =
        Number(
            segment.average_resolution_hours ??
            segment.avg_resolution_hours ??
            segment.resolution
        );

    const details = [];

    if (count > 0) {
        details.push(
            `${formatNumber(count)} customers`
        );
    }

    if (Number.isFinite(percentage)) {
        details.push(
            `${percentage.toFixed(1)}% of customers`
        );
    }

    if (Number.isFinite(satisfaction)) {
        details.push(
            `average satisfaction ${satisfaction.toFixed(2)}/5`
        );
    }

    if (Number.isFinite(resolution)) {
        details.push(
            `average resolution ${resolution.toFixed(2)} hrs`
        );
    }

    const description =
        segment.description ||
        segment.profile ||
        segment.summary;

    if (description) {
        return `
            <div class="insight-item">
                <h4>${escapeHTML(name)}</h4>
                <p>
                    ${escapeHTML(description)}
                </p>

                ${
                    details.length
                        ? `
                        <small>
                            ${escapeHTML(
                                details.join(" • ")
                            )}
                        </small>
                        `
                        : ""
                }
            </div>
        `;
    }

    return `
        <div class="insight-item">
            <h4>${escapeHTML(name)}</h4>

            ${
                details.length
                    ? `
                    <p>
                        ${escapeHTML(
                            details.join(" • ")
                        )}
                    </p>
                    `
                    : `
                    <p>
                        Customer segment identified
                        through clustering analysis.
                    </p>
                    `
            }
        </div>
    `;
}

function renderSegmentInsights(data) {
    const container =
        document.getElementById(
            "segment-container"
        );

    if (!container) {
        return;
    }

    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {
        container.innerHTML = `
            <div class="dashboard-status">
                No segment insights available.
            </div>
        `;

        return;
    }

    container.innerHTML =
        data
            .map(buildSegmentInsight)
            .join("");
}

/* =========================================================
   SEGMENT DISTRIBUTION
   ========================================================= */

function getSegmentDistributionData() {
    if (!Array.isArray(segmentData)) {
        return {
            labels: [],
            values: []
        };
    }

    const labels = [];
    const values = [];

    segmentData.forEach(
        (segment, index) => {
            const name =
                segment.segment ||
                segment.name ||
                segment.segment_name ||
                `Segment ${index + 1}`;

            labels.push(name);
            values.push(
                getSegmentCount(segment)
            );
        }
    );

    return {
        labels,
        values
    };
}

function renderSegmentDistributionChart() {
    const canvas =
        document.getElementById(
            "segment-distribution-chart"
        );

    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }

    const {
        labels,
        values
    } = getSegmentDistributionData();

    destroyChart(
        "segmentDistribution"
    );

    charts.segmentDistribution =
        new Chart(canvas, {
            type: "doughnut",

            data: {
                labels,

                datasets: [
                    {
                        data: values
                    }
                ]
            },

            options: {
                responsive: true,

                maintainAspectRatio:
                    false,

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        callbacks: {
                            label(context) {
                                const value =
                                    context.raw;

                                return `${
                                    context.label
                                }: ${
                                    formatNumber(value)
                                }`;
                            }
                        }
                    }
                }
            }
        });

    renderSegmentLegend(
        labels,
        values
    );
}

function renderSegmentLegend(
    labels,
    values
) {
    const legend =
        document.getElementById(
            "segment-chart-legend"
        );

    if (!legend) {
        return;
    }

    legend.innerHTML =
        labels.map(
            (label, index) => `
                <div class="legend-item">

                    <span class="legend-label">
                        ${escapeHTML(label)}
                    </span>

                    <span class="legend-value">
                        ${formatNumber(
                            values[index]
                        )}
                    </span>

                </div>
            `
        ).join("");
}

/* =========================================================
   SEGMENT DASHBOARD
   ========================================================= */

function updateSegmentDashboard() {
    renderSegmentInsights(
        segmentData
    );

    renderSegmentDistributionChart();
}

/* =========================================================
   SATISFACTION ANALYTICS
   ========================================================= */

function getSatisfactionCounts(
    tickets
) {
    if (!Array.isArray(tickets)) {
        return {
            low: 0,
            satisfied: 0,
            rated: 0
        };
    }

    let low = 0;
    let satisfied = 0;
    let rated = 0;

    tickets.forEach(ticket => {
        const rating =
            getCustomerSatisfaction(
                ticket
            );

        if (rating === null) {
            return;
        }

        rated += 1;

        if (rating <= 2) {
            low += 1;
        }

        if (rating >= 4) {
            satisfied += 1;
        }
    });

    return {
        low,
        satisfied,
        rated
    };
}

function updateSatisfactionAnalytics(
    tickets
) {
    const counts =
        getSatisfactionCounts(
            tickets
        );

    const rate =
        counts.rated > 0
            ? (
                counts.low /
                counts.rated
            ) * 100
            : null;

    setTextContent(
        "low-satisfaction-count",
        formatNumber(counts.low)
    );

    setTextContent(
        "satisfied-count",
        formatNumber(counts.satisfied)
    );

    setTextContent(
        "satisfaction-risk-percentage",
        rate !== null
            ? `${rate.toFixed(1)}%`
            : "N/A"
    );
}

/* =========================================================
   MODEL ACCURACY
   ========================================================= */

function normalizeModelAccuracy(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return null;
    }

    /*
     * The exported SupportIQ satisfaction
     * accuracy is already expressed as a percentage.
     *
     * Example:
     * 59.75 means 59.75%, not 0.5975.
     */

    if (
        number >= 0 &&
        number <= 1
    ) {
        return number * 100;
    }

    return number;
}

function updateModelAccuracy(
    value
) {
    const accuracy =
        normalizeModelAccuracy(
            value
        );

    const element =
        document.getElementById(
            "satisfaction-model-accuracy"
        );

    if (!element) {
        return;
    }

    element.textContent =
        accuracy !== null
            ? `${accuracy.toFixed(2)}%`
            : "N/A";
}

/* =========================================================
   SATISFACTION DATA FALLBACK
   ========================================================= */

function getFallbackSatisfactionData() {
    return {
        low_satisfaction: 1102,
        satisfied: 1667,
        low_satisfaction_rate: 39.8,
        model_accuracy: 59.75
    };
}

function applySatisfactionData(
    data
) {
    const fallback =
        getFallbackSatisfactionData();

    const source =
        data && typeof data === "object"
            ? data
            : {};

    const low =
        source.low_satisfaction ??
        source.low_satisfaction_count ??
        source["Low Satisfaction"] ??
        fallback.low_satisfaction;

    const satisfied =
        source.satisfied ??
        source.satisfied_count ??
        source["Satisfied"] ??
        fallback.satisfied;

    const risk =
        source.low_satisfaction_rate ??
        source.low_satisfaction_percentage ??
        source["Low Satisfaction Rate"] ??
        fallback.low_satisfaction_rate;

    const accuracy =
        source.model_accuracy ??
        source.accuracy ??
        source["Model Accuracy"] ??
        fallback.model_accuracy;

    setTextContent(
        "low-satisfaction-count",
        formatNumber(low)
    );

    setTextContent(
        "satisfied-count",
        formatNumber(satisfied)
    );

    setTextContent(
        "satisfaction-risk-percentage",
        Number.isFinite(Number(risk))
            ? `${Number(risk).toFixed(1)}%`
            : "N/A"
    );

    updateModelAccuracy(
        accuracy
    );
}

/* =========================================================
   DASHBOARD FILTER STATISTICS
   ========================================================= */

function updateAllFilteredStatistics() {
    const filtered =
        getFilteredTickets();

    currentFilteredTickets =
        filtered;

    const summary =
        calculateFilteredSummary(
            filtered
        );

    setTextContent(
        "filtered-ticket-count",
        formatNumber(
            summary.totalTickets
        )
    );

    setTextContent(
        "filtered-satisfaction",
        summary.satisfaction !== null
            ? `${summary.satisfaction.toFixed(2)} / 5`
            : "N/A"
    );

    updateFilteredResolutionDisplay(
        filtered
    );

    updateSatisfactionAnalytics(
        filtered
    );
}

/* =========================================================
   FILTER DATA SUMMARY
   ========================================================= */

function getFilterSummary() {
    const filters =
        getActiveFilters();

    const filtered =
        ticketData.filter(
            ticket =>
                ticketMatchesFilters(
                    ticket,
                    filters
                )
        );

    return {
        filters,
        tickets: filtered,
        count: filtered.length,
        satisfaction:
            calculateTicketSatisfaction(
                filtered
            ),
        resolution:
            calculateFilteredResolution(
                filtered
            )
    };
}

/* =========================================================
   FILTER DISPLAY
   ========================================================= */

function renderActiveFilterSummary() {
    const container =
        document.getElementById(
            "active-filter-summary"
        );

    if (!container) {
        return;
    }

    const filters =
        getActiveFilters();

    const active = [];

    if (filters.priority !== "all") {
        active.push(
            `Priority: ${filters.priority}`
        );
    }

    if (filters.type !== "all") {
        active.push(
            `Type: ${filters.type}`
        );
    }

    if (filters.channel !== "all") {
        active.push(
            `Channel: ${filters.channel}`
        );
    }

    if (filters.segment !== "all") {
        active.push(
            `Segment: ${filters.segment}`
        );
    }

    if (active.length === 0) {
        container.innerHTML =
            "No filters applied.";
        return;
    }

    container.innerHTML =
        active
            .map(
                item => `
                    <span class="active-filter">
                        ${escapeHTML(item)}
                    </span>
                `
            )
            .join("");
}

/* =========================================================
   COMPLETE FILTER REFRESH
   ========================================================= */

function refreshDashboardFilters() {
    const filtered =
        getFilteredTickets();

    currentFilteredTickets =
        filtered;

    const summary =
        calculateFilteredSummary(
            filtered
        );

    setTextContent(
        "filtered-ticket-count",
        formatNumber(
            summary.totalTickets
        )
    );

    setTextContent(
        "filtered-satisfaction",
        summary.satisfaction !== null
            ? `${summary.satisfaction.toFixed(2)} / 5`
            : "N/A"
    );

    updateFilteredResolutionDisplay(
        filtered
    );

    updateSatisfactionAnalytics(
        filtered
    );

    renderActiveFilterSummary();
}

/* =========================================================
   FILTER INITIALIZATION — FINAL
   ========================================================= */

function initializeDashboardFilters() {
    const filterIds = [
        "priority-filter",
        "ticket-type-filter",
        "channel-filter",
        "segment-filter"
    ];

    filterIds.forEach(id => {
        const filter =
            document.getElementById(id);

        if (!filter) {
            return;
        }

        filter.onchange = () => {
            refreshDashboardFilters();
        };
    });

    const resetButton =
        document.getElementById(
            "reset-filters"
        );

    if (resetButton) {
        resetButton.onclick = () => {
            filterIds.forEach(id => {
                const filter =
                    document.getElementById(
                        id
                    );

                if (filter) {
                    filter.value = "all";
                }
            });

            refreshDashboardFilters();
        };
    }

    refreshDashboardFilters();
}

/* =========================================================
   CHART DATA UTILITIES
   ========================================================= */

function getResolutionChartData(
    data,
    possibleLabelFields
) {
    if (!Array.isArray(data)) {
        return {
            labels: [],
            values: []
        };
    }

    const labels = [];
    const values = [];

    data.forEach(item => {
        if (
            !item ||
            typeof item !== "object"
        ) {
            return;
        }

        let label = null;

        for (
            const field
            of possibleLabelFields
        ) {
            if (
                item[field] !== undefined &&
                item[field] !== null &&
                item[field] !== ""
            ) {
                label =
                    item[field];

                break;
            }
        }

        const value =
            Number(
                item.average_resolution_hours ??
                item.avg_resolution_hours ??
                item.average_resolution ??
                item.value
            );

        if (
            label !== null &&
            Number.isFinite(value)
        ) {
            labels.push(
                String(label)
            );

            values.push(value);
        }
    });

    return {
        labels,
        values
    };
}

/* =========================================================
   PRIORITY RESOLUTION CHART
   ========================================================= */

function renderPriorityResolutionChart() {
    const canvas =
        document.getElementById(
            "priority-chart"
        );

    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }

    const chartData =
        getResolutionChartData(
            resolutionData.priority,
            [
                "priority",
                "Ticket Priority",
                "ticket_priority"
            ]
        );

    destroyChart(
        "priority-chart"
    );

    if (
        chartData.labels.length === 0
    ) {
        return;
    }

    charts["priority-chart"] =
        new Chart(canvas, {
            type: "bar",

            data: {
                labels:
                    chartData.labels,

                datasets: [
                    {
                        label:
                            "Average Resolution Time (hrs)",

                        data:
                            chartData.values
                    }
                ]
            },

            options: {
                responsive: true,

                maintainAspectRatio:
                    false,

                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
}

/* =========================================================
   TYPE RESOLUTION CHART
   ========================================================= */

function renderTypeResolutionChart() {
    const canvas =
        document.getElementById(
            "type-chart"
        );

    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }

    const chartData =
        getResolutionChartData(
            resolutionData.type,
            [
                "ticket_type",
                "Ticket Type",
                "type"
            ]
        );

    destroyChart(
        "type-chart"
    );

    if (
        chartData.labels.length === 0
    ) {
        return;
    }

    charts["type-chart"] =
        new Chart(canvas, {
            type: "bar",

            data: {
                labels:
                    chartData.labels,

                datasets: [
                    {
                        label:
                            "Average Resolution Time (hrs)",

                        data:
                            chartData.values
                    }
                ]
            },

            options: {
                responsive: true,

                maintainAspectRatio:
                    false,

                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
}

/* =========================================================
   CHANNEL RESOLUTION CHART
   ========================================================= */

function renderChannelResolutionChart() {
    const canvas =
        document.getElementById(
            "channel-chart"
        );

    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }

    const chartData =
        getResolutionChartData(
            resolutionData.channel,
            [
                "support_channel",
                "Support Channel",
                "channel",
                "Ticket Channel"
            ]
        );

    destroyChart(
        "channel-chart"
    );

    if (
        chartData.labels.length === 0
    ) {
        return;
    }

    charts["channel-chart"] =
        new Chart(canvas, {
            type: "bar",

            data: {
                labels:
                    chartData.labels,

                datasets: [
                    {
                        label:
                            "Average Resolution Time (hrs)",

                        data:
                            chartData.values
                    }
                ]
            },

            options: {
                responsive: true,

                maintainAspectRatio:
                    false,

                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
}

/* =========================================================
   RENDER ALL RESOLUTION CHARTS
   ========================================================= */

function renderAllResolutionCharts() {
    renderPriorityResolutionChart();
    renderTypeResolutionChart();
    renderChannelResolutionChart();
}

/* =========================================================
   DASHBOARD DATA VALIDATION
   ========================================================= */

function validateTicketData(data) {
    if (!Array.isArray(data)) {
        return false;
    }

    if (data.length === 0) {
        return false;
    }

    return data.every(
        ticket =>
            ticket &&
            typeof ticket === "object"
    );
}

function validateSegmentData(data) {
    return (
        Array.isArray(data) &&
        data.length > 0
    );
}

function validateResolutionData(data) {
    return (
        data &&
        typeof data === "object" &&
        Array.isArray(data.priority) &&
        Array.isArray(data.type) &&
        Array.isArray(data.channel)
    );
}

/* =========================================================
   DATA LOAD STATUS
   ========================================================= */

function updateDataLoadStatus() {
    const problems = [];

    if (
        !validateTicketData(
            ticketData
        )
    ) {
        problems.push(
            "ticket data"
        );
    }

    if (
        !validateSegmentData(
            segmentData
        )
    ) {
        problems.push(
            "segment data"
        );
    }

    if (
        !validateResolutionData(
            resolutionData
        )
    ) {
        problems.push(
            "resolution data"
        );
    }

    if (problems.length > 0) {
        showDashboardStatus(
            `Some dashboard data could not be loaded: ${problems.join(
                ", "
            )}.`,
            "warning"
        );

        return false;
    }

    clearDashboardStatus();

    return true;
}

/* =========================================================
   FULL DASHBOARD REFRESH
   ========================================================= */

function refreshEntireDashboard() {
    try {
        updateSegmentDashboard();
    } catch (error) {
        console.error(
            "Segment dashboard refresh failed:",
            error
        );
    }

    try {
        updateAllFilteredStatistics();
    } catch (error) {
        console.error(
            "Filtered statistics refresh failed:",
            error
        );
    }

    try {
        renderAllResolutionCharts();
    } catch (error) {
        console.error(
            "Resolution chart refresh failed:",
            error
        );
    }

    try {
        updateDataLoadStatus();
    } catch (error) {
        console.error(
            "Data status update failed:",
            error
        );
    }
}

/* =========================================================
   FINAL PAGE SETUP
   ========================================================= */

function setupSupportIQDashboard() {
    console.log(
        "Setting up SupportIQ dashboard..."
    );

    try {
        initializeDashboardFilters();
    } catch (error) {
        console.error(
            "Dashboard filter setup failed:",
            error
        );
    }

    try {
        populateAITicketSelector();
    } catch (error) {
        console.error(
            "AI ticket selector setup failed:",
            error
        );
    }

    try {
        setupAPIAnalysis();
    } catch (error) {
        console.error(
            "API analysis setup failed:",
            error
        );
    }

    try {
        refreshEntireDashboard();
    } catch (error) {
        console.error(
            "Dashboard refresh failed:",
            error
        );
    }

    console.log(
        "SupportIQ dashboard setup completed."
    );
}

/* =========================================================
   BACKEND API UTILITIES
   ========================================================= */

async function getAPIStatus() {
    try {
        const response =
            await fetch(
                `${API_BASE_URL}/`
            );

        if (!response.ok) {
            return {
                available: false,
                data: null
            };
        }

        const data =
            await response.json();

        return {
            available: true,
            data
        };
    } catch (error) {
        return {
            available: false,
            data: null
        };
    }
}

async function getAPIHealth() {
    try {
        const response =
            await fetch(
                `${API_BASE_URL}/health`
            );

        if (!response.ok) {
            return {
                available: false,
                data: null
            };
        }

        const data =
            await response.json();

        return {
            available: true,
            data
        };
    } catch (error) {
        return {
            available: false,
            data: null
        };
    }
}

/* =========================================================
   API STATUS UI
   ========================================================= */

async function updateAPIStatusUI() {
    const statusElement =
        document.getElementById(
            "api-status"
        );

    if (!statusElement) {
        return;
    }

    statusElement.textContent =
        "Checking API...";

    const health =
        await getAPIHealth();

    if (health.available) {
        statusElement.textContent =
            "API connected";
        statusElement.className =
            "api-status connected";
    } else {
        statusElement.textContent =
            "API unavailable";
        statusElement.className =
            "api-status unavailable";
    }
}

/* =========================================================
   API TICKET PAYLOAD
   ========================================================= */

function buildTicketAnalysisPayload(
    ticket
) {
    if (!ticket) {
        return null;
    }

    return {
        customer_age:
            getCustomerAge(ticket) || 0,

        ticket_priority:
            getTicketPriority(ticket) || "",

        ticket_type:
            getTicketType(ticket) || "",

        support_channel:
            getTicketChannel(ticket) || "",

        ticket_description:
            getTicketDescription(ticket) ||
            getTicketSubject(ticket) ||
            ""
    };
}

function validateTicketAnalysisPayload(
    payload
) {
    if (!payload) {
        return false;
    }

    if (
        typeof payload !== "object"
    ) {
        return false;
    }

    return true;
}

/* =========================================================
   API ANALYSIS REQUEST
   ========================================================= */

async function requestTicketAnalysis(
    ticket
) {
    const payload =
        buildTicketAnalysisPayload(
            ticket
        );

    if (
        !validateTicketAnalysisPayload(
            payload
        )
    ) {
        throw new Error(
            "Invalid ticket analysis payload."
        );
    }

    const response =
        await fetch(
            `${API_BASE_URL}/analyze`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

    let data = null;

    try {
        data =
            await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const message =
            data?.detail ||
            data?.message ||
            `API request failed with status ${response.status}`;

        throw new Error(
            message
        );
    }

    return data;
}

/* =========================================================
   ANALYSIS BUTTON STATE
   ========================================================= */

function setAnalysisButtonLoading(
    loading
) {
    const button =
        document.getElementById(
            "analyze-ticket-button"
        );

    if (!button) {
        return;
    }

    button.disabled =
        Boolean(loading);

    button.textContent =
        loading
            ? "Analyzing..."
            : "Analyze Selected Ticket";
}

/* =========================================================
   ANALYSIS RESULT STATES
   ========================================================= */

function showAnalysisLoading() {
    setHTML(
        "ai-analysis-result",
        `
            <div class="dashboard-status">
                Analyzing selected ticket...
            </div>
        `
    );
}

function showAnalysisError(
    message
) {
    setHTML(
        "ai-analysis-result",
        `
            <div class="dashboard-status error">
                <strong>
                    Ticket analysis failed.
                </strong>

                <br>

                ${escapeHTML(message)}
            </div>
        `
    );
}

function showAnalysisSuccess(
    data
) {
    renderDetailedAPIResult(
        data
    );
}

/* =========================================================
   COMPLETE TICKET ANALYSIS FLOW
   ========================================================= */

async function runTicketAnalysis() {
    const selector =
        document.getElementById(
            "ticket-selector"
        );

    if (!selector) {
        return;
    }

    const value =
        selector.value;

    if (value === "") {
        showAnalysisError(
            "Please select a ticket first."
        );

        return;
    }

    const index =
        Number(value);

    if (
        !Number.isInteger(index) ||
        !ticketData[index]
    ) {
        showAnalysisError(
            "The selected ticket could not be found."
        );

        return;
    }

    const ticket =
        ticketData[index];

    setAnalysisButtonLoading(
        true
    );

    showAnalysisLoading();

    try {
        const result =
            await requestTicketAnalysis(
                ticket
            );

        showAnalysisSuccess(
            result
        );

    } catch (error) {
        console.error(
            "Ticket analysis request failed:",
            error
        );

        showAnalysisError(
            error.message ||
            "Unable to analyze this ticket."
        );
    } finally {
        setAnalysisButtonLoading(
            false
        );
    }
}
/* =========================================================
   FINAL EVENT WIRING
   ========================================================= */

function attachFinalEventListeners() {
    const analyzeButton =
        document.getElementById(
            "analyze-ticket-button"
        );

    if (analyzeButton) {
        analyzeButton.onclick =
            runTicketAnalysis;
    }

    const ticketSelector =
        document.getElementById(
            "ticket-selector"
        );

    if (ticketSelector) {
        ticketSelector.onchange =
            function () {
                const value =
                    this.value;

                if (value === "") {
                    updateTicketPreview(null);
                    return;
                }

                const index =
                    Number(value);

                if (
                    !Number.isInteger(index) ||
                    !ticketData[index]
                ) {
                    updateTicketPreview(null);
                    return;
                }

                updateTicketPreview(
                    ticketData[index]
                );
            };
    }
}

/* =========================================================
   FINAL DATA INITIALIZATION
   ========================================================= */

async function initializeSupportIQ() {
    console.log(
        "Starting SupportIQ..."
    );

    showDashboardStatus(
        "Loading dashboard data..."
    );

    try {
        await Promise.allSettled([
            loadDashboardMetrics(),
            loadSegmentData(),
            loadSatisfactionData(),
            loadTicketData(),
            loadResolutionData()
        ]);

        console.log(
            "All dashboard data loading attempts completed."
        );

        /*
         * Populate all interactive elements only
         * after the ticket data has been loaded.
         */

        initializeInteractiveFilters();

        populateTicketSelectorForAPI();

        populateAITicketSelector();

        attachFinalEventListeners();

        updateSegmentDashboard();

        refreshFilteredDashboard();

        renderAllResolutionCharts();

        updateAPIStatusUI();

        updateDataLoadStatus();

        clearDashboardStatus();

        console.log(
            "SupportIQ initialization completed."
        );

    } catch (error) {
        console.error(
            "SupportIQ initialization error:",
            error
        );

        showDashboardStatus(
            "Some dashboard components could not be loaded.",
            "error"
        );
    }
}

/* =========================================================
   DOM READY
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeSupportIQ
    );
} else {
    initializeSupportIQ();
}

/* =========================================================
   GLOBAL DEBUG HELPERS
   ========================================================= */

window.SupportIQ = {
    getTickets() {
        return ticketData;
    },

    getSegments() {
        return segmentData;
    },

    getResolutionData() {
        return resolutionData;
    },

    getFilteredTickets() {
        return currentFilteredTickets;
    },

    refresh() {
        refreshEntireDashboard();
    },

    refreshFilters() {
        refreshDashboardFilters();
    },

    checkAPI() {
        return checkAPIHealth();
    },

    analyzeTicket(index) {
        if (
            !Number.isInteger(index) ||
            !ticketData[index]
        ) {
            console.error(
                "Invalid ticket index."
            );

            return;
        }

        const selector =
            document.getElementById(
                "ticket-selector"
            );

        if (selector) {
            selector.value =
                String(index);
        }

        updateTicketPreview(
            ticketData[index]
        );

        return requestTicketAnalysis(
            ticketData[index]
        );
    }
};

/* =========================================================
   ERROR HANDLING
   ========================================================= */

window.addEventListener(
    "error",
    event => {
        console.error(
            "SupportIQ runtime error:",
            event.error ||
            event.message
        );
    }
);

window.addEventListener(
    "unhandledrejection",
    event => {
        console.error(
            "SupportIQ unhandled promise rejection:",
            event.reason
        );
    }
);

/* =========================================================
   PAGE VISIBILITY REFRESH
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {
        if (
            document.visibilityState ===
            "visible"
        ) {
            /*
             * Do not reload all JSON data every time
             * the tab becomes visible.
             *
             * Refresh the UI using the data already
             * loaded in memory.
             */

            try {
                refreshDashboardFilters();
            } catch (error) {
                console.error(
                    "Visibility refresh failed:",
                    error
                );
            }
        }
    }
);

/* =========================================================
   WINDOW RESIZE HANDLER
   ========================================================= */

let resizeTimeout = null;

window.addEventListener(
    "resize",
    () => {
        clearTimeout(
            resizeTimeout
        );

        resizeTimeout =
            setTimeout(() => {
                Object.values(
                    charts
                ).forEach(chart => {
                    if (
                        chart &&
                        typeof chart.resize ===
                            "function"
                    ) {
                        chart.resize();
                    }
                });
            }, 150);
    }
);

/* =========================================================
   FINAL EXPORTS
   ========================================================= */

window.SupportIQDashboard = {
    initialize:
        initializeSupportIQ,

    refresh:
        refreshEntireDashboard,

    refreshFilters:
        refreshDashboardFilters,

    getFilteredTickets:
        getFilteredTickets,

    getActiveFilters:
        getActiveFilters,

    getResolutionData:
        () => resolutionData,

    getSegmentData:
        () => segmentData,

    getTicketData:
        () => ticketData,

    checkAPIHealth:
        checkAPIHealth,

    analyzeTicket:
        runTicketAnalysis
};

console.log(
    "SupportIQ script loaded."
);
