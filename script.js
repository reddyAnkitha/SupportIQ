```javascript
console.log("SupportIQ dashboard loaded");

document.addEventListener("DOMContentLoaded", function () {

    loadDashboardMetrics();
    loadSegments();
    loadSatisfactionData();
    loadResolutionData();

});


/* =========================================================
   GLOBAL DATA
========================================================= */

let resolutionData = {
    priority: [],
    type: [],
    channel: []
};

let segmentData = [];

let priorityChart = null;
let typeChart = null;
let channelChart = null;
let segmentChart = null;


/* =========================================================
   DASHBOARD METRICS
========================================================= */

async function loadDashboardMetrics() {

    try {

        const response =
            await fetch("./data/dashboard_metrics.csv");

        if (!response.ok) {
            throw new Error("dashboard_metrics.csv not found");
        }

        const text = await response.text();

        const lines =
            text.trim().split(/\r?\n/);

        const metrics = {};

        lines.slice(1).forEach(function (line) {

            const parts = line.split(",");

            if (parts.length >= 2) {

                metrics[parts[0].trim()] =
                    parts[1].trim();

            }

        });

        document.getElementById("total-tickets").textContent =
            Number(metrics.total_tickets).toLocaleString();

        document.getElementById("average-satisfaction").textContent =
            metrics.average_satisfaction + " / 5";

        document.getElementById("average-resolution").textContent =
            metrics.average_resolution_hours + " hrs";

        document.getElementById("customer-segments").textContent =
            metrics.customer_segments;

    } catch (error) {

        console.error(
            "Could not load dashboard metrics:",
            error
        );

        showError("total-tickets", "Unable to load");
        showError("average-satisfaction", "Unable to load");
        showError("average-resolution", "Unable to load");
        showError("customer-segments", "Unable to load");

    }

}


/* =========================================================
   CUSTOMER SEGMENTATION
========================================================= */

async function loadSegments() {

    try {

        const response =
            await fetch("./data/segment_dashboard.json");

        if (!response.ok) {
            throw new Error(
                "segment_dashboard.json not found"
            );
        }

        const data =
            await response.json();

        if (!data.segments ||
            !Array.isArray(data.segments)) {

            throw new Error(
                "Invalid segment data"
            );

        }

        segmentData = data.segments;

        const container =
            document.getElementById(
                "segment-container"
            );

        container.innerHTML = "";


        /* Existing segment filter */

        const filterContainer =
            document.createElement("div");

        filterContainer.className =
            "segment-filter";

        filterContainer.innerHTML = `

            <label for="segment-filter">
                View Customer Segment:
            </label>

            <select id="segment-filter">

                <option value="all">
                    All Segments
                </option>

                ${segmentData.map(function (segment) {

                    return `
                        <option value="${escapeHtml(
                            segment.segment
                        )}">
                            ${escapeHtml(
                                segment.segment
                            )}
                        </option>
                    `;

                }).join("")}

            </select>

        `;

        container.appendChild(
            filterContainer
        );


        /* Segment table */

        const tableContainer =
            document.createElement("div");

        tableContainer.id =
            "segment-table-container";

        container.appendChild(
            tableContainer
        );


        /* Segment chart */

        const chartContainer =
            document.createElement("div");

        chartContainer.id =
            "segment-chart-container";

        container.appendChild(
            chartContainer
        );


        renderSegments(
            segmentData,
            "all"
        );


        document
            .getElementById("segment-filter")
            .addEventListener(
                "change",
                function () {

                    renderSegments(
                        segmentData,
                        this.value
                    );

                    /*
                     * Keep the main filter synchronized.
                     */

                    const mainFilter =
                        document.getElementById(
                            "segment-filter-main"
                        );

                    if (mainFilter) {

                        mainFilter.value =
                            this.value;

                    }

                }
            );


        populateMainSegmentFilter();

    } catch (error) {

        console.error(
            "Could not load customer segments:",
            error
        );

        const container =
            document.getElementById(
                "segment-container"
            );

        container.innerHTML = `
            <p class="error-message">
                Unable to load customer segmentation data.
            </p>
        `;

    }

}


/* =========================================================
   MAIN SEGMENT FILTER
========================================================= */

function populateMainSegmentFilter() {

    const filter =
        document.getElementById(
            "segment-filter-main"
        );

    if (!filter) {
        return;
    }

    filter.innerHTML = `
        <option value="all">
            All Segments
        </option>
    `;

    segmentData.forEach(function (segment) {

        const option =
            document.createElement("option");

        option.value =
            segment.segment;

        option.textContent =
            segment.segment;

        filter.appendChild(option);

    });

}


/* =========================================================
   RENDER CUSTOMER SEGMENTS
========================================================= */

function renderSegments(
    segments,
    selectedSegment
) {

    let filteredSegments;

    if (selectedSegment === "all") {

        filteredSegments =
            segments;

    } else {

        filteredSegments =
            segments.filter(
                function (segment) {

                    return segment.segment ===
                        selectedSegment;

                }
            );

    }

    renderSegmentTable(
        filteredSegments
    );

    renderSegmentChart(
        filteredSegments
    );

}


/* =========================================================
   SEGMENT TABLE
========================================================= */

function renderSegmentTable(
    segments
) {

    const container =
        document.getElementById(
            "segment-table-container"
        );

    if (!container) {
        return;
    }

    if (!segments.length) {

        container.innerHTML = `
            <p class="error-message">
                No segment data available.
            </p>
        `;

        return;

    }

    let table = `

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

    segments.forEach(function (segment) {

        table += `

            <tr>

                <td>
                    ${escapeHtml(
                        segment.segment
                    )}
                </td>

                <td>
                    ${Number(
                        segment.customers
                    ).toLocaleString()}
                </td>

                <td>
                    ${segment.avg_age}
                </td>

                <td>
                    ${segment.avg_satisfaction} / 5
                </td>

                <td>
                    ${segment.avg_resolution_hours} hrs
                </td>

            </tr>

        `;

    });

    table += `

            </tbody>

        </table>

    `;

    container.innerHTML =
        table;

}


/* =========================================================
   SEGMENT CHART
========================================================= */

function renderSegmentChart(
    segments
) {

    const container =
        document.getElementById(
            "segment-chart-container"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `

        <div class="segment-chart">

            <h3>
                Customer Satisfaction by Segment
            </h3>

            <div class="chart-wrapper">

                <canvas id="segment-canvas"></canvas>

            </div>

        </div>

    `;

    const canvas =
        document.getElementById(
            "segment-canvas"
        );

    if (segmentChart) {
        segmentChart.destroy();
    }

    if (!segments.length) {
        return;
    }

    segmentChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels:
                    segments.map(
                        function (segment) {
                            return segment.segment;
                        }
                    ),

                datasets: [{

                    label:
                        "Average Satisfaction",

                    data:
                        segments.map(
                            function (segment) {

                                return Number(
                                    segment.avg_satisfaction
                                );

                            }
                        ),

                    borderWidth: 1

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                scales: {

                    y: {

                        beginAtZero: true,

                        max: 5,

                        title: {

                            display: true,

                            text:
                                "Satisfaction Score"

                        }

                    }

                }

            }

        });

}


/* =========================================================
   SATISFACTION DATA
========================================================= */

async function loadSatisfactionData() {

    try {

        const response =
            await fetch(
                "./data/satisfaction_dashboard.json"
            );

        if (!response.ok) {

            throw new Error(
                "satisfaction_dashboard.json not found"
            );

        }

        const data =
            await response.json();

        document.getElementById(
            "low-satisfaction"
        ).textContent =
            Number(
                data.low_satisfaction_tickets
            ).toLocaleString();

        document.getElementById(
            "satisfied-customers"
        ).textContent =
            Number(
                data.satisfied_tickets
            ).toLocaleString();

        document.getElementById(
            "low-satisfaction-rate"
        ).textContent =
            data.low_satisfaction_percentage + "%";

        document.getElementById(
            "model-accuracy"
        ).textContent =
            data.model_accuracy + "%";

    } catch (error) {

        console.error(
            "Could not load satisfaction data:",
            error
        );

        showError(
            "low-satisfaction",
            "Unavailable"
        );

        showError(
            "satisfied-customers",
            "Unavailable"
        );

        showError(
            "low-satisfaction-rate",
            "Unavailable"
        );

        showError(
            "model-accuracy",
            "Unavailable"
        );

    }

}


/* =========================================================
   RESOLUTION ANALYTICS
========================================================= */

async function loadResolutionData() {

    try {

        const [
            priorityResponse,
            typeResponse,
            channelResponse
        ] = await Promise.all([

            fetch(
                "./data/resolution_by_priority.json"
            ),

            fetch(
                "./data/resolution_by_type.json"
            ),

            fetch(
                "./data/resolution_by_channel.json"
            )

        ]);


        if (!priorityResponse.ok) {
            throw new Error(
                "resolution_by_priority.json not found"
            );
        }

        if (!typeResponse.ok) {
            throw new Error(
                "resolution_by_type.json not found"
            );
        }

        if (!channelResponse.ok) {
            throw new Error(
                "resolution_by_channel.json not found"
            );
        }


        const priorityData =
            await priorityResponse.json();

        const typeData =
            await typeResponse.json();

        const channelData =
            await channelResponse.json();


        if (!Array.isArray(priorityData.data) ||
            !Array.isArray(typeData.data) ||
            !Array.isArray(channelData.data)) {

            throw new Error(
                "Invalid resolution analytics data"
            );

        }


        resolutionData.priority =
            priorityData.data;

        resolutionData.type =
            typeData.data;

        resolutionData.channel =
            channelData.data;


        /* Populate filters */

        populateFilter(
            "priority-filter",
            resolutionData.priority,
            "priority"
        );

        populateFilter(
            "type-filter",
            resolutionData.type,
            "ticket_type"
        );

        populateFilter(
            "channel-filter",
            resolutionData.channel,
            "channel"
        );


        /* Create initial charts */

        updateResolutionCharts();


        /* Add filter listeners */

        setupInteractiveFilters();


    } catch (error) {

        console.error(
            "Could not load resolution analytics:",
            error
        );

        showChartError("priority-chart");
        showChartError("type-chart");
        showChartError("channel-chart");

    }

}


/* =========================================================
   POPULATE FILTER
========================================================= */

function populateFilter(
    filterId,
    data,
    key
) {

    const filter =
        document.getElementById(filterId);

    if (!filter) {
        return;
    }

    const currentValue =
        filter.value;

    const defaultText =
        filterId === "priority-filter"
            ? "All Priorities"
            : filterId === "type-filter"
                ? "All Ticket Types"
                : "All Channels";


    filter.innerHTML = "";

    const allOption =
        document.createElement("option");

    allOption.value = "all";
    allOption.textContent =
        defaultText;

    filter.appendChild(
        allOption
    );


    const values = [
        ...new Set(
            data.map(
                function (item) {
                    return item[key];
                }
            )
        )
    ];


    values.forEach(function (value) {

        const option =
            document.createElement("option");

        option.value =
            value;

        option.textContent =
            value;

        filter.appendChild(
            option
        );

    });


    if (
        currentValue &&
        values.includes(currentValue)
    ) {

        filter.value =
            currentValue;

    }

}


/* =========================================================
   INTERACTIVE FILTERS
========================================================= */

function setupInteractiveFilters() {

    const filterIds = [

        "priority-filter",
        "type-filter",
        "channel-filter",
        "segment-filter-main"

    ];


    filterIds.forEach(function (filterId) {

        const filter =
            document.getElementById(
                filterId
            );

        if (!filter) {
            return;
        }


        filter.addEventListener(
            "change",
            function () {

                updateResolutionCharts();

                updateMainSegmentView();

            }
        );

    });


    const resetButton =
        document.getElementById(
            "reset-filters"
        );


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetAllFilters
        );

    }

}


/* =========================================================
   UPDATE RESOLUTION CHARTS
========================================================= */

function updateResolutionCharts() {

    const priorityFilter =
        getFilterValue(
            "priority-filter"
        );

    const typeFilter =
        getFilterValue(
            "type-filter"
        );

    const channelFilter =
        getFilterValue(
            "channel-filter"
        );


    /*
     * Since the current resolution JSON files
     * are aggregated independently, each chart
     * responds to its own filter.
     */

    let priorityData =
        resolutionData.priority;

    let typeData =
        resolutionData.type;

    let channelData =
        resolutionData.channel;


    if (priorityFilter !== "all") {

        priorityData =
            priorityData.filter(
                function (item) {

                    return item.priority ===
                        priorityFilter;

                }
            );

    }


    if (typeFilter !== "all") {

        typeData =
            typeData.filter(
                function (item) {

                    return item.ticket_type ===
                        typeFilter;

                }
            );

    }


    if (channelFilter !== "all") {

        channelData =
            channelData.filter(
                function (item) {

                    return item.channel ===
                        channelFilter;

                }
            );

    }


    createResolutionChart(
        "priority-chart",
        priorityData,
        "priority",
        "Resolution Time by Priority",
        priorityChart
    );


    createResolutionChart(
        "type-chart",
        typeData,
        "ticket_type",
        "Resolution Time by Ticket Type",
        typeChart
    );


    createResolutionChart(
        "channel-chart",
        channelData,
        "channel",
        "Resolution Time by Channel",
        channelChart
    );

}


/* =========================================================
   UPDATE MAIN SEGMENT VIEW
========================================================= */

function updateMainSegmentView() {

    const filter =
        document.getElementById(
            "segment-filter-main"
        );

    if (!filter) {
        return;
    }

    const selectedSegment =
        filter.value;


    const existingSegmentFilter =
        document.getElementById(
            "segment-filter"
        );


    if (existingSegmentFilter) {

        existingSegmentFilter.value =
            selectedSegment;

    }


    renderSegments(
        segmentData,
        selectedSegment
    );

}


/* =========================================================
   RESET FILTERS
========================================================= */

function resetAllFilters() {

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


    if (priorityFilter) {
        priorityFilter.value =
            "all";
    }

    if (typeFilter) {
        typeFilter.value =
            "all";
    }

    if (channelFilter) {
        channelFilter.value =
            "all";
    }

    if (segmentFilter) {
        segmentFilter.value =
            "all";
    }


    const oldSegmentFilter =
        document.getElementById(
            "segment-filter"
        );

    if (oldSegmentFilter) {
        oldSegmentFilter.value =
            "all";
    }


    updateResolutionCharts();

    renderSegments(
        segmentData,
        "all"
    );

}


/* =========================================================
   GET FILTER VALUE
========================================================= */

function getFilterValue(
    filterId
) {

    const filter =
        document.getElementById(
            filterId
        );

    if (!filter) {
        return "all";
    }

    return filter.value ||
        "all";

}


/* =========================================================
   RESOLUTION CHART
========================================================= */

function createResolutionChart(
    containerId,
    data,
    labelKey,
    chartTitle,
    existingChart
) {

    const container =
        document.getElementById(
            containerId
        );

    if (!container) {
        return;
    }


    if (existingChart) {
        existingChart.destroy();
    }


    if (!data || !data.length) {

        container.innerHTML = `
            <p class="error-message">
                No data available for the selected filter.
            </p>
        `;

        return null;

    }


    container.innerHTML = `

        <div class="chart-wrapper">

            <canvas></canvas>

        </div>

    `;


    const canvas =
        container.querySelector(
            "canvas"
        );


    return new Chart(canvas, {

        type: "bar",

        data: {

            labels:
                data.map(
                    function (item) {
                        return item[labelKey];
                    }
                ),

            datasets: [{

                label:
                    "Average Resolution Time (hours)",

                data:
                    data.map(
                        function (item) {

                            return Number(
                                item.average_resolution_hours
                            );

                        }
                    ),

                borderWidth: 1

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {
                    display: false
                },

                title: {
                    display: false,
                    text: chartTitle
                }

            },

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
   ERROR HANDLING
========================================================= */

function showError(
    elementId,
    message
) {

    const element =
        document.getElementById(
            elementId
        );

    if (element) {

        element.textContent =
            message;

    }

}


function showChartError(
    containerId
) {

    const container =
        document.getElementById(
            containerId
        );

    if (container) {

        container.innerHTML = `

            <p class="error-message">

                Unable to load analytics data.
                Please try again later.

            </p>

        `;

    }

}


/* =========================================================
   SECURITY / HTML ESCAPING
========================================================= */

function escapeHtml(
    value
) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}
```
