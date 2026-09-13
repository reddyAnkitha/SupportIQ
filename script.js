console.log("SupportIQ dashboard loaded");

let ticketData = [];
let segmentData = [];

let priorityChart = null;
let typeChart = null;
let channelChart = null;
let segmentChart = null;

let filtersInitialized = false;


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    console.log("DOM loaded");

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

        console.log("Loading dashboard metrics...");

        const response =
            await fetch("./data/dashboard_metrics.csv");

        if (!response.ok) {
            throw new Error(
                "dashboard_metrics.csv returned " +
                response.status
            );
        }

        const text =
            await response.text();

        console.log("Dashboard CSV loaded");

        const lines =
            text.trim().split(/\r?\n/);

        const metrics = {};

        lines.slice(1).forEach(function (line) {

            const parts =
                line.split(",");

            if (parts.length >= 2) {

                const key =
                    parts[0].trim();

                const value =
                    parts.slice(1)
                        .join(",")
                        .trim();

                metrics[key] = value;
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
            "Dashboard metrics error:",
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
   CUSTOMER SEGMENTS
========================================================= */

async function loadSegments() {

    try {

        console.log("Loading segment data...");

        const response =
            await fetch(
                "./data/segment_dashboard.json"
            );

        if (!response.ok) {

            throw new Error(
                "segment_dashboard.json returned " +
                response.status
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

        console.log(
            "Segments loaded:",
            segmentData.length
        );


        renderSegmentSection(
            segmentData,
            "all"
        );


        populateMainSegmentFilter();

        initializeFiltersIfReady();


    } catch (error) {

        console.error(
            "Segment data error:",
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
   SEGMENT SECTION
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


    const tableContainer =
        document.createElement("div");

    tableContainer.id =
        "segment-table-container";

    container.appendChild(
        tableContainer
    );


    const chartContainer =
        document.createElement("div");

    chartContainer.id =
        "segment-chart-container";

    container.appendChild(
        chartContainer
    );


    renderSegments(
        segments,
        selectedSegment
    );


    const sectionFilter =
        document.getElementById(
            "segment-filter"
        );


    if (sectionFilter) {

        sectionFilter.value =
            selectedSegment;


        sectionFilter.addEventListener(
            "change",
            function () {

                const selected =
                    this.value;


                renderSegments(
                    segmentData,
                    selected
                );


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

                    <th>
                        Customer Segment
                    </th>

                    <th>
                        Customers
                    </th>

                    <th>
                        Avg Age
                    </th>

                    <th>
                        Avg Satisfaction
                    </th>

                    <th>
                        Avg Resolution
                    </th>

                </tr>

            </thead>

            <tbody>

    `;


    segments.forEach(
        function (segment) {

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
                        )}
                        / 5
                    </td>

                    <td>
                        ${formatNumber(
                            segment.avg_resolution_hours
                        )}
                        hrs
                    </td>

                </tr>

            `;

        }
    );


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


    if (segmentChart) {

        try {
            segmentChart.destroy();
        } catch (error) {
            console.warn(error);
        }

        segmentChart = null;

    }


    container.innerHTML = "";


    if (!segments.length) {
        return;
    }


    const title =
        document.createElement("h3");

    title.textContent =
        "Customer Satisfaction by Segment";


    const wrapper =
        document.createElement("div");

    wrapper.className =
        "chart-wrapper";


    const canvas =
        document.createElement("canvas");


    wrapper.appendChild(
        canvas
    );


    container.appendChild(
        title
    );

    container.appendChild(
        wrapper
    );


    if (typeof Chart === "undefined") {

        container.innerHTML = `
            <p class="error-message">
                Chart.js could not be loaded.
            </p>
        `;

        return;

    }


    segmentChart =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels:
                        segments.map(
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
                                        return Number(
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
                        }

                    },

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

            }
        );

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


    segmentData.forEach(
        function (segment) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                segment.segment;

            option.textContent =
                segment.segment;

            filter.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   SATISFACTION
========================================================= */

async function loadSatisfactionData() {

    try {

        console.log(
            "Loading satisfaction data..."
        );


        const response =
            await fetch(
                "./data/satisfaction_dashboard.json"
            );


        if (!response.ok) {

            throw new Error(
                "satisfaction_dashboard.json returned " +
                response.status
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


        console.log(
            "Satisfaction data loaded"
        );


    } catch (error) {

        console.error(
            "Satisfaction data error:",
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
   RESOLUTION DATA
========================================================= */

async function loadResolutionData() {

    try {

        console.log(
            "Loading resolution data..."
        );


        const responses =
            await Promise.all([

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


        if (
            !responses[0].ok ||
            !responses[1].ok ||
            !responses[2].ok
        ) {

            throw new Error(
                "One or more resolution files could not be loaded"
            );

        }


        const priorityData =
            await responses[0].json();


        const typeData =
            await responses[1].json();


        const channelData =
            await responses[2].json();


        if (
            !Array.isArray(priorityData.data) ||
            !Array.isArray(typeData.data) ||
            !Array.isArray(channelData.data)
        ) {

            throw new Error(
                "Invalid resolution data"
            );

        }


        populateFilter(
            "priority-filter",
            priorityData.data,
            "priority",
            "All Priorities"
        );


        populateFilter(
            "type-filter",
            typeData.data,
            "ticket_type",
            "All Ticket Types"
        );


        populateFilter(
            "channel-filter",
            channelData.data,
            "channel",
            "All Channels"
        );


        console.log(
            "Resolution data loaded"
        );


        initializeFiltersIfReady();


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
   TICKET DATA
========================================================= */

async function loadTicketData() {

    try {

        console.log(
            "Loading ticket data..."
        );


        const response =
            await fetch(
                "./ticket_data.json"
            );


        if (!response.ok) {

            throw new Error(
                "ticket_data.json returned " +
                response.status
            );

        }


        const text =
            await response.text();


        const safeText =
            text
                .replace(
                    /\bNaN\b/g,
                    "null"
                )
                .replace(
                    /\bInfinity\b/g,
                    "null"
                )
                .replace(
                    /\b-Infinity\b/g,
                    "null"
                );


        const data =
            JSON.parse(
                safeText
            );


        if (!Array.isArray(data)) {

            throw new Error(
                "ticket_data.json must contain an array"
            );

        }


        ticketData =
            data;


        console.log(
            "Ticket records loaded:",
            ticketData.length
        );


        initializeFiltersIfReady();


    } catch (error) {

        console.error(
            "Ticket data error:",
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
   FILTER INITIALIZATION
========================================================= */

function initializeFiltersIfReady() {

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


            if (!filter) {
                return;
            }


            filter.addEventListener(
                "change",
                handleMainFilterChange
            );

        }
    );


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


    updateFilteredResults();

}


/* =========================================================
   TICKET FILTER
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
        document.createElement(
            "option"
        );


    allOption.value =
        "all";


    allOption.textContent =
        defaultLabel;


    filter.appendChild(
        allOption
    );


    values.forEach(
        function (value) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                value;


            option.textContent =
                value;


            filter.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   FILTER CHANGE
========================================================= */

function handleMainFilterChange() {

    const segmentFilter =
        document.getElementById(
            "segment-filter-main"
        );


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


    updateFilteredResults();

}


/* =========================================================
   FILTER RESULTS
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


    const filtered =
        ticketData.filter(
            function (ticket) {

                if (
                    priority !== "all" &&
                    ticket["Ticket Priority"] !==
                    priority
                ) {

                    return false;

                }


                if (
                    type !== "all" &&
                    ticket["Ticket Type"] !==
                    type
                ) {

                    return false;

                }


                if (
                    channel !== "all" &&
                    ticket["Ticket Channel"] !==
                    channel
                ) {

                    return false;

                }


                if (
                    segment !== "all"
                ) {

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
        "Filtered tickets:",
        filtered.length
    );


    updateFilteredStatistics(
        filtered
    );


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

    const satisfactionValues =
        records
            .map(
                function (ticket) {

                    return Number(
                        ticket[
                            "Customer Satisfaction Rating"
                        ]
                    );

                }
            )
            .filter(
                function (value) {

                    return Number.isFinite(
                        value
                    );

                }
            );


    const resolutionValues =
        records
            .map(
                function (ticket) {

                    return Number(
                        ticket[
                            "Time to Resolution"
                        ]
                    );

                }
            )
            .filter(
                function (value) {

                    return Number.isFinite(
                        value
                    );

                }
            );


    const averageSatisfaction =
        calculateAverage(
            satisfactionValues
        );


    const averageResolution =
        calculateAverage(
            resolutionValues
        );


    setText(
        "filtered-ticket-count",
        records.length.toLocaleString()
    );


    setText(
        "filtered-average-satisfaction",

        averageSatisfaction === null

            ? "N/A"

            : averageSatisfaction.toFixed(2) +
              " / 5"
    );


    setText(
        "filtered-average-resolution",

        averageResolution === null

            ? "N/A"

            : averageResolution.toFixed(2) +
              " hrs"
    );


    const status =
        document.getElementById(
            "filter-result-status"
        );


    if (status) {

        status.textContent =

            records.length === 0

                ? "No tickets match the selected filters."

                : records.length.toLocaleString() +
                  " ticket(s) match the selected filters.";

    }

}


/* =========================================================
   FILTERED CHARTS
========================================================= */

function updateFilteredCharts(
    records
) {

    priorityChart =
        createResolutionChart(
            "priority-chart",
            aggregateResolution(
                records,
                "Ticket Priority",
                "priority"
            ),
            "priority",
            priorityChart
        );


    typeChart =
        createResolutionChart(
            "type-chart",
            aggregateResolution(
                records,
                "Ticket Type",
                "ticket_type"
            ),
            "ticket_type",
            typeChart
        );


    channelChart =
        createResolutionChart(
            "channel-chart",
            aggregateResolution(
                records,
                "Ticket Channel",
                "channel"
            ),
            "channel",
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


    records.forEach(
        function (ticket) {

            const category =
                ticket[field];


            const resolution =
                Number(
                    ticket[
                        "Time to Resolution"
                    ]
                );


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

        }
    );


    return Object.keys(groups)

        .map(
            function (category) {

                return {

                    [outputKey]:
                        category,

                    average_resolution_hours:
                        Number(
                            (
                                groups[category].total /
                                groups[category].count
                            ).toFixed(2)
                        )

                };

            }
        )

        .sort(
            function (a, b) {

                return (
                    a.average_resolution_hours -
                    b.average_resolution_hours
                );

            }
        );

}


/* =========================================================
   RESOLUTION CHART
========================================================= */

function createResolutionChart(
    containerId,
    data,
    labelKey,
    existingChart
) {

    const container =
        document.getElementById(
            containerId
        );


    if (!container) {
        return null;
    }


    if (existingChart) {

        try {

            existingChart.destroy();

        } catch (error) {

            console.warn(
                "Chart destroy error:",
                error
            );

        }

    }


    container.innerHTML = "";


    if (!data || !data.length) {

        container.innerHTML = `
            <p class="error-message">
                No data available for the selected filters.
            </p>
        `;

        return null;

    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "chart-wrapper";


    wrapper.style.position =
        "relative";


    wrapper.style.width =
        "100%";


    wrapper.style.height =
        "360px";


    const canvas =
        document.createElement(
            "canvas"
        );


    wrapper.appendChild(
        canvas
    );


    container.appendChild(
        wrapper
    );


    if (typeof Chart === "undefined") {

        container.innerHTML = `
            <p class="error-message">
                Chart.js could not be loaded.
            </p>
        `;

        return null;

    }


    return new Chart(
        canvas,
        {

            type: "bar",

            data: {

                labels:
                    data.map(
                        function (item) {

                            return item[labelKey];

                        }
                    ),

                datasets: [

                    {

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
                                        " " +
                                        context.raw +
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

                            text: "Hours"

                        }

                    }

                }

            }

        }
    );

}


/* =========================================================
   CUSTOMER SEGMENT
========================================================= */

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


    if (
        !Number.isFinite(age) ||
        !Number.isFinite(satisfaction) ||
        !Number.isFinite(resolution)
    ) {

        return null;

    }


    const ageValues =
        segmentData
            .map(
                function (segment) {

                    return Number(
                        segment.avg_age
                    );

                }
            )
            .filter(
                Number.isFinite
            );


    const satisfactionValues =
        segmentData
            .map(
                function (segment) {

                    return Number(
                        segment.avg_satisfaction
                    );

                }
            )
            .filter(
                Number.isFinite
            );


    const resolutionValues =
        segmentData
            .map(
                function (segment) {

                    return Number(
                        segment.avg_resolution_hours
                    );

                }
            )
            .filter(
                Number.isFinite
            );


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
   RESET
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


    const sectionFilter =
        document.getElementById(
            "segment-filter"
        );


    if (sectionFilter) {

        sectionFilter.value =
            "all";

    }


    renderSegments(
        segmentData,
        "all"
    );


    updateFilteredResults();


    console.log(
        "Filters reset"
    );

}


/* =========================================================
   HELPERS
========================================================= */

function getUniqueValues(
    records,
    field
) {

    return [

        ...new Set(

            records
                .map(
                    function (record) {

                        return record[field];

                    }
                )

                .filter(
                    function (value) {

                        return (
                            value !== null &&
                            value !== undefined &&
                            String(value).trim() !== ""
                        );

                    }
                )

        )

    ].sort();

}


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


function calculateAverage(
    values
) {

    if (!values.length) {
        return null;
    }


    const total =
        values.reduce(
            function (
                sum,
                value
            ) {

                return sum + value;

            },
            0
        );


    return (
        total /
        values.length
    );

}


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

            </p>

        `;

    }

}


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

