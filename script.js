/* SupportIQ - Customer Support Intelligence Platform
   Interactive dashboard script
   Loads dashboard/ML data and ticket-level data for dynamic filters.
*/

"use strict";


/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
    "https://supportiq-api-pg9k.onrender.com";


/* =========================================================
   DATA FILES
========================================================= */

const DATA_FILES = {
    metrics: "./data/dashboard_metrics.json",
    segments: "./data/customer_segments.json",
    satisfaction: "./data/satisfaction_analysis.json",
    ticketData: "./ticket_data.json"
};


let ticketData = [];
let segmentData = [];
let resolutionCharts = {};
let segmentChart = null;
let filtersInitialized = false;


/* =========================================================
   API TICKET ANALYSIS REQUEST
========================================================= */

async function analyzeTicketWithAPI(ticket) {

    const response = await fetch(
        `${API_BASE_URL}/analyze`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                customer_age: Number(
                    ticket["Customer Age"]
                ),

                priority:
                    ticket["Ticket Priority"],

                ticket_type:
                    ticket["Ticket Type"],

                channel:
                    ticket["Ticket Channel"],

                description:
                    ticket["Description"] ||
                    ticket["Ticket Subject"] ||
                    "Customer support request"
            })
        }
    );


    if (!response.ok) {

        throw new Error(
            `API request failed: ${response.status}`
        );

    }


    return await response.json();
}


/* =========================================================
   API TICKET ANALYSIS
========================================================= */

function setupAPIAnalysis() {

    const button =
        document.getElementById(
            "analyzeTicketBtn"
        );


    const result =
        document.getElementById(
            "apiAnalysisResult"
        );


    if (!button || !result) {

        return;

    }


    button.addEventListener(
        "click",
        async function () {

            const tickets =
                window.supportIQTickets;


            if (
                !tickets ||
                !Array.isArray(tickets) ||
                tickets.length === 0
            ) {

                result.textContent =
                    "Ticket data is not available yet.";

                return;

            }


            const ticket =
                tickets[0];


            result.textContent =
                "Analyzing ticket...";


            button.disabled = true;


            try {

                const analysis =
                    await analyzeTicketWithAPI(
                        ticket
                    );


                const terms =
                    analysis
                        ?.text_analysis
                        ?.important_terms
                        ?.map(
                            item =>
                                `${item.term} (${item.frequency})`
                        )
                        .join(", ");


                const prediction =
                    analysis?.prediction;


                result.innerHTML = `
                    <strong>Analysis Complete</strong>

                    <br><br>

                    <strong>Risk:</strong>
                    ${prediction?.risk_label || "Unavailable"}

                    <br>

                    <strong>Risk Probability:</strong>
                    ${prediction?.risk_probability ?? "Unavailable"}

                    <br><br>

                    <strong>Important Terms:</strong>
                    ${terms || "No important terms found."}
                `;


            } catch (error) {

                console.error(
                    "Ticket analysis error:",
                    error
                );


                result.textContent =
                    "Unable to analyze the ticket. Please try again.";


            } finally {

                button.disabled = false;

            }

        }
    );
}


/* =========================================================
   APPLICATION START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        initializeDashboard();
    }
);


/* =========================================================
   INITIALIZE DASHBOARD
========================================================= */

async function initializeDashboard() {

    setInitialLoadingState();


    /*
     * Load each dataset independently so
     * one missing file does not break
     * the whole dashboard.
     */

    await Promise.allSettled([
        loadDashboardMetrics(),
        loadSegments(),
        loadSatisfactionData(),
        loadTicketData()
    ]);


    initializeInteractiveFilters();

    updateResolutionCharts();

    updateFilteredStats();


    /*
     * Connect the AI Ticket Analysis
     * button after ticket data is loaded.
     */

    setupAPIAnalysis();


    /*
     * If ticket-level data is unavailable,
     * show a clear fallback message.
     */

    if (!ticketData.length) {

        showTicketDataWarning();

    }

}


/* =========================================================
   UTILITIES
========================================================= */

async function fetchJson(path) {

    const response =
        await fetch(
            path,
            {
                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            `Unable to load ${path} (${response.status})`
        );

    }


    const text =
        await response.text();


    /*
     * The generated ticket_data.json
     * may contain NaN values.
     *
     * JSON.parse does not normally accept NaN,
     * so safely convert them to null.
     */

    const cleanedText =
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


    return JSON.parse(
        cleanedText
    );
}


function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


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


function toNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;

    }


    if (
        typeof value === "number"
    ) {

        return Number.isFinite(value)
            ? value
            : null;

    }


    const parsed =
        parseFloat(
            String(value)
                .replace(
                    /[^\d.-]/g,
                    ""
                )
        );


    return Number.isFinite(parsed)
        ? parsed
        : null;
}


function formatNumber(
    value,
    decimals = 2
) {

    const number =
        toNumber(value);


    if (number === null) {

        return "N/A";

    }


    return number.toLocaleString(
        "en-IN",
        {
            minimumFractionDigits:
                decimals,

            maximumFractionDigits:
                decimals
        }
    );
}


function getElement(id) {

    return document.getElementById(
        id
    );
}


function setText(
    id,
    value
) {

    const element =
        getElement(id);


    if (element) {

        element.textContent =
            value;

    }
}


function normalizeKey(value) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /[\s_-]+/g,
            " "
        );
}


function getFirstExisting(
    obj,
    keys,
    fallback = null
) {

    if (
        !obj ||
        typeof obj !== "object"
    ) {

        return fallback;

    }


    for (
        const key of keys
    ) {

        if (
            Object.prototype.hasOwnProperty.call(
                obj,
                key
            )
        ) {

            return obj[key];

        }

    }


    return fallback;
}


/* =========================================================
   DASHBOARD METRICS
========================================================= */

async function loadDashboardMetrics() {

    try {

        const data =
            await fetchJson(
                DATA_FILES.metrics
            );


        const metrics =
            Array.isArray(data)
                ? data[0] || {}
                : data || {};


        const totalTickets =
            getFirstExisting(
                metrics,
                [
                    "Total Tickets",
                    "total_tickets",
                    "totalTickets",
                    "total"
                ],
                8469
            );


        const averageSatisfaction =
            getFirstExisting(
                metrics,
                [
                    "Average Satisfaction",
                    "average_satisfaction",
                    "avg_satisfaction",
                    "Avg Satisfaction"
                ],
                2.99
            );


        const averageResolution =
            getFirstExisting(
                metrics,
                [
                    "Average Resolution Time",
                    "average_resolution",
                    "avg_resolution",
                    "Avg Resolution Time"
                ],
                11.77
            );


        const customerSegments =
            getFirstExisting(
                metrics,
                [
                    "Customer Segments",
                    "customer_segments",
                    "segments"
                ],
                6
            );


        setText(
            "total-tickets",
            formatNumber(
                totalTickets,
                0
            )
        );


        setText(
            "average-satisfaction",
            formatNumber(
                averageSatisfaction,
                2
            ) + "/5"
        );


        setText(
            "average-resolution",
            formatNumber(
                averageResolution,
                2
            ) + " hrs"
        );


        setText(
            "customer-segments",
            formatNumber(
                customerSegments,
                0
            )
        );


    } catch (error) {

        console.error(
            "Dashboard metrics error:",
            error
        );


        /*
         * Known project values are used
         * only as a visual fallback.
         */

        setText(
            "total-tickets",
            "8,469"
        );


        setText(
            "average-satisfaction",
            "2.99/5"
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


/* =========================================================
   SEGMENTATION
========================================================= */

async function loadSegments() {

    try {

        const data =
            await fetchJson(
                DATA_FILES.segments
            );


        if (
            Array.isArray(data)
        ) {

            segmentData =
                data;

        } else if (
            Array.isArray(
                data?.segments
            )
        ) {

            segmentData =
                data.segments;

        } else if (
            Array.isArray(
                data?.data
            )
        ) {

            segmentData =
                data.data;

        } else {

            segmentData =
                [];

        }


        renderSegmentSection();


    } catch (error) {

        console.error(
            "Segment data error:",
            error
        );


        renderSegmentError();

    }
}


function getSegmentName(
    segment
) {

    return getFirstExisting(
        segment,
        [
            "Segment",
            "segment",
            "Segment Name",
            "segment_name",
            "name",
            "Cluster"
        ],
        "Customer Segment"
    );
}


function getSegmentValue(
    segment,
    keys,
    fallback = null
) {

    return getFirstExisting(
        segment,
        keys,
        fallback
    );
}


function renderSegmentSection() {

    const container =
        getElement(
            "segment-container"
        );


    if (!container) {

        return;

    }


    if (
        !segmentData.length
    ) {

        container.innerHTML = `
            <div class="error-message">
                Customer segmentation data could not be loaded.
            </div>
        `;

        return;

    }


    let html = `
        <div class="segment-summary">
            <div class="segment-grid">
    `;


    segmentData.forEach(
        (
            segment,
            index
        ) => {

            const name =
                getSegmentName(
                    segment
                );


            const count =
                getSegmentValue(
                    segment,
                    [
                        "Count",
                        "count",
                        "Customer Count",
                        "customer_count",
                        "Tickets",
                        "tickets"
                    ],
                    null
                );


            const satisfaction =
                getSegmentValue(
                    segment,
                    [
                        "Average Satisfaction",
                        "average_satisfaction",
                        "Avg Satisfaction",
                        "avg_satisfaction",
                        "Satisfaction"
                    ],
                    null
                );


            const resolution =
                getSegmentValue(
                    segment,
                    [
                        "Average Resolution Time",
                        "average_resolution",
                        "Avg Resolution Time",
                        "avg_resolution",
                        "Resolution Time",
                        "resolution_time"
                    ],
                    null
                );


            html += `
                <div class="card segment-card">
                    <h3>${escapeHtml(name)}</h3>

                    <div class="segment-details">

                        ${
                            count !== null
                                ? `<p><strong>Tickets:</strong> ${escapeHtml(
                                    formatNumber(
                                        count,
                                        0
                                    )
                                )}</p>`
                                : ""
                        }

                        ${
                            satisfaction !== null
                                ? `<p><strong>Satisfaction:</strong> ${escapeHtml(
                                    formatNumber(
                                        satisfaction,
                                        2
                                    )
                                )}/5</p>`
                                : ""
                        }

                        ${
                            resolution !== null
                                ? `<p><strong>Resolution:</strong> ${escapeHtml(
                                    formatNumber(
                                        resolution,
                                        2
                                    )
                                )} hrs</p>`
                                : ""
                        }

                    </div>
                </div>
            `;


            if (
                (index + 1) % 3 === 0
            ) {

                /*
                 * Grid layout handles rows automatically.
                 */

            }

        }
    );


    html += `
            </div>
        </div>

        <div class="chart-card segment-chart-wrapper">
            <canvas id="segment-chart"></canvas>
        </div>
    `;


    container.innerHTML =
        html;


    renderSegmentChart();
}


function renderSegmentChart() {

    const canvas =
        getElement(
            "segment-chart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;

    }


    if (
        segmentChart
    ) {

        segmentChart.destroy();

    }


    const labels =
        segmentData.map(
            getSegmentName
        );


    const counts =
        segmentData.map(
            segment =>
                toNumber(
                    getSegmentValue(
                        segment,
                        [
                            "Count",
                            "count",
                            "Customer Count",
                            "customer_count",
                            "Tickets",
                            "tickets"
                        ],
                        0
                    )
                ) || 0
        );


    segmentChart =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {
                    labels,

                    datasets: [
                        {
                            label: "Tickets",
                            data: counts
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
                        }
                    },

                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            }
        );
}


function renderSegmentError() {

    const container =
        getElement(
            "segment-container"
        );


    if (container) {

        container.innerHTML = `
            <div class="error-message">
                Customer segmentation data is currently unavailable.
            </div>
        `;

    }
}


/* =========================================================
   SATISFACTION DATA
========================================================= */

async function loadSatisfactionData() {

    try {

        const data =
            await fetchJson(
                DATA_FILES.satisfaction
            );


        const root =
            Array.isArray(data)
                ? data[0] || {}
                : data || {};


        const lowSatisfaction =
            getFirstExisting(
                root,
                [
                    "Low Satisfaction",
                    "low_satisfaction",
                    "lowSatisfaction",
                    "Low Satisfaction Count",
                    "low_satisfaction_count"
                ],
                1102
            );


        const satisfied =
            getFirstExisting(
                root,
                [
                    "Satisfied Customers",
                    "satisfied_customers",
                    "satisfiedCustomers",
                    "Satisfied",
                    "satisfied"
                ],
                1667
            );


        const rate =
            getFirstExisting(
                root,
                [
                    "Low Satisfaction Rate",
                    "low_satisfaction_rate",
                    "lowSatisfactionRate",
                    "Rate",
                    "rate"
                ],
                39.8
            );


        const accuracy =
            getFirstExisting(
                root,
                [
                    "Model Accuracy",
                    "model_accuracy",
                    "modelAccuracy",
                    "Accuracy",
                    "accuracy"
                ],
                59.75
            );


        setText(
            "low-satisfaction",
            formatNumber(
                lowSatisfaction,
                0
            )
        );


        setText(
            "satisfied-customers",
            formatNumber(
                satisfied,
                0
            )
        );


        setText(
            "low-satisfaction-rate",
            formatNumber(
                rate,
                2
            ) + "%"
        );


        setText(
            "model-accuracy",
            formatNumber(
                accuracy,
                2
            ) + "%"
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
            "39.80%"
        );


        setText(
            "model-accuracy",
            "59.75%"
        );

    }
}


/* =========================================================
   TICKET DATA
========================================================= */

async function loadTicketData() {

    try {

        const data =
            await fetchJson(
                DATA_FILES.ticketData
            );


        if (
            Array.isArray(data)
        ) {

            ticketData =
                data;

        } else if (
            Array.isArray(
                data?.data
            )
        ) {

            ticketData =
                data.data;

        } else if (
            Array.isArray(
                data?.tickets
            )
        ) {

            ticketData =
                data.tickets;

        } else {

            ticketData =
                [];

        }


        /*
         * Keep only valid objects.
         */

        ticketData =
            ticketData.filter(
                item =>
                    item &&
                    typeof item === "object"
            );


        /*
         * Make ticket data available
         * to the API analysis section.
         */

        window.supportIQTickets =
            ticketData;


        console.log(
            `SupportIQ: loaded ${ticketData.length} ticket records.`
        );


    } catch (error) {

        console.error(
            "Ticket data error:",
            error
        );


        ticketData =
            [];


        window.supportIQTickets =
            [];

    }
}


/* =========================================================
   INTERACTIVE FILTERS
========================================================= */

function initializeInteractiveFilters() {

    if (
        filtersInitialized
    ) {

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


    /*
     * The filter controls are optional.
     * This keeps the script compatible
     * with older versions of index.html.
     */

    if (
        !priorityFilter &&
        !typeFilter &&
        !channelFilter &&
        !segmentFilter
    ) {

        return;

    }


    populateFilter(
        priorityFilter,
        getUniqueValues(
            ticketData,
            [
                "Ticket Priority",
                "ticket_priority",
                "priority"
            ]
        )
    );


    populateFilter(
        typeFilter,
        getUniqueValues(
            ticketData,
            [
                "Ticket Type",
                "ticket_type",
                "type"
            ]
        )
    );


    populateFilter(
        channelFilter,
        getUniqueValues(
            ticketData,
            [
                "Ticket Channel",
                "ticket_channel",
                "channel"
            ]
        )
    );


    populateSegmentFilter(
        segmentFilter
    );


    if (priorityFilter) {

        priorityFilter.addEventListener(
            "change",
            handleFilterChange
        );

    }


    if (typeFilter) {

        typeFilter.addEventListener(
            "change",
            handleFilterChange
        );

    }


    if (channelFilter) {

        channelFilter.addEventListener(
            "change",
            handleFilterChange
        );

    }


    if (segmentFilter) {

        segmentFilter.addEventListener(
            "change",
            handleFilterChange
        );

    }


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetAllFilters
        );

    }


    filtersInitialized =
        true;
}


function populateFilter(
    select,
    values
) {

    if (!select) {

        return;

    }


    const currentValue =
        select.value;


    select.innerHTML =
        `<option value="">All</option>`;


    values
        .filter(
            value =>
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
        )
        .sort(
            (
                a,
                b
            ) =>
                String(a).localeCompare(
                    String(b)
                )
        )
        .forEach(
            value => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    String(value);


                option.textContent =
                    String(value);


                select.appendChild(
                    option
                );

            }
        );


    if (
        [
            ...select.options
        ].some(
            option =>
                option.value ===
                currentValue
        )
    ) {

        select.value =
            currentValue;

    }
}


function populateSegmentFilter(
    select
) {

    if (!select) {

        return;

    }


    const currentValue =
        select.value;


    select.innerHTML =
        `<option value="">All Segments</option>`;


    segmentData.forEach(
        segment => {

            const name =
                getSegmentName(
                    segment
                );


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                name;


            option.textContent =
                name;


            select.appendChild(
                option
            );

        }
    );


    if (
        [
            ...select.options
        ].some(
            option =>
                option.value ===
                currentValue
        )
    ) {

        select.value =
            currentValue;

    }
}


function getUniqueValues(
    data,
    keys
) {

    const values =
        new Set();


    data.forEach(
        record => {

            const value =
                getFirstExisting(
                    record,
                    keys,
                    null
                );


            if (
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
            ) {

                values.add(
                    String(value)
                );

            }

        }
    );


    return [
        ...values
    ];
}


function handleFilterChange() {

    updateResolutionCharts();

    updateFilteredStats();
}


function getFilteredTickets() {

    if (
        !ticketData.length
    ) {

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
                String(
                    getFirstExisting(
                        ticket,
                        [
                            "Ticket Priority",
                            "ticket_priority",
                            "priority"
                        ],
                        ""
                    )
                );


            const ticketType =
                String(
                    getFirstExisting(
                        ticket,
                        [
                            "Ticket Type",
                            "ticket_type",
                            "type"
                        ],
                        ""
                    )
                );


            const ticketChannel =
                String(
                    getFirstExisting(
                        ticket,
                        [
                            "Ticket Channel",
                            "ticket_channel",
                            "channel"
                        ],
                        ""
                    )
                );


            if (
                priority &&
                ticketPriority !==
                    priority
            ) {

                return false;

            }


            if (
                type &&
                ticketType !==
                    type
            ) {

                return false;

            }


            if (
                channel &&
                ticketChannel !==
                    channel
            ) {

                return false;

            }


            if (
                segment &&
                inferSegment(ticket) !==
                    segment
            ) {

                return false;

            }


            return true;

        }
    );
}


/* =========================================================
   SEGMENT MATCHING
========================================================= */

/*
   ticket_data.json contains the variables
   needed for the dashboard:
   age, satisfaction, and resolution time.

   The original K-Means model was trained
   separately. For interactive filtering,
   this function maps each ticket to the
   closest published segment profile.
*/

function inferSegment(
    ticket
) {

    if (
        !segmentData.length
    ) {

        return "";

    }


    const age =
        toNumber(
            getFirstExisting(
                ticket,
                [
                    "Customer Age",
                    "customer_age",
                    "age"
                ],
                null
            )
        );


    const satisfaction =
        toNumber(
            getFirstExisting(
                ticket,
                [
                    "Customer Satisfaction Rating",
                    "customer_satisfaction_rating",
                    "satisfaction",
                    "rating"
                ],
                null
            )
        );


    const resolution =
        toNumber(
            getFirstExisting(
                ticket,
                [
                    "Time to Resolution",
                    "time_to_resolution",
                    "resolution_time",
                    "resolution"
                ],
                null
            )
        );


    /*
     * Missing fields cannot be reliably
     * mapped to a cluster.
     */

    if (
        age === null &&
        satisfaction === null &&
        resolution === null
    ) {

        return "";

    }


    let bestName =
        "";


    let bestDistance =
        Infinity;


    segmentData.forEach(
        segment => {

            const segmentAge =
                toNumber(
                    getSegmentValue(
                        segment,
                        [
                            "Average Age",
                            "average_age",
                            "Avg Age",
                            "avg_age",
                            "Customer Age",
                            "age"
                        ],
                        null
                    )
                );


            const segmentSatisfaction =
                toNumber(
                    getSegmentValue(
                        segment,
                        [
                            "Average Satisfaction",
                            "average_satisfaction",
                            "Avg Satisfaction",
                            "avg_satisfaction",
                            "Satisfaction"
                        ],
                        null
                    )
                );


            const segmentResolution =
                toNumber(
                    getSegmentValue(
                        segment,
                        [
                            "Average Resolution Time",
                            "average_resolution",
                            "Avg Resolution Time",
                            "avg_resolution",
                            "Resolution Time",
                            "resolution_time"
                        ],
                        null
                    )
                );


            let distance =
                0;


            let dimensions =
                0;


            if (
                age !== null &&
                segmentAge !== null
            ) {

                distance +=
                    Math.pow(
                        (
                            age -
                            segmentAge
                        ) / 20,
                        2
                    );


                dimensions++;

            }


            if (
                satisfaction !== null &&
                segmentSatisfaction !== null
            ) {

                distance +=
                    Math.pow(
                        (
                            satisfaction -
                            segmentSatisfaction
                        ) / 2,
                        2
                    );


                dimensions++;

            }


            if (
                resolution !== null &&
                segmentResolution !== null
            ) {

                distance +=
                    Math.pow(
                        (
                            resolution -
                            segmentResolution
                        ) / 12,
                        2
                    );


                dimensions++;

            }


            if (
                dimensions > 0
            ) {

                distance =
                    distance /
                    dimensions;


                if (
                    distance <
                    bestDistance
                ) {

                    bestDistance =
                        distance;


                    bestName =
                        getSegmentName(
                            segment
                        );

                }

            }

        }
    );


    return bestName;
}


/* =========================================================
   RESOLUTION ANALYTICS
========================================================= */

function updateResolutionCharts() {

    const filtered =
        getFilteredTickets();


    if (
        !filtered.length
    ) {

        renderEmptyChart(
            "priority-chart",
            "No ticket data matches the selected filters."
        );


        renderEmptyChart(
            "type-chart",
            "No ticket data matches the selected filters."
        );


        renderEmptyChart(
            "channel-chart",
            "No ticket data matches the selected filters."
        );


        return;

    }


    const priorityData =
        aggregateResolution(
            filtered,
            [
                "Ticket Priority",
                "ticket_priority",
                "priority"
            ]
        );


    const typeData =
        aggregateResolution(
            filtered,
            [
                "Ticket Type",
                "ticket_type",
                "type"
            ]
        );


    const channelData =
        aggregateResolution(
            filtered,
            [
                "Ticket Channel",
                "ticket_channel",
                "channel"
            ]
        );


    createResolutionChart(
        "priority-chart",
        "Resolution by Priority",
        priorityData
    );


    createResolutionChart(
        "type-chart",
        "Resolution by Ticket Type",
        typeData
    );


    createResolutionChart(
        "channel-chart",
        "Resolution by Channel",
        channelData
    );
}


function aggregateResolution(
    data,
    groupKeys
) {

    const groups =
        {};


    data.forEach(
        ticket => {

            const group =
                getFirstExisting(
                    ticket,
                    groupKeys,
                    "Unknown"
                );


            const resolution =
                toNumber(
                    getFirstExisting(
                        ticket,
                        [
                            "Time to Resolution",
                            "time_to_resolution",
                            "resolution_time",
                            "resolution"
                        ],
                        null
                    )
                );


            if (
                resolution === null
            ) {

                return;

            }


            const name =
                String(
                    group ||
                    "Unknown"
                );


            if (
                !groups[name]
            ) {

                groups[name] =
                    {
                        total: 0,
                        count: 0
                    };

            }


            groups[name].total +=
                resolution;


            groups[name].count++;

        }
    );


    return Object.entries(
        groups
    )
        .map(
            (
                [
                    label,
                    value
                ]
            ) => ({

                label,

                value:
                    value.count
                        ? value.total /
                          value.count
                        : 0,

                count:
                    value.count

            })
        )
        .sort(
            (
                a,
                b
            ) =>
                b.value -
                a.value
        );
}


function createResolutionChart(
    containerId,
    title,
    data
) {

    const container =
        getElement(
            containerId
        );


    if (!container) {

        return;

    }


    if (
        resolutionCharts[
            containerId
        ]
    ) {

        resolutionCharts[
            containerId
        ].destroy();


        resolutionCharts[
            containerId
        ] = null;

    }


    if (
        typeof Chart ===
        "undefined"
    ) {

        container.innerHTML =
            `<p>Chart library could not be loaded.</p>`;

        return;

    }


    if (
        !data.length
    ) {

        renderEmptyChart(
            containerId,
            "No resolution data available."
        );

        return;

    }


    container.innerHTML =
        `<canvas id="${containerId}-canvas"></canvas>`;


    const canvas =
        getElement(
            `${containerId}-canvas`
        );


    resolutionCharts[
        containerId
    ] =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {

                    labels:
                        data.map(
                            item =>
                                item.label
                        ),

                    datasets: [
                        {
                            label:
                                "Average Resolution (hours)",

                            data:
                                data.map(
                                    item =>
                                        Number(
                                            item.value.toFixed(
                                                2
                                            )
                                        )
                                )
                        }
                    ]
                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display:
                                true
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    context => {

                                        const item =
                                            data[
                                                context.dataIndex
                                            ];


                                        return ` ${item.value.toFixed(
                                            2
                                        )} hrs (${item.count} tickets)`;

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
                                    "Hours"

                            }

                        }

                    }

                }

            }
        );
}


function renderEmptyChart(
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


    if (
        resolutionCharts[
            containerId
        ]
    ) {

        resolutionCharts[
            containerId
        ].destroy();


        resolutionCharts[
            containerId
        ] = null;

    }


    container.innerHTML = `
        <div class="empty-chart-message">
            ${escapeHtml(message)}
        </div>
    `;
}


/* =========================================================
   FILTERED STATISTICS
========================================================= */

function updateFilteredStats() {

    const filtered =
        getFilteredTickets();


    /*
     * Optional elements.
     */

    if (
        !ticketData.length
    ) {

        return;

    }


    setText(
        "filtered-ticket-count",
        formatNumber(
            filtered.length,
            0
        )
    );


    const satisfactionValues =
        filtered
            .map(
                ticket =>
                    toNumber(
                        getFirstExisting(
                            ticket,
                            [
                                "Customer Satisfaction Rating",
                                "customer_satisfaction_rating",
                                "satisfaction",
                                "rating"
                            ],
                            null
                        )
                    )
            )
            .filter(
                value =>
                    value !== null
            );


    const resolutionValues =
        filtered
            .map(
                ticket =>
                    toNumber(
                        getFirstExisting(
                            ticket,
                            [
                                "Time to Resolution",
                                "time_to_resolution",
                                "resolution_time",
                                "resolution"
                            ],
                            null
                        )
                    )
            )
            .filter(
                value =>
                    value !== null
            );


    const avgSatisfaction =
        average(
            satisfactionValues
        );


    const avgResolution =
        average(
            resolutionValues
        );


    setText(
        "filtered-average-satisfaction",
        avgSatisfaction === null
            ? "N/A"
            : `${formatNumber(
                avgSatisfaction,
                2
            )}/5`
    );


    setText(
        "filtered-average-resolution",
        avgResolution === null
            ? "N/A"
            : `${formatNumber(
                avgResolution,
                2
            )} hrs`
    );


    setText(
        "filtered-results-count",
        `${formatNumber(
            filtered.length,
            0
        )} matching tickets`
    );
}


function average(
    values
) {

    if (
        !values.length
    ) {

        return null;

    }


    return values.reduce(
        (
            sum,
            value
        ) =>
            sum + value,
        0
    ) / values.length;
}


function resetAllFilters() {

    const filterIds =
        [
            "priority-filter",
            "type-filter",
            "channel-filter",
            "segment-filter-main"
        ];


    filterIds.forEach(
        id => {

            const element =
                getElement(id);


            if (element) {

                element.value =
                    "";

            }

        }
    );


    updateResolutionCharts();

    updateFilteredStats();
}


/* =========================================================
   MESSAGES
========================================================= */

function setInitialLoadingState() {

    [
        "total-tickets",
        "average-satisfaction",
        "average-resolution",
        "customer-segments",
        "low-satisfaction",
        "satisfied-customers",
        "low-satisfaction-rate",
        "model-accuracy"
    ].forEach(
        id => {

            const element =
                getElement(id);


            if (
                element &&
                !element.textContent.trim()
            ) {

                element.textContent =
                    "Loading...";

            }

        }
    );
}


function showTicketDataWarning() {

    const existing =
        getElement(
            "ticket-data-warning"
        );


    if (existing) {

        existing.innerHTML = `
            <strong>Interactive ticket filtering is temporarily unavailable.</strong>
            Please verify that <code>ticket_data.json</code> is present in the repository root.
        `;


        existing.style.display =
            "block";

    }


    console.warn(
        "SupportIQ: ticket_data.json could not be loaded. " +
        "Resolution filters require this file."
    );
}

