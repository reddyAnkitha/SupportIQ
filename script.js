const DATA_PATH = "data/";

const FILES = {
    metrics: DATA_PATH + "dashboard_metrics.csv",

    segments:
        DATA_PATH + "segment_dashboard.json",

    satisfaction:
        DATA_PATH + "satisfaction_dashboard.json",

    resolutionPriority:
        DATA_PATH + "resolution_by_priority.json",

    resolutionType:
        DATA_PATH + "resolution_by_type.json",

    resolutionChannel:
        DATA_PATH + "resolution_by_channel.json",

    // ticket_data.json is in the ROOT
    tickets:
        "ticket_data.json",

    // Actual K-Means ticket-to-segment mapping
    ticketSegmentMapping:
        "ticket_segment_mapping.json"
};


let ticketData = [];

let ticketSegmentMapping = [];

let ticketSegmentMap = new Map();

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


/*
 * Create a consistent key for ticket mapping.
 *
 * Ticket ID alone may not uniquely identify
 * every record, so Customer Email is included.
 */

function makeTicketKey(
    ticketId,
    customerEmail
) {

    const normalizedTicketId =
        normalize(ticketId);

    const normalizedEmail =
        normalize(customerEmail);


    if (
        !normalizedTicketId ||
        !normalizedEmail
    ) {

        return "";
    }


    return (
        `${normalizedTicketId}||${normalizedEmail}`
    );
}


/* =========================================================
   LOAD JSON
========================================================= */


async function loadJSON(file) {

    const response =
        await fetch(
            file,
            {
                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            `Unable to load ${file}: HTTP ${response.status}`
        );
    }


    const text =
        await response.text();


    return JSON.parse(
        cleanJSONText(text)
    );
}


/* =========================================================
   LOAD DASHBOARD METRICS
========================================================= */


async function loadMetrics() {

    try {

        const response =
            await fetch(
                FILES.metrics,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Metrics file unavailable"
            );
        }


        const text =
            await response.text();


        const lines =
            text

                .trim()

                .split(/\r?\n/)

                .map(
                    line =>
                        line.trim()
                )

                .filter(Boolean);


        const metrics = {};


        lines

            .slice(1)

            .forEach(line => {

                const parts =
                    line.split(",");


                if (
                    parts.length < 2
                ) {

                    return;
                }


                const key =
                    parts[0]

                        .trim()

                        .toLowerCase();


                const value =
                    Number(
                        parts[1].trim()
                    );


                if (
                    Number.isFinite(value)
                ) {

                    metrics[key] =
                        value;
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
        getElement(
            "total-tickets"
        );


    const averageSatisfaction =
        getElement(
            "average-satisfaction"
        );


    const averageResolution =
        getElement(
            "average-resolution"
        );


    const customerSegments =
        getElement(
            "customer-segments"
        );


    if (totalTickets) {

        totalTickets.textContent =
            formatNumber(
                metrics.totalTickets
            );
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
   CUSTOMER SEGMENTS
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
        getElement(
            "segment-container"
        );


    if (!container) {

        return;
    }


    /*
     * Support both:
     *
     * {
     *     "segments": [...]
     * }
     *
     * and:
     *
     * [...]
     */

    const segments =
        Array.isArray(data)

            ? data

            : data?.segments || [];


    if (!segments.length) {

        container.innerHTML =
            "<p>Customer segmentation data unavailable.</p>";

        return;
    }


    /*
     * Calculate total customers represented
     * by the six K-Means segments.
     */

    const totalCustomers =
        segments.reduce(

            (sum, segment) => {

                const customers =
                    Number(
                        segment.customers
                    );


                return (

                    sum +

                    (
                        Number.isFinite(
                            customers
                        )

                            ? customers

                            : 0
                    )
                );
            },

            0
        );


    /* =====================================================
       TABLE ROWS
    ===================================================== */


    let tableRows = "";


    segments.forEach(
        segment => {

            const satisfaction =
                Number(
                    segment.avg_satisfaction
                );


            const resolution =
                Number(
                    segment.avg_resolution_hours
                );


            const customers =
                Number(
                    segment.customers
                );


            /*
             * Determine customer risk.
             */

            let riskClass =
                "medium-risk";


            let riskText =
                "Medium Risk";


            if (
                Number.isFinite(
                    satisfaction
                )
            ) {

                if (
                    satisfaction <= 2
                ) {

                    riskClass =
                        "high-risk";


                    riskText =
                        "High Risk";

                } else if (
                    satisfaction >= 4
                ) {

                    riskClass =
                        "low-risk";


                    riskText =
                        "Low Risk";
                }
            }


            /*
             * Determine resolution speed.
             */

            const isFast =
                Number.isFinite(
                    resolution
                ) &&
                resolution <= 10;


            const speedClass =
                isFast

                    ? "fast-resolution"

                    : "slow-resolution";


            const speedText =
                isFast

                    ? "Fast Resolution"

                    : "Slow Resolution";


            /*
             * Satisfaction badge.
             */

            let satisfactionClass =
                "satisfaction-medium";


            if (
                Number.isFinite(
                    satisfaction
                )
            ) {

                if (
                    satisfaction >= 4
                ) {

                    satisfactionClass =
                        "satisfaction-good";

                } else if (
                    satisfaction <= 2
                ) {

                    satisfactionClass =
                        "satisfaction-poor";
                }
            }


            tableRows += `

                <tr>

                    <td class="segment-name-cell">

                        <div class="segment-name">

                            <span class="segment-dot"></span>

                            <div>

                                <strong>
                                    ${segment.segment ?? "N/A"}
                                </strong>

                                <div class="segment-badges">

                                    <span class="
                                        segment-badge
                                        ${riskClass}
                                    ">
                                        ${riskText}
                                    </span>

                                    <span class="
                                        segment-badge
                                        ${speedClass}
                                    ">
                                        ${speedText}
                                    </span>

                                </div>

                            </div>

                        </div>

                    </td>


                    <td class="number-cell">
                        ${formatNumber(
                            customers
                        )}
                    </td>


                    <td class="number-cell">
                        ${formatNumber(
                            segment.avg_age,
                            1
                        )}
                    </td>


                    <td class="number-cell">

                        <span class="
                            satisfaction-value
                            ${satisfactionClass}
                        ">

                            ${formatNumber(
                                satisfaction,
                                2
                            )} / 5

                        </span>

                    </td>


                    <td class="number-cell">

                        <span class="
                            resolution-value
                            ${speedClass}
                        ">

                            ${formatNumber(
                                resolution,
                                2
                            )} hrs

                        </span>

                    </td>

                </tr>
            `;
        }
    );


    /* =====================================================
       COMPLETE SEGMENT DASHBOARD
    ===================================================== */


    container.innerHTML = `

        <div class="segment-dashboard">


            <!-- LEFT: SEGMENT TABLE -->

            <div class="segment-table-card">

                <div class="segment-card-header">

                    <div>

                        <h3>
                            Customer Segments
                        </h3>

                        <p>
                            Six customer groups identified
                            using K-Means clustering.
                        </p>

                    </div>


                    <span class="ml-badge">
                        K-Means
                    </span>

                </div>


                <div class="segment-table-wrapper">

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

                            ${tableRows}

                        </tbody>

                    </table>

                </div>

            </div>


            <!-- RIGHT SIDE -->

            <div class="segment-side-panel">


                <!-- DISTRIBUTION CHART -->

                <div class="segment-chart-card">

                    <div class="segment-card-header">

                        <div>

                            <h3>
                                Segment Distribution
                            </h3>

                            <p>
                                Customer distribution across
                                the six segments.
                            </p>

                        </div>

                    </div>


                    <div class="segment-chart-wrapper">

                        <canvas
                            id="segment-distribution-chart"
                            aria-label="Customer segment distribution chart"
                            role="img">
                        </canvas>

                    </div>


                    <div
                        id="segment-chart-legend"
                        class="segment-chart-legend">
                    </div>

                </div>


                <!-- KEY INSIGHTS -->

                <div class="segment-insights-card">

                    <h3>
                        Key Insights
                    </h3>

                    <div
                        id="segment-insights"
                        class="segment-insights">
                    </div>

                </div>


            </div>

        </div>
    `;


    /* =====================================================
       FIND IMPORTANT SEGMENTS
    ===================================================== */


    const validSegments =
        segments.filter(
            segment =>
                Number.isFinite(
                    Number(
                        segment.avg_satisfaction
                    )
                )
        );


    const segmentsForComparison =
        validSegments.length

            ? validSegments

            : segments;


    /*
     * Best performing segment.
     */

    const bestSegment =
        segmentsForComparison.reduce(

            (best, current) =>

                Number(
                    current.avg_satisfaction
                )

                >

                Number(
                    best.avg_satisfaction
                )

                    ? current

                    : best
        );


    /*
     * Highest risk segment.
     */

    const highestRiskSegment =
        segmentsForComparison.reduce(

            (worst, current) =>

                Number(
                    current.avg_satisfaction
                )

                <

                Number(
                    worst.avg_satisfaction
                )

                    ? current

                    : worst
        );


    /*
     * Largest segment.
     */

    const largestSegment =
        segments.reduce(

            (largest, current) =>

                Number(
                    current.customers
                )

                >

                Number(
                    largest.customers
                )

                    ? current

                    : largest
        );


    /*
     * Fastest resolution segment.
     */

    const segmentsWithResolution =
        segments.filter(
            segment =>
                Number.isFinite(
                    Number(
                        segment.avg_resolution_hours
                    )
                )
        );


    const fastestSegment =
        segmentsWithResolution.length

            ? segmentsWithResolution.reduce(

                (fastest, current) =>

                    Number(
                        current.avg_resolution_hours
                    )

                    <

                    Number(
                        fastest.avg_resolution_hours
                    )

                        ? current

                        : fastest

            )

            : segments[0];


    /* =====================================================
       SEGMENT DISTRIBUTION CHART
    ===================================================== */


    const canvas =
        getElement(
            "segment-distribution-chart"
        );


    if (
        canvas &&
        typeof Chart !== "undefined"
    ) {

        /*
         * Destroy previous chart.
         */

        if (charts.segment) {

            charts.segment.destroy();

            charts.segment = null;
        }


        const labels =
            segments.map(
                segment =>
                    segment.segment
            );


        const values =
            segments.map(
                segment =>
                    Number(
                        segment.customers
                    )
            );


        charts.segment =
            new Chart(

                canvas,

                {

                    type:
                        "doughnut",


                    data: {

                        labels:
                            labels,


                        datasets: [

                            {

                                data:
                                    values,

                                borderWidth:
                                    2
                            }
                        ]
                    },


                    options: {

                        responsive:
                            true,

                        maintainAspectRatio:
                            false,

                        cutout:
                            "62%",


                        plugins: {

                            legend: {

                                display:
                                    false
                            },


                            tooltip: {

                                callbacks: {

                                    label:
                                        function(
                                            context
                                        ) {

                                            const value =
                                                Number(
                                                    context.raw
                                                );


                                            const percentage =
                                                totalCustomers > 0

                                                    ?

                                                    (
                                                        value /
                                                        totalCustomers
                                                    ) * 100

                                                    : 0;


                                            return (

                                                ` ${formatNumber(
                                                    value
                                                )} customers ` +

                                                `(${percentage.toFixed(
                                                    1
                                                )}%)`
                                            );
                                        }
                                }
                            }
                        }
                    }
                }
            );


    } else if (canvas) {

        const wrapper =
            canvas.parentElement;


        if (wrapper) {

            wrapper.innerHTML = `

                <div class="chart-error">

                    Chart.js could not be loaded.

                </div>
            `;
        }
    }


    /* =====================================================
       CHART LEGEND
    ===================================================== */


    const legend =
        getElement(
            "segment-chart-legend"
        );


    if (legend) {

        legend.innerHTML =

            segments

                .map(
                    segment => {

                        const customers =
                            Number(
                                segment.customers
                            );


                        const percentage =
                            totalCustomers > 0

                                ?

                                (
                                    customers /
                                    totalCustomers
                                ) * 100

                                : 0;


                        return `

                            <div class="legend-item">

                                <span class="legend-dot"></span>

                                <span class="legend-name">
                                    ${segment.segment}
                                </span>

                                <strong>
                                    ${formatNumber(
                                        customers
                                    )}
                                </strong>

                                <span class="legend-percent">
                                    ${percentage.toFixed(
                                        1
                                    )}%
                                </span>

                            </div>
                        `;
                    }
                )

                .join("");
    }


    /* =====================================================
       KEY INSIGHTS
    ===================================================== */


    const insights =
        getElement(
            "segment-insights"
        );


    if (
        insights &&
        bestSegment &&
        highestRiskSegment &&
        largestSegment &&
        fastestSegment
    ) {

        const largestPercentage =
            totalCustomers > 0

                ?

                (
                    Number(
                        largestSegment.customers
                    ) /
                    totalCustomers
                ) * 100

                : 0;


        insights.innerHTML = `

            <!-- BEST PERFORMING -->

            <div class="insight-item">

                <div class="insight-icon success">
                    ★
                </div>

                <div>

                    <span class="insight-label">
                        Best Performing
                    </span>

                    <strong>
                        ${bestSegment.segment}
                    </strong>

                    <small>

                        ${formatNumber(
                            bestSegment.avg_satisfaction,
                            2
                        )} / 5 satisfaction

                        ·

                        ${formatNumber(
                            bestSegment.avg_resolution_hours,
                            2
                        )} hrs resolution

                    </small>

                </div>

            </div>


            <!-- HIGHEST RISK -->

            <div class="insight-item">

                <div class="insight-icon danger">
                    !
                </div>

                <div>

                    <span class="insight-label">
                        Highest Risk
                    </span>

                    <strong>
                        ${highestRiskSegment.segment}
                    </strong>

                    <small>

                        ${formatNumber(
                            highestRiskSegment.avg_satisfaction,
                            2
                        )} / 5 satisfaction

                        ·

                        ${formatNumber(
                            highestRiskSegment.avg_resolution_hours,
                            2
                        )} hrs resolution

                    </small>

                </div>

            </div>


            <!-- LARGEST SEGMENT -->

            <div class="insight-item">

                <div class="insight-icon primary">
                    👥
                </div>

                <div>

                    <span class="insight-label">
                        Largest Segment
                    </span>

                    <strong>
                        ${largestSegment.segment}
                    </strong>

                    <small>

                        ${formatNumber(
                            largestSegment.customers
                        )}

                        customers

                        ·

                        ${largestPercentage.toFixed(
                            1
                        )}%

                        of segmented customers

                    </small>

                </div>

            </div>


            <!-- FASTEST RESOLUTION -->

            <div class="insight-item">

                <div class="insight-icon speed">
                    ⚡
                </div>

                <div>

                    <span class="insight-label">
                        Fastest Resolution
                    </span>

                    <strong>
                        ${fastestSegment.segment}
                    </strong>

                    <small>

                        ${formatNumber(
                            fastestSegment.avg_resolution_hours,
                            2
                        )}

                        hrs average resolution

                    </small>

                </div>

            </div>

        `;
    }
}


/* =========================================================
   SATISFACTION RISK
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


function renderSatisfaction(data) {

    const low =
        getElement(
            "low-satisfaction"
        );


    const satisfied =
        getElement(
            "satisfied-customers"
        );


    const rate =
        getElement(
            "low-satisfaction-rate"
        );


    const accuracy =
        getElement(
            "model-accuracy"
        );


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
   TICKET SEGMENT MAPPING
========================================================= */


async function loadTicketSegmentMapping() {

    try {

        const data =
            await loadJSON(
                FILES.ticketSegmentMapping
            );


        if (!Array.isArray(data)) {

            throw new Error(
                "ticket_segment_mapping.json must contain an array."
            );
        }


        if (!data.length) {

            throw new Error(
                "ticket_segment_mapping.json is empty."
            );
        }


        ticketSegmentMapping =
            data;


        /*
         * Build a Map once.
         *
         * This is much faster than using .find()
         * for every ticket during filtering.
         */

        buildTicketSegmentMap();


        /*
         * Validate mapping content.
         */

        const segmentNames =
            new Set();


        ticketSegmentMapping.forEach(
            item => {

                const segment =
                    item.segment ??
                    item["Segment"] ??
                    null;


                if (segment) {

                    segmentNames.add(
                        String(segment)
                    );
                }
            }
        );


        console.log(
            "K-Means segment names:",
            [...segmentNames]
        );


        console.log(
            `Loaded ${ticketSegmentMapping.length} ticket-segment mappings.`
        );


        console.log(
            `Unique mapped ticket/email pairs: ${ticketSegmentMap.size}`
        );


        if (
            segmentNames.size !== 6
        ) {

            console.warn(
                `Expected 6 K-Means segments but found ${segmentNames.size}.`
            );
        }


        return ticketSegmentMapping;


    } catch (error) {

        console.error(
            "Ticket segment mapping error:",
            error
        );


        ticketSegmentMapping = [];

        ticketSegmentMap =
            new Map();


        return [];
    }
}


/* =========================================================
   BUILD FAST TICKET SEGMENT MAP
========================================================= */


function buildTicketSegmentMap() {

    ticketSegmentMap =
        new Map();


    ticketSegmentMapping.forEach(
        item => {

            const ticketId =
                item["Ticket ID"] ??
                item.ticket_id;


            const customerEmail =
                item["Customer Email"] ??
                item.customer_email;


            const segment =
                item.segment ??
                item["Segment"] ??
                null;


            const key =
                makeTicketKey(
                    ticketId,
                    customerEmail
                );


            if (
                !key ||
                !segment
            ) {

                return;
            }


            /*
             * Keep the first valid mapping
             * if duplicate records exist.
             */

            if (
                !ticketSegmentMap.has(key)
            ) {

                ticketSegmentMap.set(
                    key,
                    segment
                );
            }
        }
    );


    console.log(
        `Built ${ticketSegmentMap.size} ticket-segment lookup entries.`
    );
}


/* =========================================================
   GET TICKET VALUE
========================================================= */


function getTicketValue(
    ticket,
    possibleNames
) {

    for (
        const name of possibleNames
    ) {

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


    return null;
}


/* =========================================================
   GET ACTUAL K-MEANS TICKET SEGMENT
========================================================= */


function getTicketSegment(ticket) {

    const ticketId =
        getTicketValue(
            ticket,
            [
                "Ticket ID",
                "ticket_id"
            ]
        );


    const customerEmail =
        getTicketValue(
            ticket,
            [
                "Customer Email",
                "customer_email"
            ]
        );


    const key =
        makeTicketKey(
            ticketId,
            customerEmail
        );


    if (!key) {

        return null;
    }


    /*
     * O(1) Map lookup.
     */

    return (
        ticketSegmentMap.get(key) ??
        null
    );
}


/* =========================================================
   POPULATE FILTER
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


    defaultOption.value =
        "";


    defaultOption.textContent =
        defaultText;


    select.appendChild(
        defaultOption
    );


    values.forEach(
        value => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                value;


            option.textContent =
                value;


            select.appendChild(
                option
            );
        }
    );
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


    ticketData.forEach(
        ticket => {

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

                priorities.add(
                    priority
                );
            }


            if (type) {

                types.add(
                    type
                );
            }


            if (channel) {

                channels.add(
                    channel
                );
            }
        }
    );


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


    /*
     * Official K-Means segment names.
     */

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
    ]

        .forEach(
            filter => {

                if (filter) {

                    filter.addEventListener(
                        "change",
                        updateFilteredDashboard
                    );
                }
            }
        );


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
   FILTER TICKETS
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


            /*
             * Use the actual K-Means mapping.
             */

            const ticketSegment =
                getTicketSegment(
                    ticket
                );


            const priorityMatch =

                !priority ||

                normalize(
                    ticketPriority
                ) ===

                normalize(
                    priority
                );


            const typeMatch =

                !type ||

                normalize(
                    ticketType
                ) ===

                normalize(
                    type
                );


            const channelMatch =

                !channel ||

                normalize(
                    ticketChannel
                ) ===

                normalize(
                    channel
                );


            /*
             * If a segment is selected,
             * a missing mapping must NOT match.
             */

            const segmentMatch =

                !segment

                    ?

                    true

                    :

                    Boolean(
                        ticketSegment
                    ) &&

                    normalize(
                        ticketSegment
                    ) ===

                    normalize(
                        segment
                    );


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
   FILTERED DASHBOARD
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


    /*
     * Let CSS control layout.
     */

    if (filteredStats) {

        filteredStats.style.display =
            "";
    }


    if (countElement) {

        countElement.textContent =
            formatNumber(
                filteredTickets.length
            );
    }


    /* =====================================================
       SATISFACTION CALCULATION
    ===================================================== */


    const satisfactionValues =

        filteredTickets

            .map(
                ticket => {

                    const rawValue =
                        getTicketValue(
                            ticket,
                            [
                                "Customer Satisfaction Rating",
                                "customer_satisfaction_rating"
                            ]
                        );


                    /*
                     * Ignore missing ratings.
                     */

                    if (

                        rawValue === null ||

                        rawValue === undefined ||

                        rawValue === ""

                    ) {

                        return null;
                    }


                    const value =
                        Number(
                            rawValue
                        );


                    if (
                        !Number.isFinite(
                            value
                        )
                    ) {

                        return null;
                    }


                    return value;
                }
            )

            .filter(
                value =>
                    value !== null
            );


    if (satisfactionElement) {

        if (
            satisfactionValues.length
        ) {

            const total =
                satisfactionValues.reduce(

                    (sum, value) =>
                        sum + value,

                    0
                );


            const average =
                total /
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


    /* =====================================================
       FILTERED RESOLUTION
    ===================================================== */


    /*
     * ticket_data.json does not contain
     * usable Time to Resolution values.
     *
     * Therefore do not calculate a
     * misleading filtered resolution.
     */

    if (resolutionElement) {

        resolutionElement.textContent =
            "See analytics";
    }


    /* =====================================================
       FILTER STATUS
    ===================================================== */


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

    const filterIds = [

        "priority-filter",

        "type-filter",

        "channel-filter",

        "segment-filter-main"

    ];


    filterIds.forEach(
        id => {

            const element =
                getElement(
                    id
                );


            if (element) {

                element.value =
                    "";
            }
        }
    );


    updateFilteredDashboard();
}


/* =========================================================
   RESOLUTION ANALYTICS
========================================================= */


async function loadResolutionData() {

    /*
     * Load all three files independently.
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


    return {

        priority:

            results[0].status ===
            "fulfilled"

                ?

                results[0].value

                :

                null,


        type:

            results[1].status ===
            "fulfilled"

                ?

                results[1].value

                :

                null,


        channel:

            results[2].status ===
            "fulfilled"

                ?

                results[2].value

                :

                null
    };
}


/* =========================================================
   EXTRACT RESOLUTION ROWS
========================================================= */


function extractResolutionRows(data) {

    if (!data) {

        return [];
    }


    if (
        Array.isArray(data)
    ) {

        return data;
    }


    if (
        Array.isArray(
            data.data
        )
    ) {

        return data.data;
    }


    return [];
}


/* =========================================================
   GET VALID RESOLUTION VALUE
========================================================= */


function getResolutionValue(row) {

    const possibleValues = [

        row.average_resolution_hours,

        row.averageResolutionHours,

        row["Average Resolution Hours"],

        row.average_resolution,

        row["Average Resolution"]

    ];


    for (
        const rawValue of possibleValues
    ) {

        if (

            rawValue === null ||

            rawValue === undefined ||

            rawValue === ""

        ) {

            continue;
        }


        const value =
            Number(
                rawValue
            );


        if (
            Number.isFinite(
                value
            )
        ) {

            return value;
        }
    }


    return null;
}


/* =========================================================
   DESTROY EXISTING CHART
========================================================= */


function destroyChart(chartKey) {

    if (
        charts[chartKey]
    ) {

        charts[chartKey].destroy();

        charts[chartKey] =
            null;
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
        getElement(
            containerId
        );


    if (!container) {

        console.error(
            `Missing chart container: ${containerId}`
        );

        return;
    }


    destroyChart(
        chartKey
    );


    container.innerHTML =
        "";


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


    if (
        typeof Chart ===
        "undefined"
    ) {

        console.error(
            "Chart.js is not available."
        );


        container.innerHTML = `

            <div class="chart-error">

                Chart.js could not be loaded.

            </div>

        `;

        return;
    }


    if (

        labels.length === 0 ||

        values.length === 0

    ) {

        showChartError(

            containerId,

            "No resolution data available."

        );

        return;
    }


    charts[chartKey] =

        new Chart(

            canvas,

            {

                type:
                    "bar",


                data: {

                    labels:
                        labels,


                    datasets: [

                        {

                            label:
                                "Average Resolution Time (hrs)",

                            data:
                                values,

                            borderWidth:
                                1

                        }

                    ]
                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,


                    animation: {

                        duration:
                            500

                    },


                    plugins: {

                        legend: {

                            display:
                                false
                        },


                        title: {

                            display:
                                true,

                            text:
                                title
                        },


                        tooltip: {

                            callbacks: {

                                label:
                                    function(
                                        context
                                    ) {

                                        const value =
                                            context.parsed.y;


                                        return (

                                            " " +

                                            Number(
                                                value
                                            ).toFixed(
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

                            beginAtZero:
                                true,


                            title: {

                                display:
                                    true,

                                text:
                                    "Average Resolution Time (hrs)"
                            }
                        },


                        x: {

                            title: {

                                display:
                                    true,

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
   PRIORITY CHART
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


    rows.forEach(
        row => {

            const label =

                row.priority ??

                row.Priority ??

                "Unknown";


            const value =
                getResolutionValue(
                    row
                );


            if (
                value !== null
            ) {

                labels.push(
                    label
                );


                values.push(
                    value
                );
            }
        }
    );


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
   TICKET TYPE CHART
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


    rows.forEach(
        row => {

            const label =

                row.ticket_type ??

                row.ticketType ??

                row["Ticket Type"] ??

                "Unknown";


            const value =
                getResolutionValue(
                    row
                );


            if (
                value !== null
            ) {

                labels.push(
                    label
                );


                values.push(
                    value
                );
            }
        }
    );


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
   CHANNEL CHART
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


    rows.forEach(
        row => {

            const label =

                row.channel ??

                row.Channel ??

                row["Ticket Channel"] ??

                "Unknown";


            const value =
                getResolutionValue(
                    row
                );


            if (
                value !== null
            ) {

                labels.push(
                    label
                );


                values.push(
                    value
                );
            }
        }
    );


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


function renderResolutionCharts(
    resolutionData
) {

    console.log(
        "Resolution analytics loaded:",
        resolutionData
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
}


/* =========================================================
   CHART ERROR
========================================================= */


function showChartError(
    containerId,
    message
) {

    const container =
        getElement(
            containerId
        );


    if (!container) {

        return;
    }


    container.innerHTML = `

        <div class="chart-error">

            <p>
                ${message}
            </p>

        </div>

    `;
}


/* =========================================================
   TICKET DATA
========================================================= */


async function loadTicketData() {

    try {

        /*
         * ticket_data.json is located
         * in the repository ROOT.
         */

        const response =
            await fetch(

                FILES.tickets,

                {
                    cache:
                        "no-store"
                }

            );


        if (!response.ok) {

            throw new Error(

                `Unable to load ticket_data.json: HTTP ${response.status}`

            );
        }


        const text =
            await response.text();


        ticketData =

            JSON.parse(

                cleanJSONText(
                    text
                )

            );


        if (
            !Array.isArray(
                ticketData
            )
        ) {

            throw new Error(

                "ticket_data.json must contain an array."

            );
        }


        /*
         * Load actual K-Means mapping.
         */

        await loadTicketSegmentMapping();


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


        ticketSegmentMapping = [];


        ticketSegmentMap =
            new Map();


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
   INITIALIZE DASHBOARD
========================================================= */


async function initializeDashboard() {

    try {

        /*
         * Load dashboard information.
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
         * Render dashboard.
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
         * Render resolution charts.
         */

        renderResolutionCharts(
            resolution
        );


        /*
         * Load ticket data and
         * actual K-Means mapping.
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
