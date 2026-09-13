console.log("SupportIQ dashboard loaded");


/* =========================================================
   GLOBAL DATA
========================================================= */

let ticketData = [];
let segmentData = [];

let resolutionData = {
    priority: [],
    type: [],
    channel: []
};

let priorityChart = null;
let typeChart = null;
let channelChart = null;
let segmentChart = null;

let filtersInitialized = false;


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    loadDashboardMetrics();
    loadSegments();
    loadSatisfactionData();
    loadResolutionData();
    loadTicketData();

});


/* =========================================================
   DASHBOARD METRICS
========================================================= */

async function loadDashboardMetrics() {

    try {

        const response =
            await fetch("./data/dashboard_metrics.csv");

        if (!response.ok) {
            throw new Error(
                "dashboard_metrics.csv not found"
            );
        }

        const text =
            await response.text();

        const lines =
            text.trim().split(/\r?\n/);

        const metrics = {};

        lines.slice(1).forEach(function (line) {

            const parts =
                line.split(",");

            if (parts.length >= 2) {

                metrics[
                    parts[0].trim()
                ] =
                    parts[1].trim();

            }

        });


        setText(
            "total-tickets",
            Number(
                metrics.total_tickets
            ).toLocaleString()
        );

        setText(
            "average-satisfaction",
            metrics.average_satisfaction +
            " / 5"
        );

        setText(
            "average-resolution",
            metrics.average_resolution_hours +
            " hrs"
        );

        setText(
            "customer-segments",
            metrics.customer_segments
        );


    } catch (error) {

        console.error(
            "Could not load dashboard metrics:",
            error
        );

        showError(
            "total-tickets",
            "Unavailable"
        );

        showError(
            "average-satisfaction",
            "Unavailable"
        );

        showError(
            "average-resolution",
            "Unavailable"
        );

        showError(
            "customer-segments",
            "Unavailable"
        );

    }

}


/* =========================================================
   CUSTOMER SEGMENTATION
========================================================= */

async function loadSegments() {

    try {

        const response =
            await fetch(
                "./data/segment_dashboard.json"
            );

        if (!response.ok) {

            throw new Error(
                "segment_dashboard.json not found"
            );

        }

        const data =
            await response.json();


        if (
            !data.segments ||
            !Array.isArray(data.segments)
        ) {

            throw new Error(
                "Invalid segment data"
            );

        }


        segmentData =
            data.segments;


        renderSegmentSection(
            segmentData,
            "all"
        );


        populateMainSegmentFilter();


        /*
         * If ticket data has already loaded,
         * initialize the filters.
         */

        initializeFiltersIfReady();


    } catch (error) {

        console.error(
            "Could not load customer segments:",
            error
        );


        const container =
            document.getElementById(
                "segment-container"
            );


        if (container) {

            container.innerHTML = `
                <p class="error-message">
                    Unable to load customer segmentation data.
                </p>
            `;

        }

    }

}


/* =========================================================
   RENDER SEGMENT SECTION
========================================================= */

function renderSegmentSection(
    segments,
    selectedSegment
) {

    const container =
        document.getElementById(
            "segment-container"
        );

    if (!container) {
        return;
    }


    container.innerHTML = "";


    /*
     * Existing segment filter
     */

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

            ${segments.map(function (segment) {

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


    /*
     * Table
     */

    const tableContainer =
        document.createElement("div");

    tableContainer.id =
        "segment-table-container";

    container.appendChild(
        tableContainer
    );


    /*
     * Chart
     */

    const chartContainer =
        document.createElement("div");

    chartContainer.id =
        "segment-chart-container";

    container.appendChild(
        chartContainer
    );


    /*
     * Render
     */

    renderSegments(
        segments,
        selectedSegment
    );


    /*
     * Segment section filter
     */

    const sectionFilter =
        document.getElementById(
            "segment-filter"
        );


    if (sectionFilter) {

        sectionFilter.addEventListener(
            "change",
            function () {

                const selected =
                    this.value;


                renderSegments(
                    segmentData,
                    selected
                );


                /*
                 * Synchronize main filter.
                 */

                const mainFilter =
                    document.getElementById(
                        "segment-filter-main"
                    );


                if (mainFilter) {

                    mainFilter.value =
                        selected;

                }


                updateFilteredResults();

            }
        );

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


        filter.appendChild(
            option
        );

    });

}


/* =========================================================
   RENDER SEGMENTS
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

                    return (
                        segment.segment ===
                        selectedSegment
                    );

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
                    ${formatNumber(
                        segment.avg_age
                    )}
                </td>

                <td>
                    ${formatNumber(
                        segment.avg_satisfaction
                    )} / 5
                </td>

                <td>
                    ${formatNumber(
                        segment.avg_resolution_hours
                    )} hrs
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

        segmentChart = null;

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


        setText(
            "low-satisfaction",
            Number(
                data.low_satisfaction_tickets
            ).toLocaleString()
        );


        setText(
            "satisfied-customers",
            Number(
                data.satisfied_tickets
            ).toLocaleString()
        );


        setText(
            "low-satisfaction-rate",
            data.low_satisfaction_percentage +
            "%"
        );


        setText(
            "model-accuracy",
            data.model_accuracy +
            "%"
        );


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


        if (
            !Array.isArray(priorityData.data) ||
            !Array.isArray(typeData.data) ||
            !Array.isArray(channelData.data)
        ) {

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


        /*
         * Populate filter options from
         * existing analytics data.
         */

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


        /*
         * Show original charts first.
         */

        renderOriginalResolutionCharts();


        initializeFiltersIfReady();


    } catch (error) {

        console.error(
            "Could not load resolution analytics:",
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
   ORIGINAL RESOLUTION CHARTS
========================================================= */

function renderOriginalResolutionCharts() {

    priorityChart =
        createResolutionChart(
            "priority-chart",
            resolutionData.priority,
            "priority",
            "Resolution Time by Priority",
            priorityChart
        );


    typeChart =
        createResolutionChart(
            "type-chart",
            resolutionData.type,
            "ticket_type",
            "Resolution Time by Ticket Type",
            typeChart
        );


    channelChart =
        createResolutionChart(
            "channel-chart",
            resolutionData.channel,
            "channel",
            "Resolution Time by Channel",
            channelChart
        );

}


/* =========================================================
   TICKET-LEVEL DATA
========================================================= */

async function loadTicketData() {

    try {

        /*
         * IMPORTANT:
         * ticket_data.json is in repository ROOT.
         */

        const response =
            await fetch(
                "./ticket_data.json"
            );


        if (!response.ok) {

            throw new Error(
                "ticket_data.json not found"
            );

        }


        const data =
            await response.json();


        if (!Array.isArray(data)) {

            throw new Error(
                "ticket_data.json must contain an array"
            );

        }


        ticketData =
            data;


        console.log(
            "Ticket-level records loaded:",
            ticketData.length
        );


        initializeFiltersIfReady();


    } catch (error) {

        console.error(
            "Could not load ticket-level data:",
            error
        );


        disableInteractiveFilters();


        const status =
            document.getElementById(
                "filter-result-status"
            );


        if (status) {

            status.textContent =
                "Unable to load ticket-level data.";

        }

    }

}


/* =========================================================
   INITIALIZE FILTERS
========================================================= */

function initializeFiltersIfReady() {

    /*
     * We need both:
     * ticket data
     * segment data
     */

    if (
        !ticketData.length ||
        !segmentData.length
    ) {

        return;

    }


    if (filtersInitialized) {
        return;
    }


    filtersInitialized = true;


    /*
     * Populate filters using ticket-level
     * data where possible.
     */

    populateTicketFilter(
        "priority-filter",
        "Ticket Priority",
        "All Priorities"
    );


    populateTicketFilter(
        "type-filter",
        "Ticket Type",
        "All Ticket Types"
    );


    populateTicketFilter(
        "channel-filter",
        "Ticket Channel",
        "All Channels"
    );


    populateMainSegmentFilter();


    /*
     * Attach listeners exactly once.
     */

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
            handleMainFilterChange
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


    /*
     * Initial result.
     */

    updateFilteredResults();

}


/* =========================================================
   POPULATE TICKET FILTER
========================================================= */

function populateTicketFilter(
    filterId,
    field,
    defaultLabel
) {

    const filter =
        document.getElementById(
            filterId
        );


    if (!filter) {
        return;
    }


    const values =
        getUniqueValues(
            ticketData,
            field
        );


    filter.innerHTML = "";


    const allOption =
        document.createElement("option");


    allOption.value =
        "all";


    allOption.textContent =
        defaultLabel;


    filter.appendChild(
        allOption
    );


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

}


/* =========================================================
   GENERIC ANALYTICS FILTER
========================================================= */

function populateFilter(
    filterId,
    data,
    key,
    defaultLabel
) {

    const filter =
        document.getElementById(
            filterId
        );


    if (!filter) {
        return;
    }


    /*
     * If ticket-level data is available,
     * initializeFiltersIfReady() will replace
     * these values with ticket-level values.
     */

    filter.innerHTML = "";


    const allOption =
        document.createElement("option");


    allOption.value =
        "all";


    allOption.textContent =
        defaultLabel;


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

}


/* =========================================================
   FILTER CHANGE
========================================================= */

function handleMainFilterChange() {

    const segmentFilter =
        document.getElementById(
            "segment-filter-main"
        );


    /*
     * Synchronize the segment section.
     */

    if (segmentFilter) {

        const sectionFilter =
            document.getElementById(
                "segment-filter"
            );


        if (sectionFilter) {

            sectionFilter.value =
                segmentFilter.value;

        }


        renderSegments(
            segmentData,
            segmentFilter.value
        );

    }


    /*
     * Update ticket-level results.
     */

    updateFilteredResults();

}


/* =========================================================
   TRUE TICKET-LEVEL FILTERING
========================================================= */

function updateFilteredResults() {

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


    /*
     * Apply ALL filters to the SAME
     * ticket-level dataset.
     */

    const filtered =
        ticketData.filter(
            function (ticket) {


                /*
                 * Priority
                 */

                if (
                    priority !== "all" &&
                    ticket["Ticket Priority"] !==
                    priority
                ) {

                    return false;

                }


                /*
                 * Ticket Type
                 */

                if (
                    type !== "all" &&
                    ticket["Ticket Type"] !==
                    type
                ) {

                    return false;

                }


                /*
                 * Support Channel
                 */

                if (
                    channel !== "all" &&
                    ticket["Ticket Channel"] !==
                    channel
                ) {

                    return false;

                }


                /*
                 * Customer Segment
                 */

                if (segment !== "all") {

                    const calculatedSegment =
                        getTicketSegment(
                            ticket
                        );


                    if (
                        calculatedSegment !==
                        segment
                    ) {

                        return false;

                    }

                }


                return true;

            }
        );


    console.log(
        "Filtered ticket count:",
        filtered.length
    );


    /*
     * Update filtered statistics.
     */

    updateFilteredStatistics(
        filtered
    );


    /*
     * Update resolution charts
     * using the filtered ticket records.
     */

    updateFilteredCharts(
        filtered
    );

}


/* =========================================================
   FILTERED STATISTICS
========================================================= */

function updateFilteredStatistics(
    records
) {

    const count =
        records.length;


    const satisfactionValues =
        records
            .map(function (ticket) {

                return Number(
                    ticket[
                        "Customer Satisfaction Rating"
                    ]
                );

            })
            .filter(function (value) {

                return Number.isFinite(
                    value
                );

            });


    const resolutionValues =
        records
            .map(function (ticket) {

                return Number(
                    ticket[
                        "Time to Resolution"
                    ]
                );

            })
            .filter(function (value) {

                return Number.isFinite(
                    value
                );

            });


    const averageSatisfaction =
        calculateAverage(
            satisfactionValues
        );


    const averageResolution =
        calculateAverage(
            resolutionValues
        );


    /*
     * These elements are optional.
     *
     * If they exist in index.html,
     * they will automatically update.
     */

    const countElement =
        document.getElementById(
            "filtered-ticket-count"
        );


    const satisfactionElement =
        document.getElementById(
            "filtered-average-satisfaction"
        );


    const resolutionElement =
        document.getElementById(
            "filtered-average-resolution"
        );


    const statusElement =
        document.getElementById(
            "filter-result-status"
        );


    if (countElement) {

        countElement.textContent =
            count.toLocaleString();

    }


    if (satisfactionElement) {

        satisfactionElement.textContent =
            averageSatisfaction === null
                ? "N/A"
                : averageSatisfaction.toFixed(2) +
                  " / 5";

    }


    if (resolutionElement) {

        resolutionElement.textContent =
            averageResolution === null
                ? "N/A"
                : averageResolution.toFixed(2) +
                  " hrs";

    }


    if (statusElement) {

        if (count === 0) {

            statusElement.textContent =
                "No tickets match the selected filters.";

        } else {

            statusElement.textContent =
                count.toLocaleString() +
                " ticket(s) match the selected filters.";

        }

    }

}


/* =========================================================
   FILTERED RESOLUTION CHARTS
========================================================= */

function updateFilteredCharts(
    records
) {

    /*
     * Aggregate the SAME filtered records
     * across each dimension.
     */

    const priorityData =
        aggregateResolution(
            records,
            "Ticket Priority",
            "priority"
        );


    const typeData =
        aggregateResolution(
            records,
            "Ticket Type",
            "ticket_type"
        );


    const channelData =
        aggregateResolution(
            records,
            "Ticket Channel",
            "channel"
        );


    priorityChart =
        createResolutionChart(
            "priority-chart",
            priorityData,
            "priority",
            "Filtered Resolution Time by Priority",
            priorityChart
        );


    typeChart =
        createResolutionChart(
            "type-chart",
            typeData,
            "ticket_type",
            "Filtered Resolution Time by Ticket Type",
            typeChart
        );


    channelChart =
        createResolutionChart(
            "channel-chart",
            channelData,
            "channel",
            "Filtered Resolution Time by Channel",
            channelChart
        );

}


/* =========================================================
   AGGREGATE RESOLUTION
========================================================= */

function aggregateResolution(
    records,
    field,
    outputKey
) {

    const groups = {};


    records.forEach(function (ticket) {

        const category =
            ticket[field];


        const resolution =
            Number(
                ticket[
                    "Time to Resolution"
                ]
            );


        /*
         * Ignore records without
         * resolution time.
         */

        if (
            category === null ||
            category === undefined ||
            String(category).trim() === "" ||
            !Number.isFinite(resolution)
        ) {

            return;

        }


        if (!groups[category]) {

            groups[category] = {
                total: 0,
                count: 0
            };

        }


        groups[category].total +=
            resolution;


        groups[category].count +=
            1;

    });


    return Object.keys(groups)
        .map(function (category) {

            const average =
                groups[category].total /
                groups[category].count;


            return {

                [outputKey]:
                    category,

                average_resolution_hours:
                    Number(
                        average.toFixed(2)
                    )

            };

        })
        .sort(function (a, b) {

            return (
                a.average_resolution_hours -
                b.average_resolution_hours
            );

        });

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
        return null;
    }


    /*
     * Destroy old chart.
     */

    if (existingChart) {

        existingChart.destroy();

        existingChart = null;

    }


    /*
     * No data.
     */

    if (
        !data ||
        !data.length
    ) {

        container.innerHTML = `

            <p class="error-message">

                No data available for
                the selected filters.

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


    return new Chart(
        canvas,
        {

            type: "bar",

            data: {

                labels:
                    data.map(
                        function (item) {

                            return item[
                                labelKey
                            ];

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

        }
    );

}


/* =========================================================
   CUSTOMER SEGMENT ASSIGNMENT
========================================================= */

/*
 * Assign a ticket to the closest existing
 * segment profile.
 *
 * Features:
 * - Customer Age
 * - Customer Satisfaction Rating
 * - Time to Resolution
 */

function getTicketSegment(
    ticket
) {

    if (!segmentData.length) {
        return null;
    }


    const age =
        Number(
            ticket["Customer Age"]
        );


    const satisfaction =
        Number(
            ticket[
                "Customer Satisfaction Rating"
            ]
        );


    const resolution =
        Number(
            ticket[
                "Time to Resolution"
            ]
        );


    /*
     * Open/pending tickets may not have
     * satisfaction or resolution values.
     */

    if (
        !Number.isFinite(age) ||
        !Number.isFinite(satisfaction) ||
        !Number.isFinite(resolution)
    ) {

        return null;

    }


    /*
     * Extract ranges from segment profiles.
     */

    const ageValues =
        segmentData
            .map(function (segment) {

                return Number(
                    segment.avg_age
                );

            })
            .filter(Number.isFinite);


    const satisfactionValues =
        segmentData
            .map(function (segment) {

                return Number(
                    segment.avg_satisfaction
                );

            })
            .filter(Number.isFinite);


    const resolutionValues =
        segmentData
            .map(function (segment) {

                return Number(
                    segment.avg_resolution_hours
                );

            })
            .filter(Number.isFinite);


    const ageRange =
        getRange(
            ageValues
        );


    const satisfactionRange =
        getRange(
            satisfactionValues
        );


    const resolutionRange =
        getRange(
            resolutionValues
        );


    let closestSegment =
        null;


    let smallestDistance =
        Infinity;


    segmentData.forEach(
        function (segment) {

            const segmentAge =
                Number(
                    segment.avg_age
                );


            const segmentSatisfaction =
                Number(
                    segment.avg_satisfaction
                );


            const segmentResolution =
                Number(
                    segment.avg_resolution_hours
                );


            if (
                !Number.isFinite(
                    segmentAge
                ) ||
                !Number.isFinite(
                    segmentSatisfaction
                ) ||
                !Number.isFinite(
                    segmentResolution
                )
            ) {

                return;

            }


            /*
             * Normalize the three features
             * so resolution does not dominate
             * the distance calculation.
             */

            const ageDistance =
                (
                    age -
                    segmentAge
                ) / ageRange;


            const satisfactionDistance =
                (
                    satisfaction -
                    segmentSatisfaction
                ) / satisfactionRange;


            const resolutionDistance =
                (
                    resolution -
                    segmentResolution
                ) / resolutionRange;


            const distance =
                Math.sqrt(

                    Math.pow(
                        ageDistance,
                        2
                    ) +

                    Math.pow(
                        satisfactionDistance,
                        2
                    ) +

                    Math.pow(
                        resolutionDistance,
                        2
                    )

                );


            if (
                distance <
                smallestDistance
            ) {

                smallestDistance =
                    distance;


                closestSegment =
                    segment.segment;

            }

        }
    );


    return closestSegment;

}


/* =========================================================
   RESET FILTERS
========================================================= */

function resetAllFilters() {

    const filterIds = [

        "priority-filter",
        "type-filter",
        "channel-filter",
        "segment-filter-main"

    ];


    filterIds.forEach(
        function (filterId) {

            const filter =
                document.getElementById(
                    filterId
                );


            if (filter) {

                filter.value =
                    "all";

            }

        }
    );


    /*
     * Synchronize the segment section.
     */

    const segmentSectionFilter =
        document.getElementById(
            "segment-filter"
        );


    if (segmentSectionFilter) {

        segmentSectionFilter.value =
            "all";

    }


    renderSegments(
        segmentData,
        "all"
    );


    /*
     * Recalculate ticket-level results.
     */

    updateFilteredResults();


    console.log(
        "Interactive filters reset"
    );

}


/* =========================================================
   UNIQUE VALUES
========================================================= */

function getUniqueValues(
    records,
    field
) {

    return [

        ...new Set(

            records

                .map(function (record) {

                    return record[field];

                })

                .filter(function (value) {

                    return (
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ""
                    );

                })

        )

    ].sort();

}


/* =========================================================
   FILTER VALUE
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
   CALCULATE AVERAGE
========================================================= */

function calculateAverage(
    values
) {

    if (!values.length) {
        return null;
    }


    const total =
        values.reduce(
            function (sum, value) {

                return sum + value;

            },
            0
        );


    return (
        total /
        values.length
    );

}


/* =========================================================
   SAFE RANGE
========================================================= */

function getRange(
    values
) {

    if (!values.length) {
        return 1;
    }


    const minimum =
        Math.min(
            ...values
        );


    const maximum =
        Math.max(
            ...values
        );


    const range =
        maximum -
        minimum;


    return range === 0
        ? 1
        : range;

}


/* =========================================================
   FORMAT NUMBER
========================================================= */

function formatNumber(
    value
) {

    const number =
        Number(value);


    if (!Number.isFinite(number)) {
        return "N/A";
    }


    return number.toFixed(2);

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value;

    }

}


/* =========================================================
   ERROR MESSAGE
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


/* =========================================================
   CHART ERROR
========================================================= */

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
   DISABLE FILTERS IF DATA FAILS
========================================================= */

function disableInteractiveFilters() {

    const filterIds = [

        "priority-filter",
        "type-filter",
        "channel-filter",
        "segment-filter-main",
        "reset-filters"

    ];


    filterIds.forEach(
        function (id) {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.disabled =
                    true;

            }

        }
    );

}


/* =========================================================
   HTML ESCAPING
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

