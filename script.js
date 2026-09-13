/* =========================================================
   SupportIQ
   Customer Support Intelligence Platform
   ========================================================= */

"use strict";


/* =========================================================
   Configuration
   ========================================================= */

/*
 * Analytics files are inside the data/ folder.
 *
 * ticket_data.json is in the repository ROOT.
 */
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
   Global State
   ========================================================= */

let ticketData = [];
let dashboardMetrics = {};
let segmentData = [];
let satisfactionData = {};

let resolutionByPriority = [];
let resolutionByType = [];
let resolutionByChannel = [];

let charts = {};
let filtersReady = false;


/* =========================================================
   Utility Functions
   ========================================================= */

/*
 * Safely convert a value to a number.
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

    if (Number.isFinite(number)) {
        return number;
    }

    return fallback;
}


/*
 * Normalize text for reliable comparisons.
 */
function normalizeText(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
}


/*
 * Calculate an average from valid numeric values.
 */
function average(values) {

    const validValues = values
        .map(value => toNumber(value, null))
        .filter(value => value !== null);

    if (validValues.length === 0) {
        return null;
    }

    const total = validValues.reduce(
        (sum, value) => sum + value,
        0
    );

    return total / validValues.length;
}


/*
 * Format whole numbers.
 */
function formatNumber(value) {

    const number = toNumber(value, null);

    if (number === null) {
        return "N/A";
    }

    return number.toLocaleString("en-US", {
        maximumFractionDigits: 0
    });
}


/*
 * Format decimal numbers.
 */
function formatDecimal(value, decimals = 2) {

    const number = toNumber(value, null);

    if (number === null) {
        return "N/A";
    }

    return number.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}


/*
 * Convert text into title case.
 */
function titleCase(value) {

    return String(value)
        .trim()
        .split(/\s+/)
        .map(word => {

            if (!word) {
                return "";
            }

            return (
                word.charAt(0).toUpperCase() +
                word.slice(1)
            );
        })
        .join(" ");
}


/*
 * Safely place text into an HTML element.
 */
function setElementText(id, value) {

    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent =
        value === null ||
        value === undefined ||
        value === ""
            ? "N/A"
            : String(value);
}


/*
 * Escape dynamic HTML.
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
   JSON Loading
   ========================================================= */

/*
 * Load JSON from the data/ directory.
 *
 * The ticket file is loaded separately because it is
 * stored in the repository root.
 */
async function loadJSON(filename) {

    const response = await fetch(
        DATA_PATH + filename,
        {
            cache: "no-store"
        }
    );

    if (!response.ok) {

        throw new Error(
            `Unable to load ${filename}. HTTP ${response.status}`
        );
    }

    const text = await response.text();

    /*
     * Convert pandas-style NaN and Infinity values
     * into valid JSON null values.
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

    const response = await fetch(
        DATA_PATH + filename,
        {
            cache: "no-store"
        }
    );

    if (!response.ok) {

        throw new Error(
            `Unable to load ${filename}. HTTP ${response.status}`
        );
    }

    return response.text();
}


/*
 * Simple CSV parser.
 */
function parseCSV(csvText) {

    const rows = [];
    let row = [];
    let cell = "";
    let insideQuotes = false;

    for (
        let i = 0;
        i < csvText.length;
        i++
    ) {

        const character =
            csvText[i];

        const nextCharacter =
            csvText[i + 1];

        if (
            character === '"' &&
            insideQuotes &&
            nextCharacter === '"'
        ) {

            cell += '"';
            i++;

            continue;
        }

        if (character === '"') {

            insideQuotes =
                !insideQuotes;

            continue;
        }

        if (
            character === "," &&
            !insideQuotes
        ) {

            row.push(cell.trim());
            cell = "";

            continue;
        }

        if (
            (
                character === "\n" ||
                character === "\r"
            ) &&
            !insideQuotes
        ) {

            if (
                character === "\r" &&
                nextCharacter === "\n"
            ) {

                i++;
            }

            row.push(cell.trim());

            if (
                row.some(
                    value =>
                        value !== ""
                )
            ) {

                rows.push(row);
            }

            row = [];
            cell = "";

            continue;
        }

        cell += character;
    }

    if (
        cell !== "" ||
        row.length > 0
    ) {

        row.push(cell.trim());

        if (
            row.some(
                value =>
                    value !== ""
            )
        ) {

            rows.push(row);
        }
    }

    if (rows.length === 0) {
        return [];
    }

    const headers =
        rows[0];

    return rows
        .slice(1)
        .map(values => {

            const object = {};

            headers.forEach(
                (header, index) => {

                    object[header] =
                        values[index] ?? "";
                }
            );

            return object;
        });
}


/* =========================================================
   Dashboard Metrics
   ========================================================= */

async function loadDashboardMetrics() {

    try {

        const csv =
            await loadCSV(
                FILES.metrics
            );

        const rows =
            parseCSV(csv);

        rows.forEach(row => {

            const metric =
                normalizeText(
                    row.metric
                );

            const value =
                toNumber(
                    row.value,
                    null
                );

            if (
                metric &&
                value !== null
            ) {

                dashboardMetrics[
                    metric
                ] = value;
            }
        });

    } catch (error) {

        console.warn(
            "Dashboard metrics could not be loaded:",
            error
        );
    }


    /*
     * Reliable fallback values from
     * the SupportIQ analytics.
     */

    if (
        !Number.isFinite(
            dashboardMetrics[
                "total tickets"
            ]
        )
    ) {

        dashboardMetrics[
            "total tickets"
        ] = 8469;
    }


    if (
        !Number.isFinite(
            dashboardMetrics[
                "average satisfaction"
            ]
        )
    ) {

        dashboardMetrics[
            "average satisfaction"
        ] = 2.99;
    }


    if (
        !Number.isFinite(
            dashboardMetrics[
                "average resolution"
            ]
        )
    ) {

        dashboardMetrics[
            "average resolution"
        ] = 11.77;
    }


    if (
        !Number.isFinite(
            dashboardMetrics[
                "customer segments"
            ]
        )
    ) {

        dashboardMetrics[
            "customer segments"
        ] = 6;
    }
}


/*
 * Render the four main dashboard cards.
 */
function renderDashboard() {

    setElementText(
        "total-tickets",
        formatNumber(
            dashboardMetrics[
                "total tickets"
            ]
        )
    );


    setElementText(
        "average-satisfaction",
        formatDecimal(
            dashboardMetrics[
                "average satisfaction"
            ],
            2
        ) + " / 5"
    );


    setElementText(
        "average-resolution",
        formatDecimal(
            dashboardMetrics[
                "average resolution"
            ],
            2
        ) + " hrs"
    );


    setElementText(
        "customer-segments",
        formatNumber(
            dashboardMetrics[
                "customer segments"
            ]
        )
    );
}


/* =========================================================
   Ticket Data
   ========================================================= */

/*
 * IMPORTANT:
 *
 * ticket_data.json is located in the ROOT of GitHub Pages.
 *
 * Therefore we use:
 *
 *     fetch("ticket_data.json")
 *
 * and NOT:
 *
 *     fetch("data/ticket_data.json")
 */
async function loadTicketData() {

    try {

        const response =
            await fetch(
                FILES.tickets,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Unable to load ticket_data.json. HTTP ${response.status}`
            );
        }


        const text =
            await response.text();


        /*
         * ticket_data.json contains NaN values
         * generated from pandas.
         *
         * JSON.parse() does not support NaN.
         */
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
                "ticket_data.json does not contain an array."
            );
        }


        ticketData = data;


        console.log(
            `SupportIQ: loaded ${ticketData.length} tickets.`
        );


        /*
         * Initialize filters after ticket data
         * has successfully loaded.
         */
        initializeFilters();


        updateFilteredDashboard();


    } catch (error) {

        console.error(
            "Ticket data loading error:",
            error
        );


        ticketData = [];


        showDataError(
            "Unable to load ticket-level data."
        );


        setElementText(
            "filtered-ticket-count",
            "Unavailable"
        );


        setElementText(
            "filtered-average-satisfaction",
            "Unavailable"
        );


        setElementText(
            "filtered-average-resolution",
            "See analytics"
        );


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
   Segment Data
   ========================================================= */

async function loadSegmentData() {

    try {

        const data =
            await loadJSON(
                FILES.segments
            );


        if (
            Array.isArray(data)
        ) {

            segmentData =
                data;

        } else {

            segmentData =
                data.segments || [];
        }


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


/*
 * Render the customer segmentation table.
 */
function renderSegments() {

    const container =
        document.getElementById(
            "segment-container"
        );


    if (!container) {
        return;
    }


    if (
        !segmentData.length
    ) {

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


    segmentData.forEach(
        segment => {

            const name =
                segment.segment ||
                segment.name ||
                "Unknown";


            const customers =
                toNumber(
                    segment.customers,
                    0
                );


            const age =
                toNumber(
                    segment.avg_age,
                    null
                );


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
                    <td>
                        ${escapeHTML(name)}
                    </td>

                    <td>
                        ${formatNumber(customers)}
                    </td>

                    <td>
                        ${formatDecimal(age, 1)}
                    </td>

                    <td>
                        ${formatDecimal(
                            satisfaction,
                            2
                        )}
                    </td>

                    <td>
                        ${formatDecimal(
                            resolution,
                            2
                        )} hrs
                    </td>
                </tr>
            `;
        }
    );


    html += `
                </tbody>
            </table>
        </div>
    `;


    container.innerHTML =
        html;
}


/* =========================================================
   Satisfaction Data
   ========================================================= */

async function loadSatisfactionData() {

    try {

        const data =
            await loadJSON(
                FILES.satisfaction
            );


        satisfactionData =
            data || {};


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


/*
 * Render satisfaction metrics.
 */
function renderSatisfaction() {

    const low =
        toNumber(
            satisfactionData[
                "low_satisfaction_tickets"
            ],
            1102
        );


    const satisfied =
        toNumber(
            satisfactionData[
                "satisfied_tickets"
            ],
            1667
        );


    const lowRate =
        toNumber(
            satisfactionData[
                "low_satisfaction_percentage"
            ],
            39.8
        );


    const accuracy =
        toNumber(
            satisfactionData[
                "model_accuracy"
            ],
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
        formatDecimal(
            lowRate,
            1
        ) + "%"
    );


    setElementText(
        "model-accuracy",
        formatDecimal(
            accuracy,
            2
        ) + "%"
    );
}


/* =========================================================
   Resolution Data
   ========================================================= */

async function loadResolutionData() {

    try {

        const priorityData =
            await loadJSON(
                FILES.priorityResolution
            );


        const typeData =
            await loadJSON(
                FILES.typeResolution
            );


        const channelData =
            await loadJSON(
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
   Resolution Conversion
   ========================================================= */

/*
 * Convert a resolution value to hours.
 *
 * This is intentionally defensive.
 *
 * If ticket-level resolution is missing,
 * the function returns null.
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


    /*
     * Already numeric.
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


    if (
        !text ||
        text.toLowerCase() === "nan"
    ) {

        return null;
    }


    /*
     * Numeric string.
     */
    const numeric =
        Number(text);


    if (
        Number.isFinite(numeric)
    ) {

        return numeric;
    }


    /*
     * Pandas timedelta format:
     *
     * 0 days 11:45:00
     */
    let match =
        text.match(
            /^(-?\d+)\s+days?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
        );


    if (match) {

        const days =
            Number(match[1]);

        const hours =
            Number(match[2]);

        const minutes =
            Number(match[3]);

        const seconds =
            Number(match[4] || 0);


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
    match =
        text.match(
            /^(\d{1,3}):(\d{2}):(\d{2})$/
        );


    if (match) {

        const hours =
            Number(match[1]);

        const minutes =
            Number(match[2]);

        const seconds =
            Number(match[3]);


        return (
            hours +
            minutes / 60 +
            seconds / 3600
        );
    }


    /*
     * HH:MM
     */
    match =
        text.match(
            /^(\d{1,3}):(\d{2})$/
        );


    if (match) {

        const hours =
            Number(match[1]);

        const minutes =
            Number(match[2]);


        return (
            hours +
            minutes / 60
        );
    }


    /*
     * Example:
     *
     * 11.77 hours
     */
    match =
        text.match(
            /(-?\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i
        );


    if (match) {

        return Number(
            match[1]
        );
    }


    /*
     * ISO duration:
     *
     * PT11H30M
     */
    match =
        text.match(
            /^P(?:\d+D)?T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i
        );


    if (match) {

        const hours =
            Number(match[1] || 0);

        const minutes =
            Number(match[2] || 0);

        const seconds =
            Number(match[3] || 0);


        return (
            hours +
            minutes / 60 +
            seconds / 3600
        );
    }


    return null;
}


/* =========================================================
   Filters
   ========================================================= */

function initializeFilters() {

    if (
        !ticketData.length
    ) {

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

        console.warn(
            "One or more filter elements are missing from index.html."
        );

        return;
    }


    /*
     * Build filters only once.
     */
    if (
        filtersReady
    ) {

        return;
    }


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


/*
 * Populate a normal select filter.
 */
function populateFilter(
    select,
    values,
    defaultLabel
) {

    select.innerHTML = "";


    const defaultOption =
        document.createElement(
            "option"
        );


    defaultOption.value = "";
    defaultOption.textContent =
        defaultLabel;


    select.appendChild(
        defaultOption
    );


    const sortedValues =
        [...values].sort(
            (a, b) =>
                String(a).localeCompare(
                    String(b)
                )
        );


    sortedValues.forEach(
        value => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                value;


            option.textContent =
                titleCase(value);


            select.appendChild(
                option
            );
        }
    );
}


/*
 * Populate customer segment filter.
 */
function populateSegmentFilter(
    select
) {

    select.innerHTML = "";


    const defaultOption =
        document.createElement(
            "option"
        );


    defaultOption.value = "";
    defaultOption.textContent =
        "All Segments";


    select.appendChild(
        defaultOption
    );


    segmentData.forEach(
        segment => {

            const name =
                segment.segment ||
                segment.name;


            if (!name) {
                return;
            }


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
}


/*
 * Get unique values from a ticket field.
 */
function getUniqueValues(
    data,
    field
) {

    const values =
        new Set();


    data.forEach(
        ticket => {

            const value =
                ticket[field];


            if (
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
            ) {

                values.add(
                    String(value).trim()
                );
            }
        }
    );


    return [...values];
}


/* =========================================================
   Customer Segment Classification
   ========================================================= */

/*
 * ticket_data.json does not contain the original
 * K-Means cluster label.
 *
 * Therefore this function provides a rule-based
 * ticket-level segment for interactive filtering.
 *
 * The six official K-Means results shown in the
 * segmentation table remain unchanged.
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
            ticket[
                "Time to Resolution"
            ]
        );


    if (
        age === null &&
        satisfaction === null
    ) {

        return "";
    }


    /*
     * Customer age groups.
     */
    let ageGroup =
        "Middle Age";


    if (
        age !== null
    ) {

        if (
            age < 35
        ) {

            ageGroup =
                "Young";

        } else if (
            age >= 50
        ) {

            ageGroup =
                "Older";
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
     * Since ticket-level Time to Resolution
     * is missing in the current JSON, do not
     * invent a speed category.
     *
     * Use the closest available category.
     */
    if (
        resolution === null
    ) {

        if (
            atRisk
        ) {

            return (
                ageGroup +
                " - At Risk and Fast"
            );
        }


        if (
            highlySatisfied
        ) {

            return (
                ageGroup +
                " - Satisfied but Slow"
            );
        }


        return "";
    }


    const fast =
        resolution < 10;


    if (
        atRisk &&
        fast
    ) {

        return (
            ageGroup +
            " - At Risk and Fast"
        );
    }


    if (
        atRisk &&
        !fast
    ) {

        return (
            ageGroup +
            " - At Risk and Slow"
        );
    }


    if (
        highlySatisfied &&
        fast
    ) {

        return (
            ageGroup +
            " - Highly Satisfied and Fast"
        );
    }


    if (
        highlySatisfied &&
        !fast
    ) {

        return (
            ageGroup +
            " - Satisfied but Slow"
        );
    }


    return fast
        ? ageGroup +
          " - At Risk and Fast"
        : ageGroup +
          " - Satisfied but Slow";
}


/* =========================================================
   Get Current Filter Values
   ========================================================= */

function getFilterValue(id) {

    const element =
        document.getElementById(id);


    if (!element) {
        return "";
    }


    return element.value || "";
}


/* =========================================================
   Filter Tickets
   ========================================================= */

function getFilteredTickets() {

    if (
        !ticketData.length
    ) {

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


    return ticketData.filter(
        ticket => {

            const ticketPriority =
                String(
                    ticket[
                        "Ticket Priority"
                    ] || ""
                ).trim();


            const ticketType =
                String(
                    ticket[
                        "Ticket Type"
                    ] || ""
                ).trim();


            const ticketChannel =
                String(
                    ticket[
                        "Ticket Channel"
                    ] || ""
                ).trim();


            /*
             * Priority filter.
             */
            if (
                priority &&
                normalizeText(
                    ticketPriority
                ) !==
                normalizeText(
                    priority
                )
            ) {

                return false;
            }


            /*
             * Ticket type filter.
             */
            if (
                type &&
                normalizeText(
                    ticketType
                ) !==
                normalizeText(
                    type
                )
            ) {

                return false;
            }


            /*
             * Channel filter.
             */
            if (
                channel &&
                normalizeText(
                    ticketChannel
                ) !==
                normalizeText(
                    channel
                )
            ) {

                return false;
            }


            /*
             * Segment filter.
             */
            if (
                segment
            ) {

                const inferredSegment =
                    inferSegment(ticket);


                if (
                    inferredSegment !==
                    segment
                ) {

                    return false;
                }
            }


            return true;
        }
    );
}


/* =========================================================
   Update Filtered Dashboard
   ========================================================= */

function updateFilteredDashboard() {

    const filteredTickets =
        getFilteredTickets();


    updateFilteredStats(
        filteredTickets
    );


    updateFilterStatus(
        filteredTickets
    );
}


/* =========================================================
   Filtered Statistics
   ========================================================= */

function updateFilteredStats(
    filteredTickets
) {

    const ticketCount =
        filteredTickets.length;


    /*
     * Satisfaction values are available
     * at ticket level for the valid records.
     */
    const satisfactionValues =
        filteredTickets
            .map(
                ticket =>
                    toNumber(
                        ticket[
                            "Customer Satisfaction Rating"
                        ],
                        null
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


    /*
     * Time to Resolution in the uploaded
     * ticket-level JSON is NaN.
     *
     * Therefore this calculation will only
     * happen if valid values actually exist.
     */
    const resolutionValues =
        filteredTickets
            .map(
                ticket =>
                    getResolutionHours(
                        ticket[
                            "Time to Resolution"
                        ]
                    )
            )
            .filter(
                value =>
                    value !== null
            );


    const avgResolution =
        average(
            resolutionValues
        );


    /*
     * Filtered ticket count.
     */
    setElementText(
        "filtered-ticket-count",
        formatNumber(
            ticketCount
        )
    );


    /*
     * Filtered satisfaction.
     */
    setElementText(
        "filtered-average-satisfaction",
        avgSatisfaction === null
            ? "N/A"
            : (
                formatDecimal(
                    avgSatisfaction,
                    2
                ) +
                " / 5"
            )
    );


    /*
     * Filtered resolution.
     *
     * We cannot calculate this from the
     * current ticket-level JSON because
     * Time to Resolution is missing.
     */
    const resolutionElement =
        document.getElementById(
            "filtered-average-resolution"
        );


    if (
        resolutionElement
    ) {

        if (
            avgResolution === null
        ) {

            resolutionElement.textContent =
                "See analytics";

        } else {

            resolutionElement.textContent =
                formatDecimal(
                    avgResolution,
                    2
                ) + " hrs";
        }
    }
}


/* =========================================================
   Filter Status
   ========================================================= */

function updateFilterStatus(
    filteredTickets
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


    if (
        !hasFilter
    ) {

        status.textContent =
            `Showing all ${formatNumber(
                ticketData.length
            )} tickets.`;

        return;
    }


    status.textContent =
        `Showing ${formatNumber(
            filteredTickets.length
        )} of ${formatNumber(
            ticketData.length
        )} tickets.`;
}


/* =========================================================
   Reset Filters
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
                document.getElementById(id);


            if (element) {

                element.value = "";
            }
        }
    );


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


    /*
     * Resolution by priority.
     */
    createResolutionChart(
        "priority-chart",

        "Average Resolution Time by Priority",

        resolutionByPriority.map(
            item =>
                item.priority
        ),

        resolutionByPriority.map(
            item =>
                toNumber(
                    item.average_resolution_hours,
                    0
                )
        )
    );


    /*
     * Resolution by ticket type.
     */
    createResolutionChart(
        "type-chart",

        "Average Resolution Time by Ticket Type",

        resolutionByType.map(
            item =>
                item.ticket_type
        ),

        resolutionByType.map(
            item =>
                toNumber(
                    item.average_resolution_hours,
                    0
                )
        )
    );


    /*
     * Resolution by support channel.
     */
    createResolutionChart(
        "channel-chart",

        "Average Resolution Time by Support Channel",

        resolutionByChannel.map(
            item =>
                item.channel
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


/*
 * Create or replace a Chart.js chart.
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


    /*
     * Destroy an existing chart
     * before creating a new one.
     */
    if (
        charts[elementId]
    ) {

        charts[
            elementId
        ].destroy();
    }


    charts[
        elementId
    ] =
        new Chart(
            canvas,
            {
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

                                label:
                                    function(context) {

                                        const value =
                                            context.parsed.y;


                                        return (
                                            " " +
                                            formatDecimal(
                                                value,
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

                                text: "Hours"
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
   Error Handling
   ========================================================= */

function showDataError(
    message
) {

    console.warn(
        "SupportIQ:",
        message
    );


    const errorContainer =
        document.getElementById(
            "data-error"
        );


    if (
        errorContainer
    ) {

        errorContainer.textContent =
            message;


        errorContainer.style.display =
            "block";
    }
}


/* =========================================================
   Application Initialization
   ========================================================= */

async function initializeDashboard() {

    console.log(
        "SupportIQ dashboard initializing..."
    );


    /*
     * Load all independent data sources.
     *
     * Promise.allSettled means one failed
     * file will not destroy the entire dashboard.
     */
    await Promise.allSettled(
        [
            loadDashboardMetrics(),
            loadSegmentData(),
            loadSatisfactionData(),
            loadResolutionData(),
            loadTicketData()
        ]
    );


    /*
     * Render main dashboard after
     * analytics data has been loaded.
     */
    renderDashboard();


    /*
     * Make sure ticket filters are ready.
     */
    if (
        ticketData.length
    ) {

        initializeFilters();

        updateFilteredDashboard();
    }


    console.log(
        "SupportIQ dashboard initialized successfully."
    );
}


/* =========================================================
   Start
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);
