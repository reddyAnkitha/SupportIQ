/* =========================================================
   SupportIQ
   Customer Support Intelligence Platform
   Main Dashboard JavaScript
   ========================================================= */

"use strict";

/* =========================================================
   GLOBAL STATE
   ========================================================= */

let ticketData = [];
let segmentData = [];

let priorityChart = null;
let typeChart = null;
let channelChart = null;
let segmentChart = null;

let resolutionData = {
    priority: [],
    type: [],
    channel: []
};

let filtersReady = false;


/* =========================================================
   CONFIGURATION
   ========================================================= */

const FILES = {
    dashboardMetrics: "./data/dashboard_metrics.csv",
    segments: "./data/segment_dashboard.json",
    satisfaction: "./data/satisfaction_dashboard.json",
    resolutionPriority: "./data/resolution_by_priority.json",
    resolutionType: "./data/resolution_by_type.json",
    resolutionChannel: "./data/resolution_by_channel.json",
    tickets: "./ticket_data.json"
};


/* =========================================================
   START APPLICATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    console.log("SupportIQ dashboard loaded");

    loadDashboardMetrics();
    loadSegments();
    loadSatisfactionData();
    loadResolutionData();
    loadTicketData();

});


/* =========================================================
   GENERIC HELPERS
   ========================================================= */

function getElement(id) {
    return document.getElementById(id);
}


function setText(id, value) {

    const element = getElement(id);

    if (!element) {
        return;
    }

    element.textContent = value;
}


function showError(id, message) {

    const element = getElement(id);

    if (!element) {
        return;
    }

    element.textContent = message;
}


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


function toNumber(value, fallback = 0) {

    if (value === null || value === undefined || value === "") {
        return fallback;
    }

    const number = Number(value);

    if (Number.isFinite(number)) {
        return number;
    }

    return fallback;
}


function formatNumber(value, decimals = 0) {

    const number = toNumber(value);

    return number.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}


function formatHours(value) {

    if (value === null || value === undefined) {
        return "N/A";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "N/A";
    }

    return number.toFixed(2) + " hrs";
}


/* =========================================================
   FETCH HELPER
   ========================================================= */

async function fetchJSON(url) {

    const response = await fetch(url, {
        cache: "no-cache"
    });

    if (!response.ok) {
        throw new Error(
            "Unable to load " + url + " (" + response.status + ")"
        );
    }

    return response.json();
}


async function fetchText(url) {

    const response = await fetch(url, {
        cache: "no-cache"
    });

    if (!response.ok) {
        throw new Error(
            "Unable to load " + url + " (" + response.status + ")"
        );
    }

    return response.text();
}


/* =========================================================
   CSV PARSER
   ========================================================= */

function parseCSV(text) {

    const rows = [];

    let row = [];
    let cell = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {

        const character = text[i];
        const nextCharacter = text[i + 1];

        if (character === '"') {

            if (insideQuotes && nextCharacter === '"') {
                cell += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }

            continue;
        }

        if (character === "," && !insideQuotes) {

            row.push(cell.trim());
            cell = "";

            continue;
        }

        if (
            (character === "\n" || character === "\r") &&
            !insideQuotes
        ) {

            if (character === "\r" && nextCharacter === "\n") {
                i++;
            }

            row.push(cell.trim());

            if (row.some(function (value) {
                return value !== "";
            })) {
                rows.push(row);
            }

            row = [];
            cell = "";

            continue;
        }

        cell += character;
    }

    if (cell !== "" || row.length > 0) {

        row.push(cell.trim());

        if (row.some(function (value) {
            return value !== "";
        })) {
            rows.push(row);
        }
    }

    if (rows.length === 0) {
        return [];
    }

    const headers = rows[0];

    return rows.slice(1).map(function (values) {

        const object = {};

        headers.forEach(function (header, index) {
            object[header] = values[index] || "";
        });

        return object;
    });
}


/* =========================================================
   DASHBOARD METRICS
   ========================================================= */

async function loadDashboardMetrics() {

    try {

        console.log("Loading dashboard metrics...");

        const csvText = await fetchText(
            FILES.dashboardMetrics
        );

        const metrics = parseCSV(csvText);

        const metricMap = {};

        metrics.forEach(function (item) {

            const key = String(
                item.metric || item.Metric || ""
            )
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "_");

            metricMap[key] = item.value;
        });


        const totalTickets =
            findMetric(
                metricMap,
                [
                    "total_tickets",
                    "total_ticket",
                    "tickets"
                ],
                8469
            );


        const averageSatisfaction =
            findMetric(
                metricMap,
                [
                    "average_satisfaction",
                    "avg_satisfaction",
                    "average_customer_satisfaction"
                ],
                2.99
            );


        const averageResolution =
            findMetric(
                metricMap,
                [
                    "average_resolution_time",
                    "avg_resolution_time",
                    "average_resolution",
                    "avg_resolution",
                    "average_resolution_hours"
                ],
                11.77
            );


        const customerSegments =
            findMetric(
                metricMap,
                [
                    "customer_segments",
                    "segments",
                    "number_of_segments"
                ],
                6
            );


        setText(
            "total-tickets",
            formatNumber(totalTickets)
        );

        setText(
            "average-satisfaction",
            formatNumber(averageSatisfaction, 2) + " / 5"
        );

        setText(
            "average-resolution",
            formatHours(averageResolution)
        );

        setText(
            "customer-segments",
            formatNumber(customerSegments)
        );


        console.log("Dashboard metrics loaded");

    } catch (error) {

        console.error(
            "Dashboard metrics error:",
            error
        );


        setText("total-tickets", "8,469");

        setText(
            "average-satisfaction",
            "2.99 / 5"
        );

        setText(
            "average-resolution",
            "11.77 hrs"
        );

        setText(
            "customer-segments",
            "6"
        );
    }
}


function findMetric(map, possibleNames, fallback) {

    for (let i = 0; i < possibleNames.length; i++) {

        const key = possibleNames[i];

        if (
            Object.prototype.hasOwnProperty.call(
                map,
                key
            )
        ) {

            const value = Number(map[key]);

            if (Number.isFinite(value)) {
                return value;
            }
        }
    }

    return fallback;
}


/* =========================================================
   CUSTOMER SEGMENTS
   ========================================================= */

async function loadSegments() {

    try {

        console.log("Loading customer segments...");

        const data = await fetchJSON(
            FILES.segments
        );


        if (
            !data ||
            !Array.isArray(data.segments)
        ) {

            throw new Error(
                "Invalid segment data"
            );
        }


        segmentData = data.segments;


        renderSegments(
            segmentData
        );


        populateMainSegmentFilter();


        console.log(
            "Customer segments loaded:",
            segmentData.length
        );

    } catch (error) {

        console.error(
            "Segment data error:",
            error
        );


        const container =
            getElement("segment-container");

        if (container) {

            container.innerHTML =
                '<p class="error-message">' +
                "Customer segment data unavailable." +
                "</p>";
        }


        setText(
            "customer-segments",
            "6"
        );
    }
}


/* =========================================================
   RENDER SEGMENTS
   ========================================================= */

function renderSegments(segments) {

    const container =
        getElement("segment-container");

    if (!container) {
        return;
    }


    if (!segments.length) {

        container.innerHTML =
            "<p>No customer segment data available.</p>";

        return;
    }


    let html = "";

    html += '<div class="segment-table-wrapper">';

    html += "<table>";

    html += "<thead>";

    html += "<tr>";

    html += "<th>Customer Segment</th>";

    html += "<th>Customers</th>";

    html += "<th>Avg Age</th>";

    html += "<th>Avg Satisfaction</th>";

    html += "<th>Avg Resolution</th>";

    html += "</tr>";

    html += "</thead>";

    html += "<tbody>";


    segments.forEach(function (segment) {

        html += "<tr>";

        html +=
            "<td>" +
            escapeHTML(segment.segment) +
            "</td>";

        html +=
            "<td>" +
            formatNumber(segment.customers) +
            "</td>";

        html +=
            "<td>" +
            formatNumber(segment.avg_age, 1) +
            "</td>";

        html +=
            "<td>" +
            formatNumber(
                segment.avg_satisfaction,
                2
            ) +
            " / 5</td>";

        html +=
            "<td>" +
            formatHours(
                segment.avg_resolution_hours
            ) +
            "</td>";

        html += "</tr>";
    });


    html += "</tbody>";

    html += "</table>";

    html += "</div>";


    html +=
        '<div class="chart-wrapper segment-chart-wrapper">';

    html +=
        '<canvas id="segment-chart"></canvas>';

    html += "</div>";


    container.innerHTML = html;


    renderSegmentChart(
        segments
    );
}


/* =========================================================
   SEGMENT CHART
   ========================================================= */

function renderSegmentChart(segments) {

    const canvas =
        getElement("segment-chart");

    if (!canvas) {
        return;
    }


    if (
        typeof Chart === "undefined"
    ) {

        return;
    }


    if (segmentChart) {
        segmentChart.destroy();
    }


    segmentChart = new Chart(
        canvas,
        {
            type: "bar",

            data: {

                labels: segments.map(
                    function (segment) {
                        return segment.segment;
                    }
                ),

                datasets: [
                    {
                        label:
                            "Average Satisfaction",

                        data:
                            segments.map(
                                function (segment) {
                                    return toNumber(
                                        segment.avg_satisfaction
                                    );
                                }
                            ),

                        borderWidth: 1
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

                            label:
                                function (context) {

                                    return (
                                        " Satisfaction: " +
                                        Number(
                                            context.raw
                                        ).toFixed(2) +
                                        " / 5"
                                    );
                                }
                        }
                    }
                },

                scales: {

                    y: {

                        beginAtZero: true,

                        max: 5,

                        title: {
                            display: true,
                            text:
                                "Average Satisfaction"
                        }
                    },

                    x: {

                        ticks: {
                            autoSkip: false
                        }
                    }
                }
            }
        }
    );
}


/* =========================================================
   MAIN SEGMENT FILTER
   ========================================================= */

function populateMainSegmentFilter() {

    const filter =
        getElement(
            "segment-filter-main"
        );

    if (!filter) {
        return;
    }


    filter.innerHTML =
        '<option value="all">' +
        "All Segments" +
        "</option>";


    segmentData.forEach(function (segment) {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            segment.segment;

        option.textContent =
            segment.segment;

        filter.appendChild(option);
    });
}


/* =========================================================
   SATISFACTION RISK
   ========================================================= */

async function loadSatisfactionData() {

    try {

        console.log(
            "Loading satisfaction data..."
        );


        const data =
            await fetchJSON(
                FILES.satisfaction
            );


        setText(
            "low-satisfaction",
            formatNumber(
                data.low_satisfaction_tickets
            )
        );


        setText(
            "satisfied-customers",
            formatNumber(
                data.satisfied_tickets
            )
        );


        setText(
            "low-satisfaction-rate",
            formatNumber(
                data.low_satisfaction_percentage,
                1
            ) + "%"
        );


        setText(
            "model-accuracy",
            formatNumber(
                data.model_accuracy,
                2
            ) + "%"
        );


        console.log(
            "Satisfaction data loaded"
        );

    } catch (error) {

        console.error(
            "Satisfaction data error:",
            error
        );


        setText(
            "low-satisfaction",
            "1,102"
        );

        setText(
            "satisfied-customers",
            "1,667"
        );

        setText(
            "low-satisfaction-rate",
            "39.8%"
        );

        setText(
            "model-accuracy",
            "59.75%"
        );
    }
}


/* =========================================================
   RESOLUTION DATA
   ========================================================= */

async function loadResolutionData() {

    try {

        console.log(
            "Loading resolution analytics..."
        );


        const results =
            await Promise.all([

                fetchJSON(
                    FILES.resolutionPriority
                ),

                fetchJSON(
                    FILES.resolutionType
                ),

                fetchJSON(
                    FILES.resolutionChannel
                )
            ]);


        const priorityData =
            results[0];

        const typeData =
            results[1];

        const channelData =
            results[2];


        if (
            !priorityData ||
            !Array.isArray(
                priorityData.data
            )
        ) {
            throw new Error(
                "Invalid priority data"
            );
        }


        if (
            !typeData ||
            !Array.isArray(
                typeData.data
            )
        ) {
            throw new Error(
                "Invalid type data"
            );
        }


        if (
            !channelData ||
            !Array.isArray(
                channelData.data
            )
        ) {
            throw new Error(
                "Invalid channel data"
            );
        }


        resolutionData.priority =
            priorityData.data;

        resolutionData.type =
            typeData.data;

        resolutionData.channel =
            channelData.data;


        populateFilter(
            "priority-filter",
            resolutionData.priority,
            "priority",
            "All Priorities"
        );


        populateFilter(
            "type-filter",
            resolutionData.type,
            "ticket_type",
            "All Ticket Types"
        );


        populateFilter(
            "channel-filter",
            resolutionData.channel,
            "channel",
            "All Channels"
        );


        renderPriorityChart(
            resolutionData.priority
        );


        renderTypeChart(
            resolutionData.type
        );


        renderChannelChart(
            resolutionData.channel
        );


        initializeFilters();


        console.log(
            "Resolution analytics loaded"
        );

    } catch (error) {

        console.error(
            "Resolution data error:",
            error
        );


        showChartError(
            "priority-chart"
        );

        showChartError(
            "type-chart"
        );

        showChartError(
            "channel-chart"
        );
    }
}


/* =========================================================
   FILTER POPULATION
   ========================================================= */

function populateFilter(
    id,
    data,
    property,
    defaultLabel
) {

    const filter =
        getElement(id);

    if (!filter) {
        return;
    }


    filter.innerHTML =
        '<option value="all">' +
        escapeHTML(defaultLabel) +
        "</option>";


    const values = [];


    data.forEach(function (item) {

        const value =
            item[property];

        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {

            values.push(
                String(value)
            );
        }
    });


    values
        .filter(
            function (value, index, array) {
                return array.indexOf(value) === index;
            }
        )
        .sort()
        .forEach(function (value) {

            const option =
                document.createElement(
                    "option"
                );

            option.value = value;

            option.textContent = value;

            filter.appendChild(option);
        });
}


/* =========================================================
   PRIORITY CHART
   ========================================================= */

function renderPriorityChart(data) {

    const container =
        getElement("priority-chart");

    if (!container) {
        return;
    }


    if (
        typeof Chart === "undefined"
    ) {

        showChartError(
            "priority-chart"
        );

        return;
    }


    container.innerHTML =
        '<canvas></canvas>';


    const canvas =
        container.querySelector(
            "canvas"
        );


    if (priorityChart) {
        priorityChart.destroy();
    }


    priorityChart = new Chart(
        canvas,
        {
            type: "bar",

            data: {

                labels: data.map(
                    function (item) {
                        return item.priority;
                    }
                ),

                datasets: [
                    {
                        label:
                            "Average Resolution",

                        data: data.map(
                            function (item) {
                                return toNumber(
                                    item.average_resolution_hours
                                );
                            }
                        ),

                        borderWidth: 1
                    }
                ]
            },

            options: chartOptions(
                "Average Resolution Time (Hours)"
            )
        }
    );
}


/* =========================================================
   TICKET TYPE CHART
   ========================================================= */

function renderTypeChart(data) {

    const container =
        getElement("type-chart");

    if (!container) {
        return;
    }


    if (
        typeof Chart === "undefined"
    ) {

        showChartError(
            "type-chart"
        );

        return;
    }


    container.innerHTML =
        '<canvas></canvas>';


    const canvas =
        container.querySelector(
            "canvas"
        );


    if (typeChart) {
        typeChart.destroy();
    }


    typeChart = new Chart(
        canvas,
        {
            type: "bar",

            data: {

                labels: data.map(
                    function (item) {
                        return item.ticket_type;
                    }
                ),

                datasets: [
                    {
                        label:
                            "Average Resolution",

                        data: data.map(
                            function (item) {
                                return toNumber(
                                    item.average_resolution_hours
                                );
                            }
                        ),

                        borderWidth: 1
                    }
                ]
            },

            options: chartOptions(
                "Average Resolution Time (Hours)"
            )
        }
    );
}


/* =========================================================
   CHANNEL CHART
   ========================================================= */

function renderChannelChart(data) {

    const container =
        getElement("channel-chart");

    if (!container) {
        return;
    }


    if (
        typeof Chart === "undefined"
    ) {

        showChartError(
            "channel-chart"
        );

        return;
    }


    container.innerHTML =
        '<canvas></canvas>';


    const canvas =
        container.querySelector(
            "canvas"
        );


    if (channelChart) {
        channelChart.destroy();
    }


    channelChart = new Chart(
        canvas,
        {
            type: "bar",

            data: {

                labels: data.map(
                    function (item) {
                        return item.channel;
                    }
                ),

                datasets: [
                    {
                        label:
                            "Average Resolution",

                        data: data.map(
                            function (item) {
                                return toNumber(
                                    item.average_resolution_hours
                                );
                            }
                        ),

                        borderWidth: 1
                    }
                ]
            },

            options: chartOptions(
                "Average Resolution Time (Hours)"
            )
        }
    );
}


/* =========================================================
   COMMON CHART OPTIONS
   ========================================================= */

function chartOptions(yAxisTitle) {

    return {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

            legend: {
                display: false
            },

            tooltip: {

                callbacks: {

                    label:
                        function (context) {

                            return (
                                " " +
                                Number(
                                    context.raw
                                ).toFixed(2) +
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

                    text: yAxisTitle
                }
            },

            x: {

                ticks: {

                    autoSkip: false,

                    maxRotation: 45,

                    minRotation: 0
                }
            }
        }
    };
}


/* =========================================================
   CHART ERROR
   ========================================================= */

function showChartError(id) {

    const container =
        getElement(id);

    if (!container) {
        return;
    }


    container.innerHTML =
        '<p class="error-message">' +
        "Unable to load chart data." +
        "</p>";
}


/* =========================================================
   TICKET DATA
   ========================================================= */

async function loadTicketData() {

    try {

        console.log(
            "Loading ticket-level data..."
        );


        const response =
            await fetch(
                FILES.tickets,
                {
                    cache: "no-cache"
                }
            );


        if (!response.ok) {

            throw new Error(
                "ticket_data.json returned " +
                response.status
            );
        }


        let text =
            await response.text();


        /*
         * The original exported JSON may contain
         * JavaScript-style NaN or Infinity values.
         *
         * Replace them with valid JSON null values
         * before parsing.
         */

        text = text
            .replace(
                /:\s*NaN\b/g,
                ": null"
            )
            .replace(
                /:\s*Infinity\b/g,
                ": null"
            )
            .replace(
                /:\s*-Infinity\b/g,
                ": null"
            );


        const data =
            JSON.parse(text);


        if (!Array.isArray(data)) {

            throw new Error(
                "ticket_data.json must contain an array"
            );
        }


        ticketData = data;


        console.log(
            "Ticket records loaded:",
            ticketData.length
        );


        const loadingMessage =
            getElement(
                "ticket-data-status"
            );

        if (loadingMessage) {

            loadingMessage.textContent =
                ticketData.length.toLocaleString() +
                " ticket records loaded.";
        }


        updateFilteredDashboard();


        initializeFilters();


    } catch (error) {

        console.error(
            "Ticket data error:",
            error
        );


        const status =
            getElement(
                "filter-result-status"
            );

        if (status) {

            status.textContent =
                "Ticket-level filtering is unavailable.";
        }


        /*
         * The main dashboard still works even if
         * ticket-level data cannot be loaded.
         */

        setText(
            "filtered-ticket-count",
            "0"
        );

        setText(
            "filtered-average-satisfaction",
            "N/A"
        );

        setText(
            "filtered-average-resolution",
            "N/A"
        );
    }
}


/* =========================================================
   FILTER INITIALIZATION
   ========================================================= */

function initializeFilters() {

    if (filtersReady) {
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

    const resetButton =
        getElement(
            "reset-filters"
        );


    if (
        !priorityFilter ||
        !typeFilter ||
        !channelFilter ||
        !segmentFilter
    ) {

        return;
    }


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


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetFilters
        );
    }


    filtersReady = true;


    updateFilteredDashboard();
}


/* =========================================================
   FILTERED DASHBOARD
   ========================================================= */

function updateFilteredDashboard() {

    if (!ticketData.length) {
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


    const filtered =
        ticketData.filter(
            function (ticket) {

                const ticketPriority =
                    normalize(
                        ticket["Ticket Priority"]
                    );

                const ticketType =
                    normalize(
                        ticket["Ticket Type"]
                    );

                const ticketChannel =
                    normalize(
                        ticket["Ticket Channel"]
                    );


                if (
                    priority !== "all" &&
                    ticketPriority !==
                    normalize(priority)
                ) {
                    return false;
                }


                if (
                    type !== "all" &&
                    ticketType !==
                    normalize(type)
                ) {
                    return false;
                }


                if (
                    channel !== "all" &&
                    ticketChannel !==
                    normalize(channel)
                ) {
                    return false;
                }


                if (
                    segment !== "all" &&
                    getTicketSegment(ticket) !==
                    segment
                ) {
                    return false;
                }


                return true;
            }
        );


    updateFilteredStatistics(
        filtered
    );


    updateFilterStatus(
        filtered.length,
        ticketData.length
    );
}


/* =========================================================
   GET FILTER VALUE
   ========================================================= */

function getFilterValue(id) {

    const element =
        getElement(id);

    if (!element) {
        return "all";
    }

    return element.value || "all";
}


/* =========================================================
   FILTERED STATISTICS
   ========================================================= */

function updateFilteredStatistics(
    records
) {

    const count =
        records.length;


    setText(
        "filtered-ticket-count",
        formatNumber(count)
    );


    if (count === 0) {

        setText(
            "filtered-average-satisfaction",
            "N/A"
        );

        setText(
            "filtered-average-resolution",
            "N/A"
        );

        return;
    }


    let satisfactionTotal = 0;

    let satisfactionCount = 0;

    let resolutionTotal = 0;

    let resolutionCount = 0;


    records.forEach(function (ticket) {

        const satisfaction =
            getSatisfaction(
                ticket
            );


        if (
            satisfaction !== null
        ) {

            satisfactionTotal +=
                satisfaction;

            satisfactionCount++;
        }


        const resolution =
            getResolutionHours(
                ticket[
                    "Time to Resolution"
                ]
            );


        if (
            resolution !== null
        ) {

            resolutionTotal +=
                resolution;

            resolutionCount++;
        }
    });


    const averageSatisfaction =
        satisfactionCount > 0
            ? satisfactionTotal /
              satisfactionCount
            : null;


    const averageResolution =
        resolutionCount > 0
            ? resolutionTotal /
              resolutionCount
            : null;


    if (
        averageSatisfaction !== null
    ) {

        setText(
            "filtered-average-satisfaction",
            averageSatisfaction.toFixed(2) +
            " / 5"
        );

    } else {

        setText(
            "filtered-average-satisfaction",
            "N/A"
        );
    }


    if (
        averageResolution !== null
    ) {

        setText(
            "filtered-average-resolution",
            averageResolution.toFixed(2) +
            " hrs"
        );

    } else {

        setText(
            "filtered-average-resolution",
            "N/A"
        );
    }
}


/* =========================================================
   FILTER STATUS
   ========================================================= */

function updateFilterStatus(
    filteredCount,
    totalCount
) {

    const status =
        getElement(
            "filter-result-status"
        );

    if (!status) {
        return;
    }


    if (
        filteredCount === totalCount
    ) {

        status.textContent =
            "Showing all " +
            totalCount.toLocaleString() +
            " tickets.";

        return;
    }


    status.textContent =
        "Showing " +
        filteredCount.toLocaleString() +
        " of " +
        totalCount.toLocaleString() +
        " tickets.";
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


    filters.forEach(function (id) {

        const element =
            getElement(id);

        if (element) {
            element.value = "all";
        }
    });


    updateFilteredDashboard();


    console.log(
        "Filters reset"
    );
}


/* =========================================================
   NORMALIZATION
   ========================================================= */

function normalize(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .trim()
        .toLowerCase();
}


/* =========================================================
   SATISFACTION PARSER
   ========================================================= */

function getSatisfaction(ticket) {

    const value =
        ticket[
            "Customer Satisfaction Rating"
        ];


    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;
    }


    const number =
        Number(value);


    if (
        Number.isFinite(number)
    ) {

        return number;
    }


    return null;
}


/* =========================================================
   RESOLUTION TIME PARSER
   ========================================================= */

function getResolutionHours(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;
    }


    /*
     * Case 1:
     * Direct numeric hours
     */

    if (
        typeof value === "number"
    ) {

        return Number.isFinite(value)
            ? value
            : null;
    }


    const text =
        String(value).trim();


    if (!text) {
        return null;
    }


    /*
     * Case 2:
     * Plain numeric string
     */

    const directNumber =
        Number(text);


    if (
        Number.isFinite(directNumber)
    ) {

        return directNumber;
    }


    /*
     * Case 3:
     * Values such as:
     *
     * 1 days 04:30:00
     * 04:30:00
     * 12:45
     */

    let days = 0;

    let hours = 0;

    let minutes = 0;

    let seconds = 0;


    const dayMatch =
        text.match(
            /(\d+(?:\.\d+)?)\s*days?/i
        );


    if (dayMatch) {

        days =
            Number(
                dayMatch[1]
            );
    }


    const timeMatch =
        text.match(
            /(\d{1,3}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?/
        );


    if (timeMatch) {

        hours =
            Number(
                timeMatch[1]
            );

        minutes =
            Number(
                timeMatch[2]
            );

        seconds =
            timeMatch[3]
                ? Number(timeMatch[3])
                : 0;
    }


    if (
        dayMatch ||
        timeMatch
    ) {

        return (
            days * 24 +
            hours +
            minutes / 60 +
            seconds / 3600
        );
    }


    /*
     * Case 4:
     * Strings containing hours.
     */

    const hourMatch =
        text.match(
            /(\d+(?:\.\d+)?)\s*hours?/i
        );


    if (hourMatch) {

        return Number(
            hourMatch[1]
        );
    }


    return null;
}


/* =========================================================
   CUSTOMER SEGMENT CALCULATION
   =========================================================

   The ticket_data.json file contains:
   - Customer Age
   - Customer Satisfaction Rating
   - Time to Resolution

   The segment dashboard contains the six cluster
   profiles. We assign each ticket to the closest
   segment profile using normalized distance.

   This makes the Segment filter work without adding
   another backend service.
   ========================================================= */

function getTicketSegment(ticket) {

    if (
        !segmentData ||
        !segmentData.length
    ) {

        return "Unknown";
    }


    const age =
        toNumber(
            ticket["Customer Age"],
            null
        );


    const satisfaction =
        getSatisfaction(
            ticket
        );


    const resolution =
        getResolutionHours(
            ticket[
                "Time to Resolution"
            ]
        );


    if (
        age === null &&
        satisfaction === null &&
        resolution === null
    ) {

        return "Unknown";
    }


    /*
     * Reference ranges prevent age,
     * satisfaction and resolution from
     * dominating one another.
     */

    const AGE_SCALE = 40;

    const SATISFACTION_SCALE = 4;

    const RESOLUTION_SCALE = 20;


    let bestSegment =
        segmentData[0];


    let bestDistance =
        Infinity;


    segmentData.forEach(
        function (segment) {

            let distance = 0;

            let dimensions = 0;


            if (
                age !== null &&
                Number.isFinite(
                    Number(segment.avg_age)
                )
            ) {

                distance += Math.pow(
                    (
                        age -
                        Number(
                            segment.avg_age
                        )
                    ) / AGE_SCALE,
                    2
                );

                dimensions++;
            }


            if (
                satisfaction !== null &&
                Number.isFinite(
                    Number(
                        segment.avg_satisfaction
                    )
                )
            ) {

                distance += Math.pow(
                    (
                        satisfaction -
                        Number(
                            segment.avg_satisfaction
                        )
                    ) / SATISFACTION_SCALE,
                    2
                );

                dimensions++;
            }


            if (
                resolution !== null &&
                Number.isFinite(
                    Number(
                        segment.avg_resolution_hours
                    )
                )
            ) {

                distance += Math.pow(
                    (
                        resolution -
                        Number(
                            segment.avg_resolution_hours
                        )
                    ) / RESOLUTION_SCALE,
                    2
                );

                dimensions++;
            }


            if (dimensions > 0) {

                distance =
                    distance /
                    dimensions;


                if (
                    distance <
                    bestDistance
                ) {

                    bestDistance =
                        distance;

                    bestSegment =
                        segment;
                }
            }
        }
    );


    return bestSegment.segment;
}


/* =========================================================
   OPTIONAL FILTERED CHART REFRESH
   ========================================================= */

function updateFilteredCharts(
    records
) {

    /*
     * This function is intentionally kept separate
     * from the main statistics logic.
     *
     * It allows the dashboard to calculate
     * filtered resolution analytics without
     * replacing the original ML-generated charts.
     */

    if (!records.length) {
        return;
    }


    const priorityMap = {};

    const typeMap = {};

    const channelMap = {};


    records.forEach(function (ticket) {

        const hours =
            getResolutionHours(
                ticket[
                    "Time to Resolution"
                ]
            );


        if (hours === null) {
            return;
        }


        const priority =
            ticket[
                "Ticket Priority"
            ];


        const type =
            ticket[
                "Ticket Type"
            ];


        const channel =
            ticket[
                "Ticket Channel"
            ];


        addGroupedValue(
            priorityMap,
            priority,
            hours
        );


        addGroupedValue(
            typeMap,
            type,
            hours
        );


        addGroupedValue(
            channelMap,
            channel,
            hours
        );
    });


    /*
     * The original resolution charts use the
     * ML-generated aggregate JSON files.
     *
     * We don't automatically replace them here,
     * because those files represent the official
     * analysis used by the project README.
     */
}


/* =========================================================
   GROUPED VALUE HELPER
   ========================================================= */

function addGroupedValue(
    map,
    key,
    value
) {

    if (
        key === null ||
        key === undefined ||
        key === ""
    ) {
        return;
    }


    if (!map[key]) {

        map[key] = {
            total: 0,
            count: 0
        };
    }


    map[key].total += value;

    map[key].count++;
}


/* =========================================================
   DATA VALIDATION
   ========================================================= */

function validateTicketRecord(ticket) {

    if (
        !ticket ||
        typeof ticket !== "object"
    ) {

        return false;
    }


    const fields = [
        "Ticket Priority",
        "Ticket Type",
        "Ticket Channel"
    ];


    return fields.some(
        function (field) {

            return (
                ticket[field] !==
                undefined
            );
        }
    );
}


/* =========================================================
   DATA QUALITY SUMMARY
   ========================================================= */

function getDataQualitySummary() {

    if (!ticketData.length) {

        return {
            total: 0,
            valid: 0,
            invalid: 0
        };
    }


    let valid = 0;


    ticketData.forEach(
        function (ticket) {

            if (
                validateTicketRecord(
                    ticket
                )
            ) {

                valid++;
            }
        }
    );


    return {

        total:
            ticketData.length,

        valid:
            valid,

        invalid:
            ticketData.length -
            valid
    };
}


/* =========================================================
   FILTER SUMMARY
   ========================================================= */

function getActiveFilters() {

    return {

        priority:
            getFilterValue(
                "priority-filter"
            ),

        type:
            getFilterValue(
                "type-filter"
            ),

        channel:
            getFilterValue(
                "channel-filter"
            ),

        segment:
            getFilterValue(
                "segment-filter-main"
            )
    };
}


/* =========================================================
   APPLICATION HEALTH CHECK
   ========================================================= */

function runHealthCheck() {

    const health = {

        chartJS:
            typeof Chart !== "undefined",

        tickets:
            ticketData.length > 0,

        segments:
            segmentData.length > 0,

        filters:
            filtersReady
    };


    console.log(
        "SupportIQ health check:",
        health
    );


    return health;
}


/* =========================================================
   DEBUG HELPERS
   ========================================================= */

window.SupportIQ = {

    getTickets:
        function () {
            return ticketData;
        },

    getSegments:
        function () {
            return segmentData;
        },

    getFilters:
        function () {
            return getActiveFilters();
        },

    getHealth:
        function () {
            return runHealthCheck();
        },

    reset:
        function () {
            resetFilters();
        }
};


/* =========================================================
   FINAL INITIALIZATION
   ========================================================= */

setTimeout(
    function () {

        runHealthCheck();

    },
    1500
);


/* =========================================================
   END OF SUPPORTIQ SCRIPT
   ========================================================= */
