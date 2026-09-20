// SupportIQ - Customer Support Intelligence Platform
// Main dashboard script

"use strict";

/* =========================================================
   FILE CONFIGURATION
========================================================= */

const DATA_FILES = {
    metrics: "./data/dashboard_metrics.csv",
    segments: "./data/segment_dashboard.json",
    satisfaction: "./data/satisfaction_dashboard.json",
    ticketData: "./ticket_data.json",
    ticketSegmentMapping: "./ticket_segment_mapping.json",

    // Aggregate resolution analytics
    resolutionByPriority: "./data/resolution_by_priority.json",
    resolutionByType: "./data/resolution_by_type.json",
    resolutionByChannel: "./data/resolution_by_channel.json"
};

/* =========================================================
   GLOBAL STATE
========================================================= */

let dashboardMetrics = {};
let segmentData = {};
let satisfactionData = {};
let ticketData = [];

let ticketSegmentMapping = [];
let ticketSegmentMap = new Map();

let resolutionData = {
    priority: [],
    type: [],
    channel: []
};

let charts = {};

let filters = {
    priority: "",
    ticketType: "",
    channel: "",
    segment: ""
};

/* =========================================================
   EXPECTED SEGMENTS
========================================================= */

const EXPECTED_SEGMENTS = [
    "Younger - Satisfied and Fast",
    "Younger - At Risk and Fast",
    "Older - Satisfied and Fast",
    "Older - At Risk and Fast",
    "Older - Satisfied and Slow",
    "Older - At Risk and Slow"
];

/* =========================================================
   UTILITY FUNCTIONS
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

function showDashboardStatus(message, type = "info") {
    const statusElement = document.getElementById("dashboard-status");

    if (!statusElement) {
        return;
    }

    statusElement.textContent = message;
    statusElement.className = `dashboard-status ${type}`;
    statusElement.style.display = "block";
}

function clearDashboardStatus() {
    const statusElement = document.getElementById("dashboard-status");

    if (!statusElement) {
        return;
    }

    statusElement.textContent = "";
    statusElement.className = "dashboard-status";
    statusElement.style.display = "none";
}

function parseNumber(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
}

function formatNumber(value, decimals = 2) {
    const number = parseNumber(value);

    if (number === null) {
        return "N/A";
    }

    return number.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function normalizeText(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function normalizeResolutionData(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (payload && Array.isArray(payload.data)) {
        return payload.data;
    }

    if (payload && Array.isArray(payload.results)) {
        return payload.results;
    }

    return [];
}

/* =========================================================
   CSV PARSER
========================================================= */

function parseCSV(text) {
    const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
        return [];
    }

    const headers = lines[0].split(",").map(header => header.trim());

    return lines.slice(1).map(line => {
        const values = line.split(",");

        const row = {};

        headers.forEach((header, index) => {
            row[header] = values[index] !== undefined
                ? values[index].trim()
                : "";
        });

        return row;
    });
}

/* =========================================================
   FETCH HELPERS
========================================================= */

async function fetchJSON(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Failed to load ${url}: HTTP ${response.status}`
        );
    }

    return response.json();
}

async function fetchText(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Failed to load ${url}: HTTP ${response.status}`
        );
    }

    return response.text();
}

/* =========================================================
   LOAD METRICS
========================================================= */

async function loadMetrics() {
    try {
        const csvText = await fetchText(DATA_FILES.metrics);

        const rows = parseCSV(csvText);

        dashboardMetrics = {};

        rows.forEach(row => {
            const metric = row.metric || row.Metric;
            const value = row.value || row.Value;

            if (metric) {
                dashboardMetrics[metric] = value;
            }
        });

        updateMetrics();

        console.log("SupportIQ: dashboard metrics loaded.");
    } catch (error) {
        console.error("Metrics loading error:", error);

        showDashboardStatus(
            "Dashboard metrics could not be loaded.",
            "error"
        );
    }
}

/* =========================================================
   UPDATE MAIN METRICS
========================================================= */

function updateMetrics() {
    const totalTicketsElement =
        document.getElementById("total-tickets");

    const satisfactionElement =
        document.getElementById("average-satisfaction");

    const resolutionElement =
        document.getElementById("average-resolution");

    const segmentsElement =
        document.getElementById("customer-segments");

    if (totalTicketsElement) {
        totalTicketsElement.textContent =
            dashboardMetrics["Total Tickets"] ||
            dashboardMetrics["total_tickets"] ||
            "8,469";
    }

    if (satisfactionElement) {
        satisfactionElement.textContent =
            dashboardMetrics["Average Satisfaction"] ||
            dashboardMetrics["average_satisfaction"] ||
            "2.99 / 5";
    }

    if (resolutionElement) {
        resolutionElement.textContent =
            dashboardMetrics["Average Resolution Time"] ||
            dashboardMetrics["average_resolution_hours"] ||
            "11.77 hrs";
    }

    if (segmentsElement) {
        segmentsElement.textContent =
            dashboardMetrics["Customer Segments"] ||
            dashboardMetrics["customer_segments"] ||
            "6";
    }
}

/* =========================================================
   LOAD SEGMENT DATA
========================================================= */

async function loadSegmentData() {
    try {
        segmentData =
            await fetchJSON(DATA_FILES.segments);

        updateSegmentDashboard();

        console.log("SupportIQ: segment data loaded.");
    } catch (error) {
        console.error("Segment data loading error:", error);

        showDashboardStatus(
            "Customer segment data could not be loaded.",
            "error"
        );
    }
}

/* =========================================================
   LOAD SATISFACTION DATA
========================================================= */

async function loadSatisfactionData() {
    try {
        satisfactionData =
            await fetchJSON(DATA_FILES.satisfaction);

        updateSatisfactionDashboard();

        console.log(
            "SupportIQ: satisfaction data loaded."
        );
    } catch (error) {
        console.error(
            "Satisfaction data loading error:",
            error
        );

        showDashboardStatus(
            "Satisfaction analytics could not be loaded.",
            "error"
        );
    }
}

/* =========================================================
   LOAD TICKET DATA
========================================================= */

async function loadTicketData() {
    try {
        ticketData =
            await fetchJSON(DATA_FILES.ticketData);

        if (!Array.isArray(ticketData)) {
            throw new Error(
                "Ticket data must be an array."
            );
        }

        console.log(
            `SupportIQ: loaded ${ticketData.length} tickets.`
        );

        populateTicketSelector();
        populateFilterOptions();

        updateFilteredDashboard();
    } catch (error) {
        console.error(
            "Ticket data loading error:",
            error
        );

        showDashboardStatus(
            "Ticket data could not be loaded.",
            "error"
        );
    }
}

/* =========================================================
   LOAD TICKET SEGMENT MAPPING
========================================================= */

async function loadTicketSegmentMapping() {
    try {
        ticketSegmentMapping =
            await fetchJSON(
                DATA_FILES.ticketSegmentMapping
            );

        if (!Array.isArray(ticketSegmentMapping)) {
            throw new Error(
                "Ticket segment mapping must be an array."
            );
        }

        buildTicketSegmentMap();

        console.log(
            `SupportIQ: loaded ${ticketSegmentMapping.length} segment mappings.`
        );

        clearDashboardStatus();
    } catch (error) {
        console.error(
            "Ticket segment mapping error:",
            error
        );

        ticketSegmentMapping = [];
        ticketSegmentMap = new Map();

        showDashboardStatus(
            "K-Means segment mapping could not be loaded. Segment filtering is unavailable.",
            "warning"
        );
    }
}

/* =========================================================
   TICKET KEY
========================================================= */

function makeTicketKey(ticketId, customerEmail) {
    return `${normalizeText(ticketId)}::${normalizeText(customerEmail)}`;
}

/* =========================================================
   BUILD SEGMENT MAP
========================================================= */

function buildTicketSegmentMap() {
    ticketSegmentMap = new Map();

    ticketSegmentMapping.forEach(item => {
        if (!item) {
            return;
        }

        const ticketId =
            item["Ticket ID"] ??
            item.ticket_id ??
            item.ticketId;

        const customerEmail =
            item["Customer Email"] ??
            item.customer_email ??
            item.customerEmail;

        const segment =
            item.segment ??
            item.Segment;

        if (
            ticketId === undefined ||
            customerEmail === undefined ||
            !segment
        ) {
            return;
        }

        const key =
            makeTicketKey(ticketId, customerEmail);

        if (!ticketSegmentMap.has(key)) {
            ticketSegmentMap.set(key, segment);
        }
    });
}

/* =========================================================
   GET TICKET SEGMENT
========================================================= */

function getTicketSegment(ticket) {
    if (!ticket) {
        return "";
    }

    const ticketId =
        ticket["Ticket ID"] ??
        ticket.ticket_id ??
        ticket.ticketId;

    const customerEmail =
        ticket["Customer Email"] ??
        ticket.customer_email ??
        ticket.customerEmail;

    if (
        ticketId === undefined ||
        customerEmail === undefined
    ) {
        return "";
    }

    const key =
        makeTicketKey(ticketId, customerEmail);

    return ticketSegmentMap.get(key) || "";
}

/* =========================================================
   LOAD RESOLUTION DATA
========================================================= */

async function loadResolutionData() {
    try {
        const [
            priorityPayload,
            typePayload,
            channelPayload
        ] = await Promise.all([
            fetchJSON(DATA_FILES.resolutionByPriority),
            fetchJSON(DATA_FILES.resolutionByType),
            fetchJSON(DATA_FILES.resolutionByChannel)
        ]);

        resolutionData.priority =
            normalizeResolutionData(priorityPayload);

        resolutionData.type =
            normalizeResolutionData(typePayload);

        resolutionData.channel =
            normalizeResolutionData(channelPayload);

        console.log(
            "SupportIQ: resolution analytics loaded.",
            {
                priority: resolutionData.priority.length,
                type: resolutionData.type.length,
                channel: resolutionData.channel.length
            }
        );

        updateResolutionCharts();
        updateFilteredDashboard();

    } catch (error) {
        console.error(
            "Resolution data loading error:",
            error
        );

        resolutionData = {
            priority: [],
            type: [],
            channel: []
        };

        showDashboardStatus(
            "Resolution analytics could not be loaded.",
            "warning"
        );

        updateResolutionCharts();
    }
}

/* =========================================================
   INITIALIZE DASHBOARD
========================================================= */

async function initializeDashboard() {
    try {
        showDashboardStatus(
            "Loading SupportIQ dashboard...",
            "info"
        );

        await Promise.allSettled([
            loadMetrics(),
            loadSegmentData(),
            loadSatisfactionData(),
            loadTicketSegmentMapping()
        ]);

        await loadTicketData();

        await loadResolutionData();

        initializeFilters();
        initializeNavigation();
        initializeAIAnalysis();

        updateFilteredDashboard();
        updateResolutionCharts();

        clearDashboardStatus();

        console.log(
            "SupportIQ dashboard initialized successfully."
        );
    } catch (error) {
        console.error(
            "Dashboard initialization error:",
            error
        );

        showDashboardStatus(
            "Some dashboard components could not be loaded.",
            "warning"
        );
    }
}

/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);

/* =========================================================
   SEGMENT DASHBOARD
========================================================= */

function updateSegmentDashboard() {
    updateSegmentCards();
    updateSegmentDistributionChart();
    updateSegmentInsights();
}

/* =========================================================
   SEGMENT CARDS
========================================================= */

function updateSegmentCards() {
    const container =
        document.getElementById("segment-insights");

    if (!container) {
        return;
    }

    let segments = [];

    if (Array.isArray(segmentData)) {
        segments = segmentData;
    } else if (
        segmentData &&
        Array.isArray(segmentData.segments)
    ) {
        segments = segmentData.segments;
    } else if (
        segmentData &&
        Array.isArray(segmentData.data)
    ) {
        segments = segmentData.data;
    }

    if (segments.length === 0) {
        container.innerHTML =
            "<p>No segment insights available.</p>";
        return;
    }

    container.innerHTML = segments
        .map(segment => {
            const name =
                segment.segment ||
                segment.name ||
                "Unknown Segment";

            const count =
                segment.ticket_count ??
                segment.customer_count ??
                segment.count ??
                0;

            const satisfaction =
                segment.average_satisfaction ??
                segment.avg_satisfaction ??
                null;

            const resolution =
                segment.average_resolution_hours ??
                segment.avg_resolution_hours ??
                null;

            return `
                <div class="insight-item">
                    <h4>${escapeHTML(name)}</h4>

                    <p>
                        <strong>
                            Customers/Tickets:
                        </strong>
                        ${formatNumber(count, 0)}
                    </p>

                    <p>
                        <strong>
                            Avg Satisfaction:
                        </strong>
                        ${
                            satisfaction !== null
                                ? formatNumber(
                                      satisfaction,
                                      2
                                  )
                                : "N/A"
                        }
                    </p>

                    <p>
                        <strong>
                            Avg Resolution:
                        </strong>
                        ${
                            resolution !== null
                                ? `${formatNumber(
                                      resolution,
                                      2
                                  )} hrs`
                                : "N/A"
                        }
                    </p>
                </div>
            `;
        })
        .join("");
}

/* =========================================================
   SEGMENT DISTRIBUTION CHART
========================================================= */

function updateSegmentDistributionChart() {
    const canvas =
        document.getElementById(
            "segment-distribution-chart"
        );

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    let labels = [];
    let values = [];

    if (Array.isArray(segmentData)) {
        segmentData.forEach(segment => {
            labels.push(
                segment.segment ||
                segment.name ||
                "Unknown"
            );

            values.push(
                parseNumber(
                    segment.ticket_count ??
                    segment.customer_count ??
                    segment.count
                ) || 0
            );
        });
    } else if (
        segmentData &&
        Array.isArray(segmentData.segments)
    ) {
        segmentData.segments.forEach(segment => {
            labels.push(
                segment.segment ||
                segment.name ||
                "Unknown"
            );

            values.push(
                parseNumber(
                    segment.ticket_count ??
                    segment.customer_count ??
                    segment.count
                ) || 0
            );
        });
    } else if (
        segmentData &&
        Array.isArray(segmentData.data)
    ) {
        segmentData.data.forEach(segment => {
            labels.push(
                segment.segment ||
                segment.name ||
                "Unknown"
            );

            values.push(
                parseNumber(
                    segment.ticket_count ??
                    segment.customer_count ??
                    segment.count
                ) || 0
            );
        });
    }

    if (labels.length === 0) {
        return;
    }

    if (charts.segmentDistribution) {
        charts.segmentDistribution.destroy();
    }

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

                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value =
                                    context.raw ?? 0;

                                return `${context.label}: ${value.toLocaleString()}`;
                            }
                        }
                    }
                }
            }
        });

    updateSegmentLegend(labels, values);
}

/* =========================================================
   SEGMENT LEGEND
========================================================= */

function updateSegmentLegend(labels, values) {
    const legend =
        document.getElementById(
            "segment-chart-legend"
        );

    if (!legend) {
        return;
    }

    legend.innerHTML = labels
        .map((label, index) => {
            return `
                <div class="legend-item">
                    <span class="legend-label">
                        ${escapeHTML(label)}
                    </span>

                    <span class="legend-value">
                        ${formatNumber(
                            values[index],
                            0
                        )}
                    </span>
                </div>
            `;
        })
        .join("");
}

/* =========================================================
   SEGMENT INSIGHTS
========================================================= */

function updateSegmentInsights() {
    const container =
        document.getElementById(
            "segment-insights"
        );

    if (!container) {
        return;
    }

    let segments = [];

    if (
        segmentData &&
        Array.isArray(segmentData.segments)
    ) {
        segments = segmentData.segments;
    } else if (
        segmentData &&
        Array.isArray(segmentData.data)
    ) {
        segments = segmentData.data;
    } else if (Array.isArray(segmentData)) {
        segments = segmentData;
    }

    if (segments.length === 0) {
        container.innerHTML =
            "<p>No segment insights available.</p>";
        return;
    }

    container.innerHTML = segments
        .map(segment => {
            const name =
                segment.segment ||
                segment.name ||
                "Unknown Segment";

            const description =
                segment.description ||
                segment.insight ||
                "";

            return `
                <div class="insight-item">
                    <h4>
                        ${escapeHTML(name)}
                    </h4>

                    ${
                        description
                            ? `<p>${escapeHTML(
                                  description
                              )}</p>`
                            : ""
                    }
                </div>
            `;
        })
        .join("");
}

/* =========================================================
   SATISFACTION DASHBOARD
========================================================= */

function updateSatisfactionDashboard() {
    updateSatisfactionMetrics();
    updateSatisfactionChart();
}

/* =========================================================
   SATISFACTION METRICS
========================================================= */

function updateSatisfactionMetrics() {
    const data = satisfactionData || {};

    const low =
        data.low_satisfaction ??
        data.low_satisfaction_count ??
        data.low ??
        0;

    const satisfied =
        data.satisfied ??
        data.satisfied_count ??
        data.high_satisfaction_count ??
        0;

    const risk =
        data.risk_percentage ??
        data.risk_percent ??
        data.percentage_at_risk ??
        null;

    const accuracy =
        data.model_accuracy ??
        data.accuracy ??
        null;

    const lowElement =
        document.getElementById(
            "low-satisfaction-count"
        );

    const satisfiedElement =
        document.getElementById(
            "satisfied-count"
        );

    const riskElement =
        document.getElementById(
            "satisfaction-risk-percentage"
        );

    const accuracyElement =
        document.getElementById(
            "satisfaction-model-accuracy"
        );

    if (lowElement) {
        lowElement.textContent =
            formatNumber(low, 0);
    }

    if (satisfiedElement) {
        satisfiedElement.textContent =
            formatNumber(satisfied, 0);
    }

    if (riskElement) {
        riskElement.textContent =
            risk !== null
                ? `${formatNumber(risk, 1)}%`
                : "N/A";
    }

    if (accuracyElement) {
        accuracyElement.textContent =
            accuracy !== null
                ? `${formatNumber(
                      accuracy * 100,
                      2
                  )}%`
                : "N/A";
    }
}

/* =========================================================
   SATISFACTION CHART
========================================================= */

function updateSatisfactionChart() {
    const canvas =
        document.getElementById(
            "satisfaction-chart"
        );

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const data = satisfactionData || {};

    const labels =
        data.labels ||
        [
            "Low Satisfaction",
            "Satisfied"
        ];

    const values =
        data.values ||
        [
            data.low_satisfaction ??
                data.low_satisfaction_count ??
                0,

            data.satisfied ??
                data.satisfied_count ??
                0
        ];

    if (charts.satisfaction) {
        charts.satisfaction.destroy();
    }

    charts.satisfaction =
        new Chart(canvas, {
            type: "bar",

            data: {
                labels,

                datasets: [
                    {
                        label:
                            "Customer Count",

                        data: values
                    }
                ]
            },

            options: {
                responsive: true,

                maintainAspectRatio: false,

                scales: {
                    y: {
                        beginAtZero: true
                    }
                },

                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
}

/* =========================================================
   FILTER OPTIONS
========================================================= */

function populateFilterOptions() {
    if (!Array.isArray(ticketData)) {
        return;
    }

    const priorities =
        new Set();

    const ticketTypes =
        new Set();

    const channels =
        new Set();

    const segments =
        new Set();

    ticketData.forEach(ticket => {
        const priority =
            ticket["Ticket Priority"] ??
            ticket["Priority"] ??
            ticket.priority;

        const type =
            ticket["Ticket Type"] ??
            ticket["Type"] ??
            ticket.ticket_type;

        const channel =
            ticket["Ticket Channel"] ??
            ticket["Channel"] ??
            ticket.channel;

        const segment =
            getTicketSegment(ticket);

        if (priority) {
            priorities.add(priority);
        }

        if (type) {
            ticketTypes.add(type);
        }

        if (channel) {
            channels.add(channel);
        }

        if (segment) {
            segments.add(segment);
        }
    });

    populateSelect(
        "priority-filter",
        priorities
    );

    populateSelect(
        "ticket-type-filter",
        ticketTypes
    );

    populateSelect(
        "channel-filter",
        channels
    );

    populateSelect(
        "segment-filter",
        segments
    );
}

/* =========================================================
   POPULATE SELECT
========================================================= */

function populateSelect(elementId, values) {
    const select =
        document.getElementById(elementId);

    if (!select) {
        return;
    }

    const currentValue =
        select.value;

    select.innerHTML =
        `<option value="">All</option>`;

    Array.from(values)
        .filter(Boolean)
        .sort((a, b) =>
            String(a).localeCompare(
                String(b)
            )
        )
        .forEach(value => {
            const option =
                document.createElement(
                    "option"
                );

            option.value = value;
            option.textContent = value;

            select.appendChild(option);
        });

    if (
        Array.from(select.options)
            .some(option =>
                option.value === currentValue
            )
    ) {
        select.value = currentValue;
    }
}

/* =========================================================
   FILTER INITIALIZATION
========================================================= */

function initializeFilters() {
    const priorityFilter =
        document.getElementById(
            "priority-filter"
        );

    const typeFilter =
        document.getElementById(
            "ticket-type-filter"
        );

    const channelFilter =
        document.getElementById(
            "channel-filter"
        );

    const segmentFilter =
        document.getElementById(
            "segment-filter"
        );

    if (priorityFilter) {
        priorityFilter.addEventListener(
            "change",
            () => {
                filters.priority =
                    priorityFilter.value;

                updateFilteredDashboard();
            }
        );
    }

    if (typeFilter) {
        typeFilter.addEventListener(
            "change",
            () => {
                filters.ticketType =
                    typeFilter.value;

                updateFilteredDashboard();
            }
        );
    }

    if (channelFilter) {
        channelFilter.addEventListener(
            "change",
            () => {
                filters.channel =
                    channelFilter.value;

                updateFilteredDashboard();
            }
        );
    }

    if (segmentFilter) {
        segmentFilter.addEventListener(
            "change",
            () => {
                filters.segment =
                    segmentFilter.value;

                updateFilteredDashboard();
            }
        );
    }

    const resetButton =
        document.getElementById(
            "reset-filters"
        );

    if (resetButton) {
        resetButton.addEventListener(
            "click",
            resetFilters
        );
    }
}

/* =========================================================
   RESET FILTERS
========================================================= */

function resetFilters() {
    filters = {
        priority: "",
        ticketType: "",
        channel: "",
        segment: ""
    };

    const filterIds = [
        "priority-filter",
        "ticket-type-filter",
        "channel-filter",
        "segment-filter"
    ];

    filterIds.forEach(id => {
        const element =
            document.getElementById(id);

        if (element) {
            element.value = "";
        }
    });

    updateFilteredDashboard();
}

/* =========================================================
   APPLY FILTERS
========================================================= */

function getFilteredTickets() {
    if (!Array.isArray(ticketData)) {
        return [];
    }

    return ticketData.filter(ticket => {
        const priority =
            ticket["Ticket Priority"] ??
            ticket["Priority"] ??
            ticket.priority ??
            "";

        const type =
            ticket["Ticket Type"] ??
            ticket["Type"] ??
            ticket.ticket_type ??
            "";

        const channel =
            ticket["Ticket Channel"] ??
            ticket["Channel"] ??
            ticket.channel ??
            "";

        const segment =
            getTicketSegment(ticket);

        if (
            filters.priority &&
            normalizeText(priority) !==
                normalizeText(filters.priority)
        ) {
            return false;
        }

        if (
            filters.ticketType &&
            normalizeText(type) !==
                normalizeText(filters.ticketType)
        ) {
            return false;
        }

        if (
            filters.channel &&
            normalizeText(channel) !==
                normalizeText(filters.channel)
        ) {
            return false;
        }

        if (
            filters.segment &&
            normalizeText(segment) !==
                normalizeText(filters.segment)
        ) {
            return false;
        }

        return true;
    });
}

/* =========================================================
   UPDATE FILTERED DASHBOARD
========================================================= */

function updateFilteredDashboard() {
    const filteredTickets =
        getFilteredTickets();

    updateFilteredStats(
        filteredTickets
    );

    updateFilteredTicketCount(
        filteredTickets
    );

    updateResolutionCharts();
}

/* =========================================================
   FILTERED TICKET COUNT
========================================================= */

function updateFilteredTicketCount(
    filteredTickets
) {
    const element =
        document.getElementById(
            "filtered-ticket-count"
        );

    if (!element) {
        return;
    }

    element.textContent =
        filteredTickets.length.toLocaleString();
}

/* =========================================================
   FILTERED STATS
========================================================= */

function updateFilteredStats(
    filteredTickets
) {
    const satisfactionValues =
        filteredTickets
            .map(ticket =>
                parseNumber(
                    ticket[
                        "Customer Satisfaction Rating"
                    ] ??
                    ticket[
                        "Customer Satisfaction"
                    ] ??
                    ticket.satisfaction
                )
            )
            .filter(
                value => value !== null
            );

    const averageSatisfaction =
        satisfactionValues.length > 0
            ? satisfactionValues.reduce(
                  (sum, value) =>
                      sum + value,
                  0
              ) /
              satisfactionValues.length
            : null;

    const resolutionAverage =
        getFilteredResolutionAverage();

    const satisfactionElement =
        document.getElementById(
            "filtered-satisfaction"
        );

    const resolutionElement =
        document.getElementById(
            "filtered-resolution"
        );

    if (satisfactionElement) {
        satisfactionElement.textContent =
            averageSatisfaction !== null
                ? `${formatNumber(
                      averageSatisfaction,
                      2
                  )} / 5`
                : "N/A";
    }

    if (resolutionElement) {
        resolutionElement.textContent =
            resolutionAverage !== null
                ? `${formatNumber(
                      resolutionAverage,
                      2
                  )} hrs`
                : "N/A";
    }
}

/* =========================================================
   FILTERED RESOLUTION AVERAGE
========================================================= */

function getFilteredResolutionAverage() {
    /*
     * The source ticket-level "Time to Resolution"
     * field is unavailable.
     *
     * Therefore, only return an aggregate resolution
     * value when exactly one supported filter is active.
     *
     * We intentionally do NOT calculate fake
     * cross-filtered resolution values.
     */

    const activeFilters = [
        filters.priority,
        filters.ticketType,
        filters.channel
    ].filter(Boolean);

    if (activeFilters.length !== 1) {
        return null;
    }

    if (filters.priority) {
        const item =
            resolutionData.priority.find(
                row =>
                    normalizeText(
                        row.priority
                    ) ===
                    normalizeText(
                        filters.priority
                    )
            );

        return item
            ? parseNumber(
                  item.average_resolution_hours
              )
            : null;
    }

    if (filters.ticketType) {
        const item =
            resolutionData.type.find(
                row =>
                    normalizeText(
                        row.type ??
                        row.ticket_type
                    ) ===
                    normalizeText(
                        filters.ticketType
                    )
            );

        return item
            ? parseNumber(
                  item.average_resolution_hours
              )
            : null;
    }

    if (filters.channel) {
        const item =
            resolutionData.channel.find(
                row =>
                    normalizeText(
                        row.channel
                    ) ===
                    normalizeText(
                        filters.channel
                    )
            );

        return item
            ? parseNumber(
                  item.average_resolution_hours
              )
            : null;
    }

    return null;
}

/* =========================================================
   RESOLUTION DATA FOR FILTER
========================================================= */

function getResolutionDataForFilter(
    data,
    field
) {
    if (!Array.isArray(data)) {
        return [];
    }

    /*
     * Only filter the chart corresponding to the
     * selected dimension.
     *
     * Example:
     * If Priority = High, the priority chart shows
     * High while type/channel charts remain aggregate.
     *
     * This avoids inventing unavailable cross-tabulated
     * resolution values.
     */

    if (field === "priority" && filters.priority) {
        return data.filter(
            row =>
                normalizeText(
                    row.priority
                ) ===
                normalizeText(
                    filters.priority
                )
        );
    }

    if (field === "type" && filters.ticketType) {
        return data.filter(
            row =>
                normalizeText(
                    row.type ??
                    row.ticket_type
                ) ===
                normalizeText(
                    filters.ticketType
                )
        );
    }

    if (field === "channel" && filters.channel) {
        return data.filter(
            row =>
                normalizeText(
                    row.channel
                ) ===
                normalizeText(
                    filters.channel
                )
        );
    }

    return data;
}

/* =========================================================
   RESOLUTION CHARTS
========================================================= */

function updateResolutionCharts() {
    createResolutionChart(
        "priority-chart",
        "Resolution by Priority",
        getResolutionDataForFilter(
            resolutionData.priority,
            "priority"
        ),
        "priority"
    );

    createResolutionChart(
        "type-chart",
        "Resolution by Ticket Type",
        getResolutionDataForFilter(
            resolutionData.type,
            "type"
        ),
        "type"
    );

    createResolutionChart(
        "channel-chart",
        "Resolution by Channel",
        getResolutionDataForFilter(
            resolutionData.channel,
            "channel"
        ),
        "channel"
    );
}

/* =========================================================
   CREATE RESOLUTION CHART
========================================================= */

function createResolutionChart(
    canvasId,
    title,
    data,
    field
) {
    const canvas =
        document.getElementById(canvasId);

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    if (!Array.isArray(data) || data.length === 0) {
        const parent =
            canvas.parentElement;

        if (parent) {
            const existingMessage =
                parent.querySelector(
                    ".chart-empty-message"
                );

            if (!existingMessage) {
                const message =
                    document.createElement(
                        "div"
                    );

                message.className =
                    "chart-empty-message";

                message.textContent =
                    "No resolution data available.";

                parent.appendChild(message);
            }
        }

        return;
    }

    const labels = [];
    const values = [];

    data.forEach(row => {
        let label = "";

        if (field === "priority") {
            label =
                row.priority ??
                row.Priority ??
                "";
        }

        if (field === "type") {
            label =
                row.type ??
                row.ticket_type ??
                row["Ticket Type"] ??
                "";
        }

        if (field === "channel") {
            label =
                row.channel ??
                row.Channel ??
                "";
        }

        const value =
            parseNumber(
                row.average_resolution_hours ??
                row.avg_resolution_hours ??
                row.average_resolution ??
                row.value
            );

        if (
            label &&
            value !== null
        ) {
            labels.push(label);
            values.push(value);
        }
    });

    if (labels.length === 0) {
        return;
    }

    charts[canvasId] =
        new Chart(canvas, {
            type: "bar",

            data: {
                labels,

                datasets: [
                    {
                        label:
                            "Average Resolution Time (hours)",

                        data: values
                    }
                ]
            },

            options: {
                responsive: true,

                maintainAspectRatio: false,

                scales: {
                    y: {
                        beginAtZero: true,

                        title: {
                            display: true,

                            text:
                                "Hours"
                        }
                    }
                },

                plugins: {
                    title: {
                        display: false,

                        text: title
                    },

                    legend: {
                        display: false
                    },

                    tooltip: {
                        callbacks: {
                            label:
                                function(context) {
                                    return `${formatNumber(
                                        context.raw,
                                        2
                                    )} hrs`;
                                }
                        }
                    }
                }
            }
        });
}

/* =========================================================
   TICKET SELECTOR
========================================================= */

function populateTicketSelector() {
    const selector =
        document.getElementById(
            "ticket-selector"
        );

    if (!selector) {
        return;
    }

    selector.innerHTML = "";

    ticketData.forEach(
        (ticket, index) => {
            const ticketId =
                ticket["Ticket ID"] ??
                ticket.ticket_id ??
                ticket.ticketId ??
                index + 1;

            const customerEmail =
                ticket["Customer Email"] ??
                ticket.customer_email ??
                ticket.customerEmail ??
                "";

            const option =
                document.createElement(
                    "option"
                );

            option.value = index;

            option.textContent =
                customerEmail
                    ? `Ticket ${ticketId} — ${customerEmail}`
                    : `Ticket ${ticketId}`;

            selector.appendChild(option);
        }
    );
}

/* =========================================================
   NAVIGATION
========================================================= */

function initializeNavigation() {
    const links =
        document.querySelectorAll(
            'a[href^="#"]'
        );

    links.forEach(link => {
        link.addEventListener(
            "click",
            event => {
                const targetId =
                    link
                        .getAttribute("href")
                        ?.substring(1);

                if (!targetId) {
                    return;
                }

                const target =
                    document.getElementById(
                        targetId
                    );

                if (!target) {
                    return;
                }

                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        );
    });
}

/* =========================================================
   AI TICKET ANALYSIS
========================================================= */

function initializeAIAnalysis() {
    const analyzeButton =
        document.getElementById(
            "analyze-ticket-button"
        );

    const selector =
        document.getElementById(
            "ticket-selector"
        );

    if (!analyzeButton || !selector) {
        return;
    }

    analyzeButton.addEventListener(
        "click",
        analyzeSelectedTicket
    );
}

/* =========================================================
   ANALYZE SELECTED TICKET
========================================================= */

async function analyzeSelectedTicket() {
    const selector =
        document.getElementById(
            "ticket-selector"
        );

    if (!selector) {
        return;
    }

    const index =
        Number(selector.value);

    const ticket =
        ticketData[index];

    if (!ticket) {
        showAIResult(
            "No ticket selected."
        );

        return;
    }

    const button =
        document.getElementById(
            "analyze-ticket-button"
        );

    if (button) {
        button.disabled = true;
        button.textContent =
            "Analyzing...";
    }

    try {
        const payload =
            buildAnalysisPayload(ticket);

        const result =
            await fetchAIAnalysis(payload);

        displayAIAnalysis(
            ticket,
            result
        );
    } catch (error) {
        console.error(
            "AI ticket analysis error:",
            error
        );

        showAIResult(
            "Unable to analyze this ticket. Please make sure the SupportIQ backend API is running."
        );
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent =
                "Analyze Selected Ticket";
        }
    }
}

/* =========================================================
   BUILD AI PAYLOAD
========================================================= */

function buildAnalysisPayload(ticket) {
    return {
        customer_age:
            parseNumber(
                ticket["Customer Age"] ??
                ticket["Age"] ??
                ticket.customer_age
            ),

        ticket_priority:
            ticket["Ticket Priority"] ??
            ticket["Priority"] ??
            ticket.priority ??
            "",

        ticket_type:
            ticket["Ticket Type"] ??
            ticket["Type"] ??
            ticket.ticket_type ??
            "",

        support_channel:
            ticket["Ticket Channel"] ??
            ticket["Channel"] ??
            ticket.channel ??
            "",

        ticket_description:
            ticket["Ticket Description"] ??
            ticket["Description"] ??
            ticket.description ??
            ""
    };
}

/* =========================================================
   BACKEND API
========================================================= */

async function fetchAIAnalysis(payload) {
    const apiUrl =
        "http://127.0.0.1:8000/analyze";

    const response =
        await fetch(apiUrl, {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify(
                payload
            )
        });

    if (!response.ok) {
        throw new Error(
            `API request failed: ${response.status}`
        );
    }

    return response.json();
}

/* =========================================================
   DISPLAY AI ANALYSIS
========================================================= */

function displayAIAnalysis(
    ticket,
    result
) {
    const container =
        document.getElementById(
            "ai-analysis-result"
        );

    if (!container) {
        return;
    }

    const risk =
        result.satisfaction_risk ??
        result.risk ??
        result.prediction ??
        "N/A";

    const probability =
        result.risk_probability ??
        result.probability ??
        null;

    const keywords =
        result.keywords ??
        [];

    const ticketInfo =
        result.ticket ??
        result.ticket_info ??
        {};

    const riskText =
        typeof risk === "string"
            ? risk
            : String(risk);

    const probabilityText =
        probability !== null
            ? `${formatNumber(
                  Number(probability) * 100,
                  2
              )}%`
            : "N/A";

    const keywordList =
        Array.isArray(keywords)
            ? keywords
            : [];

    container.innerHTML = `
        <div class="ai-result-card">

            <h3>
                AI Ticket Analysis
            </h3>

            <div class="ai-result-grid">

                <div>
                    <strong>
                        Satisfaction Risk
                    </strong>

                    <p>
                        ${escapeHTML(
                            riskText
                        )}
                    </p>
                </div>

                <div>
                    <strong>
                        Risk Probability
                    </strong>

                    <p>
                        ${probabilityText}
                    </p>
                </div>

                <div>
                    <strong>
                        Ticket Priority
                    </strong>

                    <p>
                        ${escapeHTML(
                            ticketInfo.priority ??
                            ticket["Ticket Priority"] ??
                            "N/A"
                        )}
                    </p>
                </div>

                <div>
                    <strong>
                        Ticket Type
                    </strong>

                    <p>
                        ${escapeHTML(
                            ticketInfo.ticket_type ??
                            ticket["Ticket Type"] ??
                            "N/A"
                        )}
                    </p>
                </div>

            </div>

            <div class="ai-keywords">

                <strong>
                    Extracted Keywords
                </strong>

                <p>
                    ${
                        keywordList.length > 0
                            ? keywordList
                                  .map(
                                      keyword =>
                                          `<span class="keyword-tag">${escapeHTML(
                                              keyword
                                          )}</span>`
                                  )
                                  .join(" ")
                            : "No keywords extracted."
                    }
                </p>

            </div>

        </div>
    `;
}

/* =========================================================
   AI RESULT FALLBACK
========================================================= */

function showAIResult(message) {
    const container =
        document.getElementById(
            "ai-analysis-result"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="ai-result-card">
            <p>
                ${escapeHTML(message)}
            </p>
        </div>
    `;
}
/* =========================================================
   ADDITIONAL AI RESULT DETAILS
========================================================= */

function renderTicketDetails(ticket) {
    if (!ticket) {
        return "";
    }

    const ticketId =
        ticket["Ticket ID"] ??
        ticket.ticket_id ??
        ticket.ticketId ??
        "N/A";

    const customerEmail =
        ticket["Customer Email"] ??
        ticket.customer_email ??
        ticket.customerEmail ??
        "N/A";

    const subject =
        ticket["Ticket Subject"] ??
        ticket["Subject"] ??
        ticket.subject ??
        "N/A";

    const description =
        ticket["Ticket Description"] ??
        ticket["Description"] ??
        ticket.description ??
        "N/A";

    const priority =
        ticket["Ticket Priority"] ??
        ticket["Priority"] ??
        ticket.priority ??
        "N/A";

    const type =
        ticket["Ticket Type"] ??
        ticket["Type"] ??
        ticket.ticket_type ??
        "N/A";

    const channel =
        ticket["Ticket Channel"] ??
        ticket["Channel"] ??
        ticket.channel ??
        "N/A";

    return `
        <div class="ticket-details">

            <div class="ticket-detail-item">
                <strong>Ticket ID</strong>
                <span>
                    ${escapeHTML(ticketId)}
                </span>
            </div>

            <div class="ticket-detail-item">
                <strong>Customer Email</strong>
                <span>
                    ${escapeHTML(customerEmail)}
                </span>
            </div>

            <div class="ticket-detail-item">
                <strong>Subject</strong>
                <span>
                    ${escapeHTML(subject)}
                </span>
            </div>

            <div class="ticket-detail-item">
                <strong>Priority</strong>
                <span>
                    ${escapeHTML(priority)}
                </span>
            </div>

            <div class="ticket-detail-item">
                <strong>Ticket Type</strong>
                <span>
                    ${escapeHTML(type)}
                </span>
            </div>

            <div class="ticket-detail-item">
                <strong>Channel</strong>
                <span>
                    ${escapeHTML(channel)}
                </span>
            </div>

            <div class="ticket-description">
                <strong>Description</strong>

                <p>
                    ${escapeHTML(description)}
                </p>
            </div>

        </div>
    `;
}

/* =========================================================
   FILTERED DASHBOARD REFRESH
========================================================= */

function refreshDashboard() {
    updateFilteredDashboard();
    updateResolutionCharts();
}

/* =========================================================
   WINDOW RESIZE HANDLING
========================================================= */

window.addEventListener(
    "resize",
    () => {
        Object.values(charts).forEach(
            chart => {
                if (
                    chart &&
                    typeof chart.resize ===
                        "function"
                ) {
                    chart.resize();
                }
            }
        );
    }
);

/* =========================================================
   SAFE CHART DESTROY
========================================================= */

function destroyChart(chartName) {
    if (
        charts[chartName] &&
        typeof charts[chartName].destroy ===
            "function"
    ) {
        charts[chartName].destroy();
        charts[chartName] = null;
    }
}

/* =========================================================
   DASHBOARD DEBUG INFORMATION
========================================================= */

function getDashboardDebugInfo() {
    return {
        tickets:
            Array.isArray(ticketData)
                ? ticketData.length
                : 0,

        segmentMappings:
            Array.isArray(
                ticketSegmentMapping
            )
                ? ticketSegmentMapping.length
                : 0,

        segmentMapSize:
            ticketSegmentMap.size,

        resolution: {
            priority:
                resolutionData.priority.length,

            type:
                resolutionData.type.length,

            channel:
                resolutionData.channel.length
        },

        filters: {
            ...filters
        }
    };
}

/* =========================================================
   EXPOSE DEBUG HELPER
========================================================= */

window.SupportIQ = {
    refreshDashboard,
    getFilteredTickets,
    getTicketSegment,
    getDashboardDebugInfo,
    updateResolutionCharts
};

/* =========================================================
   FINAL SAFETY CHECK
========================================================= */

console.log(
    "SupportIQ: script loaded successfully."
);
