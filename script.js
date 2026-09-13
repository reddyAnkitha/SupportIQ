const DATA_PATH = "data/";

const FILES = {
    metrics: DATA_PATH + "dashboard_metrics.csv",
    segments: DATA_PATH + "segment_dashboard.json",
    satisfaction: DATA_PATH + "satisfaction_dashboard.json",

    // Resolution analytics files
    resolutionPriority: DATA_PATH + "resolution_by_priority.json",
    resolutionType: DATA_PATH + "resolution_by_type.json",
    resolutionChannel: DATA_PATH + "resolution_by_channel.json",

    // Ticket-level data is in the repository ROOT
    tickets: "ticket_data.json"
};

let ticketData = [];
let charts = {};

const fallbackMetrics = {
    totalTickets: 8469,
    averageSatisfaction: 2.99,
    averageResolution: 11.77,
    customerSegments: 6
};

const fallbackSatisfaction = {
    total_closed_tickets: 2769,
    low_satisfaction_tickets: 1102,
    satisfied_tickets: 1667,
    low_satisfaction_percentage: 39.8,
    model_accuracy: 59.75
};


/* =========================================================
   GENERAL HELPERS
========================================================= */

function getElement(id) {
    return document.getElementById(id);
}

function formatNumber(value, decimals = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "N/A";
    }

    return number.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function cleanJSONText(text) {
    return text
        .replace(/\bNaN\b/g, "null")
        .replace(/\bInfinity\b/g, "null")
        .replace(/\b-Infinity\b/g, "null");
}

function normalize(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim().toLowerCase();
}


/* =========================================================
   LOAD JSON FILE
========================================================= */

async function loadJSON(file) {
    const response = await fetch(file, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(
            `Unable to load ${file}: HTTP ${response.status}`
        );
    }

    const text = await response.text();

    return JSON.parse(cleanJSONText(text));
}


/* =========================================================
   LOAD DASHBOARD METRICS
========================================================= */

async function loadMetrics() {
    try {
        const response = await fetch(FILES.metrics, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Metrics file unavailable");
        }

        const text = await response.text();

        const lines = text
            .trim()
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

        const metrics = {};

        lines.slice(1).forEach(line => {
            const parts = line.split(",");

            if (parts.length < 2) {
                return;
            }

            const key = parts[0]
                .trim()
                .toLowerCase();

            const value = Number(
                parts[1].trim()
            );

            if (Number.isFinite(value)) {
                metrics[key] = value;
            }
        });

        return {
            totalTickets:
                metrics["total tickets"] ??
                metrics["total_tickets"] ??
                fallbackMetrics.totalTickets,

            averageSatisfaction:
                metrics["average satisfaction"] ??
                metrics["average_satisfaction"] ??
                fallbackMetrics.averageSatisfaction,

            averageResolution:
                metrics["average resolution"] ??
                metrics["average_resolution"] ??
                metrics["average resolution time"] ??
                fallbackMetrics.averageResolution,

            customerSegments:
                metrics["customer segments"] ??
                metrics["customer_segments"] ??
                fallbackMetrics.customerSegments
        };

    } catch (error) {
        console.warn(
            "Using fallback dashboard metrics:",
            error
        );

        return fallbackMetrics;
    }
}


/* =========================================================
   RENDER DASHBOARD METRICS
========================================================= */

function renderMetrics(metrics) {
    const totalTickets =
        getElement("total-tickets");

    const averageSatisfaction =
        getElement("average-satisfaction");

    const averageResolution =
        getElement("average-resolution");

    const customerSegments =
        getElement("customer-segments");

    if (totalTickets) {
        totalTickets.textContent =
            formatNumber(metrics.totalTickets);
    }

    if (averageSatisfaction) {
        averageSatisfaction.textContent =
            `${formatNumber(
                metrics.averageSatisfaction,
                2
            )} / 5`;
    }

    if (averageResolution) {
        averageResolution.textContent =
            `${formatNumber(
                metrics.averageResolution,
                2
            )} hrs`;
    }

    if (customerSegments) {
        customerSegments.textContent =
            formatNumber(
                metrics.customerSegments
            );
    }
}


/* =========================================================
   LOAD CUSTOMER SEGMENTS
========================================================= */

async function loadSegments() {
    try {
        return await loadJSON(
            FILES.segments
        );

    } catch (error) {
        console.error(
            "Segment data error:",
            error
        );

        return {
            segments: []
        };
    }
}


/* =========================================================
   RENDER CUSTOMER SEGMENTS
========================================================= */

function renderSegments(data) {
    const container =
        getElement("segment-container");

    if (!container) {
        return;
    }

    const segments = Array.isArray(data)
        ? data
        : data.segments || [];

    if (!segments.length) {
        container.innerHTML =
            "<p>Customer segmentation data unavailable.</p>";

        return;
    }

    let html = `
        <div class="table-responsive">
            <table>
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

    segments.forEach(segment => {
        html += `
            <tr>
                <td>
                    ${segment.segment ?? "N/A"}
                </td>

                <td>
                    ${formatNumber(
                        segment.customers
                    )}
                </td>

                <td>
                    ${formatNumber(
                        segment.avg_age,
                        1
                    )}
                </td>

                <td>
                    ${formatNumber(
                        segment.avg_satisfaction,
                        2
                    )}
                </td>

                <td>
                    ${formatNumber(
                        segment.avg_resolution_hours,
                        2
                    )} hrs
                </td>
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
   LOAD SATISFACTION DATA
========================================================= */

async function loadSatisfaction() {
    try {
        return await loadJSON(
            FILES.satisfaction
        );

    } catch (error) {
        console.error(
            "Satisfaction data error:",
            error
        );

        return fallbackSatisfaction;
    }
}


/* =========================================================
   RENDER SATISFACTION
========================================================= */

function renderSatisfaction(data) {
    const low =
        getElement("low-satisfaction");

    const satisfied =
        getElement("satisfied-customers");

    const rate =
        getElement("low-satisfaction-rate");

    const accuracy =
        getElement("model-accuracy");

    if (low) {
        low.textContent =
            formatNumber(
                data.low_satisfaction_tickets
            );
    }

    if (satisfied) {
        satisfied.textContent =
            formatNumber(
                data.satisfied_tickets
            );
    }

    if (rate) {
        rate.textContent =
            `${formatNumber(
                data.low_satisfaction_percentage,
                1
            )}%`;
    }

    if (accuracy) {
        accuracy.textContent =
            `${formatNumber(
                data.model_accuracy,
                2
            )}%`;
    }
}


/* =========================================================
   LOAD TICKET DATA
========================================================= */

async function loadTicketData() {
    try {
        /*
         * IMPORTANT:
         * ticket_data.json is in the repository ROOT.
         *
         * Correct:
         *     ticket_data.json
         *
         * NOT:
         *     data/ticket_data.json
         */

        const response = await fetch(
            FILES.tickets,
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Unable to load ticket_data.json: HTTP ${response.status}`
            );
        }

        const text =
            await response.text();

        const cleanedText =
            cleanJSONText(text);

        ticketData =
            JSON.parse(cleanedText);

        if (!Array.isArray(ticketData)) {
            throw new Error(
                "ticket_data.json must contain an array."
            );
        }

        console.log(
            `Loaded ${ticketData.length} tickets.`
        );

        initializeFilters();
        updateFilteredDashboard();

        return ticketData;

    } catch (error) {
        console.error(
            "Ticket data error:",
            error
        );

        ticketData = [];

        const status =
            getElement(
                "filter-result-status"
            );

        if (status) {
            status.textContent =
                "Ticket-level data could not be loaded.";
        }

        return [];
    }
}


/* =========================================================
   GET TICKET VALUE
========================================================= */

function getTicketValue(
    ticket,
    possibleNames
) {
    for (const name of possibleNames) {
        if (
            Object.prototype.hasOwnProperty.call(
                ticket,
                name
            )
        ) {
            const value =
                ticket[name];

            if (
                value !== null &&
                value !== undefined
            ) {
                return value;
            }
        }
    }

    return "";
}


/* =========================================================
   INFER CUSTOMER SEGMENT
========================================================= */

function inferSegment(ticket) {
    const ageValue =
        Number(
            getTicketValue(
                ticket,
                [
                    "Customer Age",
                    "customer_age"
                ]
            )
        );

    const satisfactionValue =
        Number(
            getTicketValue(
                ticket,
                [
                    "Customer Satisfaction Rating",
                    "customer_satisfaction_rating"
                ]
            )
        );

    const age =
        Number.isFinite(ageValue)
            ? ageValue
            : 30;

    const satisfaction =
        Number.isFinite(
            satisfactionValue
        )
            ? satisfactionValue
            : 3;

    let ageGroup;

    if (age < 40) {
        ageGroup = "Young";
    } else if (age < 55) {
        ageGroup = "Middle Age";
    } else {
        ageGroup = "Older";
    }

    if (satisfaction <= 2) {
        return `${ageGroup} - At Risk and Fast`;
    }

    if (satisfaction >= 4) {
        return `${ageGroup} - Highly Satisfied and Fast`;
    }

    return `${ageGroup} - Satisfied but Slow`;
}


/* =========================================================
   POPULATE SELECT
========================================================= */

function populateSelect(
    select,
    defaultText,
    values
) {
    if (!select) {
        return;
    }

    select.innerHTML = "";

    const defaultOption =
        document.createElement(
            "option"
        );

    defaultOption.value = "";
    defaultOption.textContent =
        defaultText;

    select.appendChild(
        defaultOption
    );

    values.forEach(value => {
        const option =
            document.createElement(
                "option"
            );

        option.value = value;
        option.textContent = value;

        select.appendChild(
            option
        );
    });
}


/* =========================================================
   INITIALIZE FILTERS
========================================================= */

function initializeFilters() {
    if (!ticketData.length) {
        return;
    }

    const priorityFilter =
        getElement(
            "priority-filter"
        );

    const typeFilter =
        getElement(
            "type-filter"
        );

    const channelFilter =
        getElement(
            "channel-filter"
        );

    const segmentFilter =
        getElement(
            "segment-filter-main"
        );

    const priorities =
        new Set();

    const types =
        new Set();

    const channels =
        new Set();

    ticketData.forEach(ticket => {
        const priority =
            getTicketValue(
                ticket,
                [
                    "Ticket Priority",
                    "ticket_priority"
                ]
            );

        const type =
            getTicketValue(
                ticket,
                [
                    "Ticket Type",
                    "ticket_type"
                ]
            );

        const channel =
            getTicketValue(
                ticket,
                [
                    "Ticket Channel",
                    "ticket_channel"
                ]
            );

        if (priority) {
            priorities.add(priority);
        }

        if (type) {
            types.add(type);
        }

        if (channel) {
            channels.add(channel);
        }
    });

    populateSelect(
        priorityFilter,
        "All Priorities",
        [...priorities].sort()
    );

    populateSelect(
        typeFilter,
        "All Ticket Types",
        [...types].sort()
    );

    populateSelect(
        channelFilter,
        "All Channels",
        [...channels].sort()
    );

    const officialSegments = [
        "Middle Age - Highly Satisfied and Fast",
        "Older - At Risk and Fast",
        "Older - At Risk and Slow",
        "Older - Satisfied but Slow",
        "Young - At Risk and Fast",
        "Young - Satisfied but Slow"
    ];

    populateSelect(
        segmentFilter,
        "All Segments",
        officialSegments
    );

    [
        priorityFilter,
        typeFilter,
        channelFilter,
        segmentFilter
    ].forEach(filter => {
        if (filter) {
            filter.addEventListener(
                "change",
                updateFilteredDashboard
            );
        }
    });

    const resetButton =
        getElement(
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
   GET FILTERED TICKETS
========================================================= */

function getFilteredTickets() {
    if (!ticketData.length) {
        return [];
    }

    const priority =
        getElement(
            "priority-filter"
        )?.value || "";

    const type =
        getElement(
            "type-filter"
        )?.value || "";

    const channel =
        getElement(
            "channel-filter"
        )?.value || "";

    const segment =
        getElement(
            "segment-filter-main"
        )?.value || "";

    return ticketData.filter(
        ticket => {
            const ticketPriority =
                getTicketValue(
                    ticket,
                    [
                        "Ticket Priority",
                        "ticket_priority"
                    ]
                );

            const ticketType =
                getTicketValue(
                    ticket,
                    [
                        "Ticket Type",
                        "ticket_type"
                    ]
                );

            const ticketChannel =
                getTicketValue(
                    ticket,
                    [
                        "Ticket Channel",
                        "ticket_channel"
                    ]
                );

            const ticketSegment =
                inferSegment(ticket);

            const priorityMatch =
                !priority ||
                normalize(
                    ticketPriority
                ) ===
                normalize(priority);

            const typeMatch =
                !type ||
                normalize(
                    ticketType
                ) ===
                normalize(type);

            const channelMatch =
                !channel ||
                normalize(
                    ticketChannel
                ) ===
                normalize(channel);

            const segmentMatch =
                !segment ||
                normalize(
                    ticketSegment
                ) ===
                normalize(segment);

            return (
                priorityMatch &&
                typeMatch &&
                channelMatch &&
                segmentMatch
            );
        }
    );
}


/* =========================================================
   UPDATE FILTERED DASHBOARD
========================================================= */

function updateFilteredDashboard() {
    const filteredTickets =
        getFilteredTickets();

    const countElement =
        getElement(
            "filtered-ticket-count"
        );

    const satisfactionElement =
        getElement(
            "filtered-average-satisfaction"
        );

    const resolutionElement =
        getElement(
            "filtered-average-resolution"
        );

    const statusElement =
        getElement(
            "filter-result-status"
        );

    const filteredStats =
        getElement(
            "filtered-stats"
        );

    if (!ticketData.length) {
        if (countElement) {
            countElement.textContent =
                "0";
        }

        if (satisfactionElement) {
            satisfactionElement.textContent =
                "N/A";
        }

        if (resolutionElement) {
            resolutionElement.textContent =
                "See analytics";
        }

        if (statusElement) {
            statusElement.textContent =
                "Loading ticket data...";
        }

        return;
    }

    if (filteredStats) {
        filteredStats.style.display =
            "block";
    }

    if (countElement) {
        countElement.textContent =
            formatNumber(
                filteredTickets.length
            );
    }

    const satisfactionValues =
        filteredTickets
            .map(ticket =>
                Number(
                    getTicketValue(
                        ticket,
                        [
                            "Customer Satisfaction Rating",
                            "customer_satisfaction_rating"
                        ]
                    )
                )
            )
            .filter(
                value =>
                    Number.isFinite(value)
            );

    if (satisfactionElement) {
        if (satisfactionValues.length) {
            const average =
                satisfactionValues.reduce(
                    (sum, value) =>
                        sum + value,
                    0
                ) /
                satisfactionValues.length;

            satisfactionElement.textContent =
                `${formatNumber(
                    average,
                    2
                )} / 5`;

        } else {
            satisfactionElement.textContent =
                "N/A";
        }
    }

    /*
     * ticket_data.json contains NaN/null values
     * for Time to Resolution.
     *
     * Therefore we intentionally do not calculate
     * filtered resolution from ticket_data.json.
     *
     * Resolution Analytics uses the dedicated
     * aggregate JSON files below.
     */

    if (resolutionElement) {
        resolutionElement.textContent =
            "See analytics";
    }

    if (statusElement) {
        const total =
            ticketData.length;

        const count =
            filteredTickets.length;

        if (count === total) {
            statusElement.textContent =
                `Showing all ${formatNumber(
                    total
                )} tickets.`;
        } else {
            statusElement.textContent =
                `Showing ${formatNumber(
                    count
                )} of ${formatNumber(
                    total
                )} tickets.`;
        }
    }
}


/* =========================================================
   RESET FILTERS
========================================================= */

function resetFilters() {
    const filters = [
        "priority-filter",
        "type-filter",
        "channel-filter",
        "segment-filter-main"
    ];

    filters.forEach(id => {
        const element =
            getElement(id);

        if (element) {
            element.value = "";
        }
    });

    updateFilteredDashboard();
}


/* =========================================================
   LOAD RESOLUTION ANALYTICS
========================================================= */

async function loadResolutionData() {
    /*
     * IMPORTANT:
     *
     * These are three DIFFERENT files.
     *
     * 1. resolution_by_priority.json
     * 2. resolution_by_type.json
     * 3. resolution_by_channel.json
     *
     * They are all inside the data/ folder.
     */

    const results =
        await Promise.allSettled([
            loadJSON(
                FILES.resolutionPriority
            ),

            loadJSON(
                FILES.resolutionType
            ),

            loadJSON(
                FILES.resolutionChannel
            )
        ]);

    if (
        results[0].status ===
        "rejected"
    ) {
        console.error(
            "Priority resolution file failed:",
            results[0].reason
        );
    }

    if (
        results[1].status ===
        "rejected"
    ) {
        console.error(
            "Ticket type resolution file failed:",
            results[1].reason
        );
    }

    if (
        results[2].status ===
        "rejected"
    ) {
        console.error(
            "Channel resolution file failed:",
            results[2].reason
        );
    }

    return {
        priority:
            results[0].status ===
            "fulfilled"
                ? results[0].value
                : null,

        type:
            results[1].status ===
            "fulfilled"
                ? results[1].value
                : null,

        channel:
            results[2].status ===
            "fulfilled"
                ? results[2].value
                : null
    };
}


/* =========================================================
   EXTRACT DATA ARRAY
========================================================= */

function extractResolutionRows(data) {
    if (!data) {
        return [];
    }

    /*
     * Supports:
     *
     * [
     *   {...},
     *   {...}
     * ]
     *
     * and:
     *
     * {
     *   "data": [
     *      {...}
     *   ]
     * }
     */

    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data.data)) {
        return data.data;
    }

    return [];
}


/* =========================================================
   VALIDATE CHART VALUES
========================================================= */

function validResolutionValue(value) {
    const number =
        Number(value);

    return Number.isFinite(
        number
    )
        ? number
        : null;
}


/* =========================================================
   DESTROY OLD CHART
========================================================= */

function destroyChart(chartKey) {
    if (charts[chartKey]) {
        charts[chartKey].destroy();
        charts[chartKey] = null;
    }
}


/* =========================================================
   CREATE RESOLUTION CHART
========================================================= */

function createResolutionChart(
    containerId,
    chartKey,
    labels,
    values,
    title
) {
    const container =
        getElement(containerId);

    if (!container) {
        console.error(
            `Chart container not found: ${containerId}`
        );

        return;
    }

    /*
     * Destroy any previous Chart.js instance.
     */

    destroyChart(chartKey);

    /*
     * Remove "Loading data..."
     * and create a fresh canvas.
     */

    container.innerHTML = "";

    const canvas =
        document.createElement(
            "canvas"
        );

    canvas.setAttribute(
        "role",
        "img"
    );

    canvas.setAttribute(
        "aria-label",
        title
    );

    container.appendChild(
        canvas
    );

    /*
     * Check Chart.js.
     */

    if (
        typeof Chart ===
        "undefined"
    ) {
        console.error(
            "Chart.js is not loaded."
        );

        container.innerHTML = `
            <div class="chart-error">
                Chart.js could not be loaded.
            </div>
        `;

        return;
    }

    /*
     * Validate data.
     */

    if (
        !labels.length ||
        !values.length
    ) {
        container.innerHTML = `
            <div class="chart-error">
                No resolution data available.
            </div>
        `;

        return;
    }

    /*
     * Create Chart.js bar chart.
     */

    charts[chartKey] =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {
                    labels: labels,

                    datasets: [
                        {
                            label:
                                "Average Resolution Time (hrs)",

                            data: values,

                            borderWidth: 1
                        }
                    ]
                },

                options: {
                    responsive: true,

                    /*
                     * The CSS .chart-wrapper provides
                     * the chart height.
                     */
                    maintainAspectRatio: false,

                    animation: {
                        duration: 500
                    },

                    plugins: {
                        legend: {
                            display: false
                        },

                        title: {
                            display: true,

                            text: title
                        },

                        tooltip: {
                            callbacks: {
                                label:
                                    function (
                                        context
                                    ) {
                                        return (
                                            " " +
                                            context.parsed.y.toFixed(
                                                2
                                            ) +
                                            " hrs"
                                        );
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
                                    "Average Resolution Time (hrs)"
                            }
                        },

                        x: {
                            title: {
                                display: true,

                                text:
                                    "Category"
                            }
                        }
                    }
                }
            }
        );
}


/* =========================================================
   RENDER PRIORITY CHART
========================================================= */

function renderPriorityChart(data) {
    const rows =
        extractResolutionRows(
            data
        );

    if (!rows.length) {
        showChartError(
            "priority-chart",
            "Resolution-by-priority data unavailable."
        );

        return;
    }

    const labels = [];
    const values = [];

    rows.forEach(row => {
        const label =
            row.priority ??
            row.Priority ??
            "Unknown";

        const value =
            validResolutionValue(
                row.average_resolution_hours ??
                row.averageResolutionHours ??
                row["Average Resolution Hours"]
            );

        if (
            value !== null
        ) {
            labels.push(label);
            values.push(value);
        }
    });

    if (!labels.length) {
        showChartError(
            "priority-chart",
            "No valid priority resolution values found."
        );

        return;
    }

    createResolutionChart(
        "priority-chart",
        "priority",
        labels,
        values,
        "Average Resolution Time by Priority"
    );
}


/* =========================================================
   RENDER TICKET TYPE CHART
========================================================= */

function renderTypeChart(data) {
    const rows =
        extractResolutionRows(
            data
        );

    if (!rows.length) {
        showChartError(
            "type-chart",
            "Resolution-by-ticket-type data unavailable."
        );

        return;
    }

    const labels = [];
    const values = [];

    rows.forEach(row => {
        const label =
            row.ticket_type ??
            row.ticketType ??
            row["Ticket Type"] ??
            "Unknown";

        const value =
            validResolutionValue(
                row.average_resolution_hours ??
                row.averageResolutionHours ??
                row["Average Resolution Hours"]
            );

        if (
            value !== null
        ) {
            labels.push(label);
            values.push(value);
        }
    });

    if (!labels.length) {
        showChartError(
            "type-chart",
            "No valid ticket-type resolution values found."
        );

        return;
    }

    createResolutionChart(
        "type-chart",
        "type",
        labels,
        values,
        "Average Resolution Time by Ticket Type"
    );
}


/* =========================================================
   RENDER CHANNEL CHART
========================================================= */

function renderChannelChart(data) {
    const rows =
        extractResolutionRows(
            data
        );

    if (!rows.length) {
        showChartError(
            "channel-chart",
            "Resolution-by-channel data unavailable."
        );

        return;
    }

    const labels = [];
    const values = [];

    rows.forEach(row => {
        const label =
            row.channel ??
            row.Channel ??
            row["Ticket Channel"] ??
            "Unknown";

        const value =
            validResolutionValue(
                row.average_resolution_hours ??
                row.averageResolutionHours ??
                row["Average Resolution Hours"]
            );

        if (
            value !== null
        ) {
            labels.push(label);
            values.push(value);
        }
    });

    if (!labels.length) {
        showChartError(
            "channel-chart",
            "No valid channel resolution values found."
        );

        return;
    }

    createResolutionChart(
        "channel-chart",
        "channel",
        labels,
        values,
        "Average Resolution Time by Support Channel"
    );
}


/* =========================================================
   RENDER ALL RESOLUTION CHARTS
========================================================= */

function renderResolutionCharts(data) {
    console.log(
        "Rendering resolution charts:",
        data
    );

    /*
     * Render each chart independently.
     *
     * If one file fails, the other two can still render.
     */

    renderPriorityChart(
        data.priority
    );

    renderTypeChart(
        data.type
    );

    renderChannelChart(
        data.channel
    );
}


/* =========================================================
   CHART ERROR
========================================================= */

function showChartError(
    containerId,
    message
) {
    const container =
        getElement(containerId);

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="chart-error">
            <p>${message}</p>
        </div>
    `;
}


/* =========================================================
   INITIALIZE DASHBOARD
========================================================= */

async function initializeDashboard() {
    try {
        /*
         * Load dashboard data.
         */

        const [
            metrics,
            segments,
            satisfaction,
            resolution
        ] = await Promise.all([
            loadMetrics(),
            loadSegments(),
            loadSatisfaction(),
            loadResolutionData()
        ]);

        /*
         * Render normal dashboard.
         */

        renderMetrics(
            metrics
        );

        renderSegments(
            segments
        );

        renderSatisfaction(
            satisfaction
        );

        /*
         * Render all three resolution charts.
         */

        renderResolutionCharts(
            resolution
        );

        /*
         * Load ticket-level data for
         * interactive filters.
         */

        await loadTicketData();

    } catch (error) {
        console.error(
            "Dashboard initialization error:",
            error
        );
    }
}


/* =========================================================
   START APPLICATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);
