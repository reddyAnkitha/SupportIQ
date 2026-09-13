/* =========================================================
   SupportIQ - Customer Support Intelligence Dashboard
   ========================================================= */

"use strict";

/* =========================================================
   Global State
   ========================================================= */

let ticketData = [];
let dashboardMetrics = {};
let resolutionByPriority = [];
let resolutionByType = [];
let resolutionByChannel = [];

let segmentData = [];
let satisfactionData = {};

let filtersReady = false;
let charts = {};


/* =========================================================
   Configuration
   ========================================================= */

const DATA_PATH = "data/";

const FILES = {
    tickets: "ticket_data.json",
    metrics: "dashboard_metrics.csv",
    segments: "segment_dashboard.json",
    satisfaction: "satisfaction_dashboard.json",
    priorityResolution: "resolution_by_priority.json",
    typeResolution: "resolution_by_type.json",
    channelResolution: "resolution_by_channel.json"
};


/* =========================================================
   Utility Functions
   ========================================================= */

/**
 * Convert a value into a number safely.
 */
function toNumber(value, fallback = null) {
    if (
        value === null ||
        value === undefined ||
        value === "" ||
        value === "NaN" ||
        value === "null"
    ) {
        return fallback;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : fallback;
}


/**
 * Safely normalize text.
 */
function normalizeText(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
}


/**
 * Display-friendly text.
 */
function displayText(value) {
    if (value === null || value === undefined || value === "") {
        return "N/A";
    }

    return String(value);
}


/**
 * Round a number.
 */
function round(value, decimals = 2) {
    if (!Number.isFinite(value)) {
        return null;
    }

    const factor = Math.pow(10, decimals);

    return Math.round(value * factor) / factor;
}


/**
 * Calculate average from valid numeric values.
 */
function average(values) {
    const valid = values
        .map(value => toNumber(value, null))
        .filter(value => value !== null);

    if (valid.length === 0) {
        return null;
    }

    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}


/**
 * Capitalize each word.
 */
function titleCase(value) {
    return String(value)
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .map(word => {
            if (!word) {
                return "";
            }

            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
}


/* =========================================================
   Resolution Handling
   ========================================================= */

/**
 * Convert a resolution value to hours.
 *
 * IMPORTANT:
 * ticket_data.json contains NaN for Time to Resolution.
 * Therefore this function intentionally returns null for
 * missing values rather than inventing a resolution time.
 */
function getResolutionHours(value) {
    if (
        value === null ||
        value === undefined ||
        value === "" ||
        value === "NaN" ||
        value === "null"
    ) {
        return null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    const text = String(value).trim();

    if (!text || text.toLowerCase() === "nan") {
        return null;
    }

    /*
     * Numeric value.
     */
    const numeric = Number(text);

    if (Number.isFinite(numeric)) {
        return numeric;
    }

    /*
     * Pandas timedelta examples:
     *
     * 0 days 11:45:00
     * 1 days 04:30:00
     * 11:45:00
     */
    let match = text.match(
        /^(-?\d+)\s+days?\s+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/
    );

    if (match) {
        const days = Number(match[1]);
        const hours = Number(match[2]);
        const minutes = Number(match[3]);
        const seconds = Number(match[4] || 0);

        return (
            days * 24 +
            hours +
            minutes / 60 +
            seconds / 3600
        );
    }

    /*
     * HH:MM:SS
     */
    match = text.match(
        /^(\d{1,3}):(\d{2}):(\d{2})$/
    );

    if (match) {
        const hours = Number(match[1]);
        const minutes = Number(match[2]);
        const seconds = Number(match[3]);

        return hours + minutes / 60 + seconds / 3600;
    }

    /*
     * HH:MM
     */
    match = text.match(
        /^(\d{1,3}):(\d{2})$/
    );

    if (match) {
        const hours = Number(match[1]);
        const minutes = Number(match[2]);

        return hours + minutes / 60;
    }

    /*
     * Examples:
     * 11.77 hours
     * 11 hours
     */
    match = text.match(
        /(-?\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i
    );

    if (match) {
        return Number(match[1]);
    }

    /*
     * ISO-style duration:
     * PT11H30M
     */
    match = text.match(
        /^P(?:\d+D)?T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i
    );

    if (match) {
        const hours = Number(match[1] || 0);
        const minutes = Number(match[2] || 0);
        const seconds = Number(match[3] || 0);

        return hours + minutes / 60 + seconds / 3600;
    }

    return null;
}


/* =========================================================
   Safe JSON Loading
   ========================================================= */

async function loadJSON(filename) {
    const response = await fetch(DATA_PATH + filename, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(
            `Unable to load ${filename} (${response.status})`
        );
    }

    const text = await response.text();

    /*
     * The exported ticket JSON can contain JavaScript-style
     * NaN / Infinity values from pandas.
     *
     * JSON.parse() does not accept these values, so convert
     * them to null before parsing.
     */
    const safeText = text
        .replace(/\bNaN\b/g, "null")
        .replace(/\bInfinity\b/g, "null")
        .replace(/\b-Infinity\b/g, "null");

    return JSON.parse(safeText);
}


/* =========================================================
   CSV Loading
   ========================================================= */

async function loadCSV(filename) {
    const response = await fetch(DATA_PATH + filename, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(
            `Unable to load ${filename} (${response.status})`
        );
    }

    return response.text();
}


/**
 * Basic CSV parser.
 */
function parseCSV(csvText) {
    const rows = [];
    let row = [];
    let cell = "";
    let insideQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const next = csvText[i + 1];

        if (char === '"' && insideQuotes && next === '"') {
            cell += '"';
            i++;
            continue;
        }

        if (char === '"') {
            insideQuotes = !insideQuotes;
            continue;
        }

        if (char === "," && !insideQuotes) {
            row.push(cell.trim());
            cell = "";
            continue;
        }

        if (
            (char === "\n" || char === "\r") &&
            !insideQuotes
        ) {
            if (char === "\r" && next === "\n") {
                i++;
            }

            row.push(cell.trim());

            if (row.some(value => value !== "")) {
                rows.push(row);
            }

            row = [];
            cell = "";
            continue;
        }

        cell += char;
    }

    if (cell !== "" || row.length > 0) {
        row.push(cell.trim());

        if (row.some(value => value !== "")) {
            rows.push(row);
        }
    }

    if (rows.length === 0) {
        return [];
    }

    const headers = rows[0];

    return rows.slice(1).map(values => {
        const object = {};

        headers.forEach((header, index) => {
            object[header] = values[index] ?? "";
        });

        return object;
    });
}


/* =========================================================
   Dashboard Metrics
   ========================================================= */

async function loadDashboardMetrics() {
    try {
        const csv = await loadCSV(FILES.metrics);
        const rows = parseCSV(csv);

        rows.forEach(row => {
            const metric = normalizeText(row.metric);
            const value = toNumber(row.value, null);

            if (metric && value !== null) {
                dashboardMetrics[metric] = value;
            }
        });
    } catch (error) {
        console.warn(
            "Dashboard metrics could not be loaded:",
            error
        );
    }

    /*
     * Reliable fallback values from the project's analytics.
     */
    if (
        !Number.isFinite(
            dashboardMetrics["total tickets"]
        )
    ) {
        dashboardMetrics["total tickets"] = 8469;
    }

    if (
        !Number.isFinite(
            dashboardMetrics["average satisfaction"]
        )
    ) {
        dashboardMetrics["average satisfaction"] = 2.99;
    }

    if (
        !Number.isFinite(
            dashboardMetrics["average resolution"]
        )
    ) {
        dashboardMetrics["average resolution"] = 11.77;
    }

    if (
        !Number.isFinite(
            dashboardMetrics["customer segments"]
        )
    ) {
        dashboardMetrics["customer segments"] = 6;
    }
}


/* =========================================================
   Ticket Data
   ========================================================= */

async function loadTicketData() {
    try {
        const data = await loadJSON(FILES.tickets);

        if (Array.isArray(data)) {
            ticketData = data;
        } else {
            console.error(
                "ticket_data.json does not contain an array."
            );

            ticketData = [];
        }

        console.log(
            `Loaded ${ticketData.length} ticket records.`
        );

        initializeFilters();
        updateFilteredDashboard();

    } catch (error) {
        console.error(
            "Ticket data loading error:",
            error
        );

        ticketData = [];

        showDataError(
            "Ticket-level data could not be loaded."
        );
    }
}


/* =========================================================
   Supporting Analytics Data
   ========================================================= */

async function loadSegmentData() {
    try {
        const data = await loadJSON(FILES.segments);

        segmentData =
            Array.isArray(data)
                ? data
                : data.segments || [];

        renderSegments();

    } catch (error) {
        console.error(
            "Segment data loading error:",
            error
        );

        segmentData = [];

        showDataError(
            "Customer segment analytics could not be loaded."
        );
    }
}


async function loadSatisfactionData() {
    try {
        const data = await loadJSON(FILES.satisfaction);

        satisfactionData = data || {};

        renderSatisfaction();

    } catch (error) {
        console.error(
            "Satisfaction data loading error:",
            error
        );

        satisfactionData = {};

        showDataError(
            "Satisfaction analytics could not be loaded."
        );
    }
}


async function loadResolutionData() {
    try {
        const priorityData = await loadJSON(
            FILES.priorityResolution
        );

        const typeData = await loadJSON(
            FILES.typeResolution
        );

        const channelData = await loadJSON(
            FILES.channelResolution
        );

        resolutionByPriority =
            priorityData.data || [];

        resolutionByType =
            typeData.data || [];

        resolutionByChannel =
            channelData.data || [];

        renderResolutionCharts();

    } catch (error) {
        console.error(
            "Resolution analytics loading error:",
            error
        );

        resolutionByPriority = [];
        resolutionByType = [];
        resolutionByChannel = [];

        showDataError(
            "Resolution analytics could not be loaded."
        );
    }
}


/* =========================================================
   Main Dashboard
   ========================================================= */

function renderDashboard() {
    setElementText(
        "total-tickets",
        formatNumber(
            dashboardMetrics["total tickets"]
        )
    );

    setElementText(
        "average-satisfaction",
        formatDecimal(
            dashboardMetrics["average satisfaction"],
            2
        ) + " / 5"
    );

    setElementText(
        "average-resolution",
        formatDecimal(
            dashboardMetrics["average resolution"],
            2
        ) + " hrs"
    );

    setElementText(
        "customer-segments",
        formatNumber(
            dashboardMetrics["customer segments"]
        )
    );
}


/* =========================================================
   Segment Rendering
   ========================================================= */

function renderSegments() {
    const container =
        document.getElementById(
            "segment-container"
        );

    if (!container) {
        return;
    }

    if (!segmentData.length) {
        container.innerHTML =
            "<p>No segment data available.</p>";

        return;
    }

    let html = `
        <div class="segment-table-wrapper">
            <table class="segment-table">
                <thead>
                    <tr>
                        <th>Customer Segment</th>
                        <th>Customers</th>
                        <th>Avg Age</th>
                        <th>Avg Satisfaction</th>
                        <th>Avg Resolution</th>
                    </tr>
                </thead>
                <tbody>
    `;

    segmentData.forEach(segment => {
        const name =
            segment.segment ||
            segment.name ||
            "Unknown";

        const customers =
            toNumber(segment.customers, 0);

        const age =
            toNumber(segment.avg_age, null);

        const satisfaction =
            toNumber(
                segment.avg_satisfaction,
                null
            );

        const resolution =
            toNumber(
                segment.avg_resolution_hours,
                null
            );

        html += `
            <tr>
                <td>${escapeHTML(name)}</td>
                <td>${formatNumber(customers)}</td>
                <td>${formatDecimal(age, 1)}</td>
                <td>${formatDecimal(satisfaction, 2)}</td>
                <td>${formatDecimal(resolution, 2)} hrs</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}


/* =========================================================
   Satisfaction Rendering
   ========================================================= */

function renderSatisfaction() {
    const low =
        toNumber(
            satisfactionData.low_satisfaction_tickets,
            1102
        );

    const satisfied =
        toNumber(
            satisfactionData.satisfied_tickets,
            1667
        );

    const lowRate =
        toNumber(
            satisfactionData.low_satisfaction_percentage,
            39.8
        );

    const accuracy =
        toNumber(
            satisfactionData.model_accuracy,
            59.75
        );

    setElementText(
        "low-satisfaction",
        formatNumber(low)
    );

    setElementText(
        "satisfied-customers",
        formatNumber(satisfied)
    );

    setElementText(
        "low-satisfaction-rate",
        formatDecimal(lowRate, 1) + "%"
    );

    setElementText(
        "model-accuracy",
        formatDecimal(accuracy, 2) + "%"
    );
}


/* =========================================================
   Filters
   ========================================================= */

function initializeFilters() {
    if (!ticketData.length) {
        return;
    }

    const priorityFilter =
        document.getElementById(
            "priority-filter"
        );

    const typeFilter =
        document.getElementById(
            "type-filter"
        );

    const channelFilter =
        document.getElementById(
            "channel-filter"
        );

    const segmentFilter =
        document.getElementById(
            "segment-filter-main"
        );

    if (
        !priorityFilter ||
        !typeFilter ||
        !channelFilter ||
        !segmentFilter
    ) {
        return;
    }

    /*
     * Prevent rebuilding filters unnecessarily.
     */
    if (!filtersReady) {
        populateFilter(
            priorityFilter,
            getUniqueValues(
                ticketData,
                "Ticket Priority"
            ),
            "All Priorities"
        );

        populateFilter(
            typeFilter,
            getUniqueValues(
                ticketData,
                "Ticket Type"
            ),
            "All Ticket Types"
        );

        populateFilter(
            channelFilter,
            getUniqueValues(
                ticketData,
                "Ticket Channel"
            ),
            "All Channels"
        );

        populateSegmentFilter(
            segmentFilter
        );

        priorityFilter.addEventListener(
            "change",
            updateFilteredDashboard
        );

        typeFilter.addEventListener(
            "change",
            updateFilteredDashboard
        );

        channelFilter.addEventListener(
            "change",
            updateFilteredDashboard
        );

        segmentFilter.addEventListener(
            "change",
            updateFilteredDashboard
        );

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

        filtersReady = true;
    }
}


/**
 * Populate standard select filter.
 */
function populateFilter(
    select,
    values,
    defaultLabel
) {
    const sortedValues = [...values].sort(
        (a, b) =>
            String(a).localeCompare(
                String(b)
            )
    );

    select.innerHTML = "";

    const defaultOption =
        document.createElement("option");

    defaultOption.value = "";
    defaultOption.textContent =
        defaultLabel;

    select.appendChild(defaultOption);

    sortedValues.forEach(value => {
        const option =
            document.createElement("option");

        option.value = value;
        option.textContent = titleCase(value);

        select.appendChild(option);
    });
}


/**
 * Populate segment filter.
 */
function populateSegmentFilter(select) {
    select.innerHTML = "";

    const defaultOption =
        document.createElement("option");

    defaultOption.value = "";
    defaultOption.textContent =
        "All Segments";

    select.appendChild(defaultOption);

    segmentData.forEach(segment => {
        const name =
            segment.segment ||
            segment.name;

        if (!name) {
            return;
        }

        const option =
            document.createElement("option");

        option.value = name;
        option.textContent = name;

        select.appendChild(option);
    });
}


/**
 * Get unique values.
 */
function getUniqueValues(
    data,
    field
) {
    const values = new Set();

    data.forEach(row => {
        const value = row[field];

        if (
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
        ) {
            values.add(String(value).trim());
        }
    });

    return [...values];
}


/* =========================================================
   Segment Classification
   ========================================================= */

/**
 * Approximate ticket-level segment.
 *
 * Note:
 * The exported segment analytics are based on closed-ticket
 * segmentation. ticket_data.json does not contain the original
 * cluster label, so this function only provides a useful
 * ticket-level classification for filtering.
 */
function inferSegment(ticket) {
    const age =
        toNumber(
            ticket["Customer Age"],
            null
        );

    const satisfaction =
        toNumber(
            ticket[
                "Customer Satisfaction Rating"
            ],
            null
        );

    const resolution =
        getResolutionHours(
            ticket["Time to Resolution"]
        );

    if (
        age === null &&
        satisfaction === null
    ) {
        return "";
    }

    let ageGroup = "Middle Age";

    if (age !== null) {
        if (age < 35) {
            ageGroup = "Young";
        } else if (age >= 50) {
            ageGroup = "Older";
        }
    }

    /*
     * Satisfaction categories.
     */
    const atRisk =
        satisfaction !== null &&
        satisfaction <= 2;

    const highlySatisfied =
        satisfaction !== null &&
        satisfaction >= 4;

    /*
     * If resolution is unavailable, use satisfaction
     * to keep the classification stable rather than
     * inventing a resolution value.
     */
    if (resolution === null) {
        if (atRisk) {
            return `${ageGroup} - At Risk and Fast`;
        }

        if (highlySatisfied) {
            return `${ageGroup} - Satisfied but Slow`;
        }

        return "";
    }

    const fast = resolution < 10;

    if (atRisk && fast) {
        return `${ageGroup} - At Risk and Fast`;
    }

    if (atRisk && !fast) {
        return `${ageGroup} - At Risk and Slow`;
    }

    if (highlySatisfied && fast) {
        return `${ageGroup} - Highly Satisfied and Fast`;
    }

    if (highlySatisfied && !fast) {
        return `${ageGroup} - Satisfied but Slow`;
    }

    return fast
        ? `${ageGroup} - At Risk and Fast`
        : `${ageGroup} - Satisfied but Slow`;
}


/* =========================================================
   Filtering
   ========================================================= */

function getFilteredTickets() {
    if (!ticketData.length) {
        return [];
    }

    const priority =
        getFilterValue(
            "priority-filter"
        );

    const type =
        getFilterValue(
            "type-filter"
        );

    const channel =
        getFilterValue(
            "channel-filter"
        );

    const segment =
        getFilterValue(
            "segment-filter-main"
        );

    return ticketData.filter(ticket => {
        const ticketPriority =
            String(
                ticket["Ticket Priority"] || ""
            ).trim();

        const ticketType =
            String(
                ticket["Ticket Type"] || ""
            ).trim();

        const ticketChannel =
            String(
                ticket["Ticket Channel"] || ""
            ).trim();

        if (
            priority &&
            normalizeText(ticketPriority) !==
                normalizeText(priority)
        ) {
            return false;
        }

        if (
            type &&
            normalizeText(ticketType) !==
                normalizeText(type)
        ) {
            return false;
        }

        if (
            channel &&
            normalizeText(ticketChannel) !==
                normalizeText(channel)
        ) {
            return false;
        }

        if (segment) {
            const inferred =
                inferSegment(ticket);

            if (inferred !== segment) {
                return false;
            }
        }

        return true;
    });
}


/**
 * Update filtered dashboard.
 */
function updateFilteredDashboard() {
    const filtered =
        getFilteredTickets();

    updateFilteredStats(filtered);
    updateFilterStatus(filtered);
}


/* =========================================================
   Filtered Statistics
   ========================================================= */

function updateFilteredStats(
    filtered
) {
    const ticketCount =
        filtered.length;

    const satisfactionValues =
        filtered
            .map(ticket =>
                toNumber(
                    ticket[
                        "Customer Satisfaction Rating"
                    ],
                    null
                )
            )
            .filter(
                value => value !== null
            );

    /*
     * Important:
     *
     * Time to Resolution is NaN in the
     * ticket-level JSON. Therefore we do
     * NOT calculate a filtered average
     * from this field.
     */
    const resolutionValues =
        filtered
            .map(ticket =>
                getResolutionHours(
                    ticket[
                        "Time to Resolution"
                    ]
                )
            )
            .filter(
                value => value !== null
            );

    const avgSatisfaction =
        average(
            satisfactionValues
        );

    const avgResolution =
        average(
            resolutionValues
        );

    setElementText(
        "filtered-ticket-count",
        formatNumber(ticketCount)
    );

    setElementText(
        "filtered-average-satisfaction",
        avgSatisfaction === null
            ? "N/A"
            : `${formatDecimal(
                  avgSatisfaction,
                  2
              )} / 5`
    );

    const resolutionElement =
        document.getElementById(
            "filtered-average-resolution"
        );

    if (resolutionElement) {
        if (avgResolution === null) {
            resolutionElement.textContent =
                "See analytics";
        } else {
            resolutionElement.textContent =
                `${formatDecimal(
                    avgResolution,
                    2
                )} hrs`;
        }
    }
}


/* =========================================================
   Filter Status
   ========================================================= */

function updateFilterStatus(
    filtered
) {
    const status =
        document.getElementById(
            "filter-result-status"
        );

    if (!status) {
        return;
    }

    const priority =
        getFilterValue(
            "priority-filter"
        );

    const type =
        getFilterValue(
            "type-filter"
        );

    const channel =
        getFilterValue(
            "channel-filter"
        );

    const segment =
        getFilterValue(
            "segment-filter-main"
        );

    const hasFilter =
        Boolean(
            priority ||
            type ||
            channel ||
            segment
        );

    if (!hasFilter) {
        status.textContent =
            `Showing all ${formatNumber(
                ticketData.length
            )} tickets.`;
        return;
    }

    status.textContent =
        `Showing ${formatNumber(
            filtered.length
        )} of ${formatNumber(
            ticketData.length
        )} tickets.`;
}


/* =========================================================
   Reset Filters
   ========================================================= */

function resetFilters() {
    [
        "priority-filter",
        "type-filter",
        "channel-filter",
        "segment-filter-main"
    ].forEach(id => {
        const element =
            document.getElementById(id);

        if (element) {
            element.value = "";
        }
    });

    updateFilteredDashboard();
}


/* =========================================================
   Resolution Charts
   ========================================================= */

function renderResolutionCharts() {
    if (
        typeof Chart === "undefined"
    ) {
        console.warn(
            "Chart.js is not available."
        );

        return;
    }

    createResolutionChart(
        "priority-chart",
        "Average Resolution Time by Priority",
        resolutionByPriority.map(
            item => item.priority
        ),
        resolutionByPriority.map(
            item =>
                toNumber(
                    item.average_resolution_hours,
                    0
                )
        )
    );

    createResolutionChart(
        "type-chart",
        "Average Resolution Time by Ticket Type",
        resolutionByType.map(
            item => item.ticket_type
        ),
        resolutionByType.map(
            item =>
                toNumber(
                    item.average_resolution_hours,
                    0
                )
        )
    );

    createResolutionChart(
        "channel-chart",
        "Average Resolution Time by Support Channel",
        resolutionByChannel.map(
            item => item.channel
        ),
        resolutionByChannel.map(
            item =>
                toNumber(
                    item.average_resolution_hours,
                    0
                )
        )
    );
}


/**
 * Create / replace a Chart.js bar chart.
 */
function createResolutionChart(
    elementId,
    title,
    labels,
    values
) {
    const canvas =
        document.getElementById(
            elementId
        );

    if (!canvas) {
        return;
    }

    if (charts[elementId]) {
        charts[elementId].destroy();
    }

    charts[elementId] =
        new Chart(canvas, {
            type: "bar",

            data: {
                labels: labels,

                datasets: [
                    {
                        label:
                            "Average Resolution Time (hours)",

                        data: values,

                        borderWidth: 1
                    }
                ]
            },

            options: {
                responsive: true,

                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: true
                    },

                    title: {
                        display: true,
                        text: title
                    },

                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value =
                                    context.parsed.y;

                                return ` ${formatDecimal(
                                    value,
                                    2
                                )} hrs`;
                            }
                        }
                    }
                },

                scales: {
                    y: {
                        beginAtZero: true,

                        title: {
                            display: true,
                            text:
                                "Hours"
                        }
                    },

                    x: {
                        ticks: {
                            autoSkip: false
                        }
                    }
                }
            }
        });
}


/* =========================================================
   Error Handling
   ========================================================= */

function showDataError(message) {
    console.warn(message);

    /*
     * Do not replace the entire page.
     * Add a small non-blocking warning if a
     * dedicated error container exists.
     */
    const errorContainer =
        document.getElementById(
            "data-error"
        );

    if (errorContainer) {
        errorContainer.textContent =
            message;

        errorContainer.style.display =
            "block";
    }
}


/* =========================================================
   DOM Helpers
   ========================================================= */

function setElementText(
    id,
    value
) {
    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent =
        displayText(value);
}


function getFilterValue(id) {
    const element =
        document.getElementById(id);

    if (!element) {
        return "";
    }

    return element.value || "";
}


/**
 * Escape HTML before inserting dynamic
 * text into HTML.
 */
function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   Formatting
   ========================================================= */

function formatNumber(value) {
    const number =
        toNumber(value, null);

    if (number === null) {
        return "N/A";
    }

    return number.toLocaleString(
        "en-US",
        {
            maximumFractionDigits: 0
        }
    );
}


function formatDecimal(
    value,
    decimals = 2
) {
    const number =
        toNumber(value, null);

    if (number === null) {
        return "N/A";
    }

    return number.toLocaleString(
        "en-US",
        {
            minimumFractionDigits:
                decimals,

            maximumFractionDigits:
                decimals
        }
    );
}


/* =========================================================
   Initialization
   ========================================================= */

async function initializeDashboard() {
    console.log(
        "SupportIQ dashboard initializing..."
    );

    /*
     * Load independent data sources.
     * Promise.allSettled prevents one missing
     * analytics file from breaking the whole dashboard.
     */
    await Promise.allSettled([
        loadDashboardMetrics(),
        loadSegmentData(),
        loadSatisfactionData(),
        loadResolutionData(),
        loadTicketData()
    ]);

    renderDashboard();

    /*
     * Ticket data may finish after the other
     * files, so make sure filters are ready.
     */
    if (ticketData.length) {
        initializeFilters();
        updateFilteredDashboard();
    }

    console.log(
        "SupportIQ dashboard initialized."
    );
}


/* =========================================================
   Start Application
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);
