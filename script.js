const API_BASE_URL = "https://supportiq-api-pg9k.onrender.com";

const DATA_FILES = {
    metrics: "./data/dashboard_metrics.csv",
    segments: "./data/segment_dashboard.json",
    satisfaction: "./data/satisfaction_dashboard.json",
    ticketData: "./ticket_data.json",
    ticketSegmentMapping: "./ticket_segment_mapping.json",
    resolutionPriority: "./data/resolution_by_priority.json",
    resolutionType: "./data/resolution_by_type.json",
    resolutionChannel: "./data/resolution_by_channel.json"
};

let dashboardMetrics = {};
let segmentData = [];
let satisfactionData = {};
let ticketData = [];
let ticketSegmentMap = new Map();

let resolutionData = {
    priority: [],
    type: [],
    channel: []
};

let currentFilteredTickets = [];
let charts = {};
let initialized = false;
let resizeTimer = null;


/* =========================================================
   BASIC HELPERS
========================================================= */

function byId(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const el = byId(id);

    if (el) {
        el.textContent = value;
    }
}

function formatNumber(value) {
    const n = Number(value);

    return Number.isFinite(n)
        ? n.toLocaleString()
        : "N/A";
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

function showDashboardStatus(
    message,
    type = "info"
) {
    const el =
        byId("dashboard-status");

    if (!el) {
        return;
    }

    el.textContent =
        message || "";

    el.className =
        `dashboard-status ${type}`.trim();
}

function clearDashboardStatus() {
    const el =
        byId("dashboard-status");

    if (!el) {
        return;
    }

    el.textContent = "";

    el.className =
        "dashboard-status";
}


/* =========================================================
   DATA LOADERS
========================================================= */

async function fetchJSON(url) {
    const response =
        await fetch(
            url,
            {
                cache: "no-store"
            }
        );

    if (!response.ok) {
        throw new Error(
            `${response.status} ${response.statusText}`
        );
    }

    return response.json();
}

async function fetchText(url) {
    const response =
        await fetch(
            url,
            {
                cache: "no-store"
            }
        );

    if (!response.ok) {
        throw new Error(
            `${response.status} ${response.statusText}`
        );
    }

    return response.text();
}


/* =========================================================
   CSV PARSING
========================================================= */

function parseCSVField(value) {
    return String(value ?? "")
        .trim()
        .replace(/^"|"$/g, "")
        .replace(/""/g, '"');
}

function metricKey(value) {
    return parseCSVField(value)
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            "_"
        )
        .replace(
            /^_+|_+$/g,
            "");
}

function parseMetricsCSV(csvText) {
    const result = {};

    const lines =
        String(csvText || "")
            .split(/\r?\n/)
            .map(
                line =>
                    line.trim()
            )
            .filter(Boolean);

    if (lines.length < 2) {
        return result;
    }

    for (
        let i = 1;
        i < lines.length;
        i++
    ) {
        const comma =
            lines[i].indexOf(",");

        if (comma === -1) {
            continue;
        }

        const key =
            parseCSVField(
                lines[i].slice(
                    0,
                    comma
                )
            );

        const raw =
            parseCSVField(
                lines[i].slice(
                    comma + 1
                )
            );

        if (!key) {
            continue;
        }

        const number =
            Number(
                raw.replace(
                    /,/g,
                    ""
                )
            );

        const value =
            raw !== "" &&
            Number.isFinite(number)
                ? number
                : raw;

        result[key] =
            value;

        result[
            metricKey(key)
        ] =
            value;
    }

    return result;
}


/* =========================================================
   GENERIC DATA HELPERS
========================================================= */

function unwrapArray(
    json,
    keys = []
) {
    if (Array.isArray(json)) {
        return json;
    }

    for (
        const key of keys
    ) {
        if (
            json &&
            Array.isArray(
                json[key]
            )
        ) {
            return json[key];
        }
    }

    if (
        json &&
        Array.isArray(
            json.data
        )
    ) {
        return json.data;
    }

    return [];
}

function getFirst(
    object,
    keys,
    fallback = null
) {
    if (
        !object ||
        typeof object !==
            "object"
    ) {
        return fallback;
    }

    for (
        const key of keys
    ) {
        if (
            object[key] !==
                undefined &&
            object[key] !==
                null &&
            object[key] !== ""
        ) {
            return object[key];
        }
    }

    return fallback;
}


/* =========================================================
   TICKET FIELD HELPERS
========================================================= */

function getTicketId(ticket) {
    return getFirst(
        ticket,
        [
            "Ticket ID",
            "ticket_id",
            "TicketID",
            "id"
        ]
    );
}

function getCustomerEmail(ticket) {
    return getFirst(
        ticket,
        [
            "Customer Email",
            "customer_email",
            "CustomerEmail",
            "email"
        ]
    );
}

function getCustomerAge(ticket) {
    const value =
        Number(
            getFirst(
                ticket,
                [
                    "Customer Age",
                    "customer_age",
                    "Age",
                    "age"
                ]
            )
        );

    return Number.isFinite(
        value
    )
        ? value
        : null;
}


/*
 * IMPORTANT:
 *
 * null satisfaction values remain null.
 * They are never treated as zero.
 */

function getSatisfaction(ticket) {
    const raw =
        getFirst(
            ticket,
            [
                "Customer Satisfaction Rating",
                "customer_satisfaction_rating",
                "Satisfaction Rating",
                "satisfaction"
            ]
        );

    if (
        raw === null ||
        raw === undefined ||
        raw === ""
    ) {
        return null;
    }

    const value =
        Number(raw);

    return Number.isFinite(
        value
    )
        ? value
        : null;
}

function getPriority(ticket) {
    return getFirst(
        ticket,
        [
            "Ticket Priority",
            "ticket_priority",
            "Priority",
            "priority"
        ]
    );
}

function getType(ticket) {
    return getFirst(
        ticket,
        [
            "Ticket Type",
            "ticket_type",
            "Type",
            "type"
        ]
    );
}

function getChannel(ticket) {
    return getFirst(
        ticket,
        [
            "Ticket Channel",
            "ticket_channel",
            "Support Channel",
            "support_channel",
            "Channel",
            "channel"
        ]
    );
}

function getSubject(ticket) {
    return getFirst(
        ticket,
        [
            "Ticket Subject",
            "ticket_subject",
            "Subject",
            "subject"
        ],
        "Support ticket"
    );
}

function getDescription(ticket) {
    return getFirst(
        ticket,
        [
            "Ticket Description",
            "ticket_description",
            "Description",
            "description"
        ],
        ""
    );
}

function getStatus(ticket) {
    return getFirst(
        ticket,
        [
            "Ticket Status",
            "ticket_status",
            "Status",
            "status"
        ]
    );
}


/* =========================================================
   SEGMENT HELPERS
========================================================= */

function normalizeSegmentName(
    segment
) {
    if (
        segment === null ||
        segment === undefined ||
        segment === ""
    ) {
        return null;
    }

    return String(segment)
        .trim();
}

function makeTicketKey(
    ticketId
) {
    if (
        ticketId === null ||
        ticketId === undefined ||
        ticketId === ""
    ) {
        return null;
    }

    return String(ticketId)
        .trim();
}

function getTicketSegment(
    ticket
) {
    const key =
        makeTicketKey(
            getTicketId(ticket)
        );

    return key
        ? (
            ticketSegmentMap.get(
                key
            ) || null
        )
        : null;
}


/* =========================================================
   DASHBOARD METRICS
========================================================= */

async function loadDashboardMetrics() {

    const fallback = {
        totalTickets: 8469,
        averageSatisfaction: 2.99,
        averageResolution: 11.77,
        customerSegments: 6
    };

    try {

        const text =
            await fetchText(
                DATA_FILES.metrics
            );

        dashboardMetrics =
            parseMetricsCSV(
                text
            );

        const getMetric =
            (
                keys,
                fallbackValue
            ) => {

                for (
                    const key of keys
                ) {

                    const normalized =
                        metricKey(key);

                    const value =
                        dashboardMetrics[key] ??
                        dashboardMetrics[
                            normalized
                        ];

                    if (
                        value !==
                            undefined &&
                        value !==
                            null &&
                        value !== ""
                    ) {

                        const number =
                            Number(
                                String(
                                    value
                                ).replace(
                                    /,/g,
                                    ""
                                )
                            );

                        return Number.isFinite(
                            number
                        )
                            ? number
                            : value;
                    }
                }

                return fallbackValue;
            };

        const totalTickets =
            getMetric(
                [
                    "Total Tickets",
                    "total_tickets",
                    "totalTickets",
                    "total"
                ],
                fallback.totalTickets
            );

        const averageSatisfaction =
            getMetric(
                [
                    "Average Satisfaction",
                    "average_satisfaction",
                    "avg_satisfaction",
                    "average satisfaction"
                ],
                fallback.averageSatisfaction
            );

        const averageResolution =
            getMetric(
                [
                    "Average Resolution Time",
                    "average_resolution_time",
                    "average_resolution",
                    "avg_resolution",
                    "average resolution time"
                ],
                fallback.averageResolution
            );

        const customerSegments =
            getMetric(
                [
                    "Customer Segments",
                    "customer_segments",
                    "segments",
                    "customer segments"
                ],
                fallback.customerSegments
            );

        setText(
            "total-tickets",
            formatNumber(
                totalTickets
            )
        );

        setText(
            "average-satisfaction",
            `${Number(
                averageSatisfaction
            ).toFixed(2)} / 5`
        );

        setText(
            "average-resolution",
            `${Number(
                averageResolution
            ).toFixed(2)} hrs`
        );

        setText(
            "customer-segments",
            formatNumber(
                customerSegments
            )
        );

    } catch (error) {

        console.error(
            "Metrics load failed:",
            error
        );

        setText(
            "total-tickets",
            formatNumber(
                fallback.totalTickets
            )
        );

        setText(
            "average-satisfaction",
            `${fallback.averageSatisfaction.toFixed(
                2
            )} / 5`
        );

        setText(
            "average-resolution",
            `${fallback.averageResolution.toFixed(
                2
            )} hrs`
        );

        setText(
            "customer-segments",
            formatNumber(
                fallback.customerSegments
            )
        );
    }
}


/* =========================================================
   CUSTOMER SEGMENTATION
========================================================= */

async function loadSegmentData() {

    try {

        const json =
            await fetchJSON(
                DATA_FILES.segments
            );

        segmentData =
            unwrapArray(
                json,
                [
                    "segments"
                ]
            );

        renderSegmentSection();

        renderSegmentDistribution();

        populateSegmentFilter();

    } catch (error) {

        console.error(
            "Segment data load failed:",
            error
        );

        segmentData = [];

        const container =
            byId(
                "segment-container"
            );

        if (container) {

            container.innerHTML =
                `
                <div class="dashboard-status error">
                    Customer segment data could not be loaded.
                </div>
                `;
        }
    }
}

function getSegmentLabel(
    segment,
    index = 0
) {
    return normalizeSegmentName(
        getFirst(
            segment,
            [
                "segment",
                "name",
                "segment_name"
            ],
            `Segment ${index + 1}`
        )
    );
}

function getSegmentCount(
    segment
) {

    const value =
        getFirst(
            segment,
            [
                "customers",
                "Customers",
                "customer_count",
                "Customer Count",
                "customerCount",
                "count",
                "ticket_count",
                "size",
                "total"
            ],
            0
        );

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }

    const n =
        Number(
            String(value)
                .replace(
                    /,/g,
                    ""
                )
        );

    return Number.isFinite(
        n
    )
        ? n
        : 0;
}

function renderSegmentSection() {

    const container =
        byId(
            "segment-container"
        );

    if (!container) {
        return;
    }

    if (
        !segmentData.length
    ) {

        container.innerHTML =
            `
            <div class="dashboard-status">
                No customer segment data available.
            </div>
            `;

        return;
    }

    container.innerHTML =
        segmentData
            .map(
                (
                    segment,
                    index
                ) => {

                    const name =
                        getSegmentLabel(
                            segment,
                            index
                        );

                    const description =
                        getFirst(
                            segment,
                            [
                                "description",
                                "profile",
                                "summary"
                            ],
                            "Customer segment identified through clustering analysis."
                        );

                    return `
                        <div class="insight-item">

                            <h4>
                                ${escapeHTML(
                                    name
                                )}
                            </h4>

                            <p>
                                ${escapeHTML(
                                    description
                                )}
                            </p>

                        </div>
                    `;
                }
            )
            .join("");
}

function renderSegmentDistribution() {

    const canvas =
        byId(
            "segment-distribution-chart"
        );

    const legend =
        byId(
            "segment-chart-legend"
        );

    if (
        !canvas ||
        typeof Chart ===
            "undefined"
    ) {
        return;
    }

    const labels =
        segmentData.map(
            (
                segment,
                index
            ) =>
                getSegmentLabel(
                    segment,
                    index
                )
        );

    let values =
        segmentData.map(
            getSegmentCount
        );

    /*
     * If the segment file contains
     * profile data but no counts,
     * calculate counts from the
     * ticket-to-segment mapping.
     */

    if (
        values.length &&
        values.every(
            value =>
                value === 0
        ) &&
        ticketSegmentMap.size > 0
    ) {

        const counts =
            new Map();

        for (
            const segment
                of ticketSegmentMap.values()
        ) {

            counts.set(
                segment,
                (
                    counts.get(
                        segment
                    ) || 0
                ) + 1
            );
        }

        values =
            labels.map(
                label =>
                    counts.get(
                        label
                    ) || 0
            );
    }

    if (
        charts.segmentDistribution
    ) {

        charts.segmentDistribution.destroy();
    }

    charts.segmentDistribution =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {
                    labels,

                    datasets: [
                        {
                            data:
                                values
                        }
                    ]
                },

                options: {
                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {
                        legend: {
                            display:
                                false
                        }
                    }
                }
            }
        );

    if (legend) {

        legend.innerHTML =
            labels
                .map(
                    (
                        label,
                        index
                    ) => `
                        <div class="legend-item">

                            <span class="legend-label">
                                ${escapeHTML(
                                    label
                                )}
                            </span>

                            <span class="legend-value">
                                ${formatNumber(
                                    values[
                                        index
                                    ]
                                )}
                            </span>

                        </div>
                    `
                )
                .join("");
    }
}


/* =========================================================
   SATISFACTION RISK
========================================================= */

async function loadSatisfactionData() {

    const fallback = {
        low: 1102,
        satisfied: 1667,
        risk: 39.8,
        accuracy: 59.75
    };

    try {

        const json =
            await fetchJSON(
                DATA_FILES.satisfaction
            );

        satisfactionData =
            json || {};

        const rows =
            unwrapArray(
                json,
                [
                    "satisfaction",
                    "results"
                ]
            );

        let low = null;
        let satisfied = null;

        rows.forEach(
            row => {

                const status =
                    String(
                        getFirst(
                            row,
                            [
                                "satisfaction_status",
                                "status",
                                "label",
                                "name"
                            ],
                            ""
                        )
                    ).toLowerCase();

                const count =
                    Number(
                        String(
                            getFirst(
                                row,
                                [
                                    "ticket_count",
                                    "count",
                                    "customers",
                                    "value"
                                ],
                                "0"
                            )
                        ).replace(
                            /,/g,
                            ""
                        )
                    );

                if (
                    !Number.isFinite(
                        count
                    )
                ) {
                    return;
                }

                if (
                    status.includes(
                        "low"
                    )
                ) {

                    low =
                        (low || 0) +
                        count;

                } else if (
                    status.includes(
                        "satisf"
                    )
                ) {

                    satisfied =
                        (satisfied || 0) +
                        count;
                }
            }
        );

        if (low === null) {

            const value =
                getFirst(
                    json,
                    [
                        "low_satisfaction",
                        "low_satisfaction_count",
                        "Low Satisfaction"
                    ]
                );

            low =
                value === null
                    ? fallback.low
                    : Number(value);
        }

        if (
            satisfied === null
        ) {

            const value =
                getFirst(
                    json,
                    [
                        "satisfied",
                        "satisfied_count",
                        "Satisfied"
                    ]
                );

            satisfied =
                value === null
                    ? fallback.satisfied
                    : Number(value);
        }

        if (
            !Number.isFinite(
                low
            )
        ) {
            low =
                fallback.low;
        }

        if (
            !Number.isFinite(
                satisfied
            )
        ) {
            satisfied =
                fallback.satisfied;
        }

        const total =
            low +
            satisfied;

        const risk =
            total > 0
                ? (
                    low /
                    total
                ) * 100
                : fallback.risk;

        const rawAccuracy =
            getFirst(
                json,
                [
                    "model_accuracy",
                    "accuracy",
                    "Model Accuracy"
                ]
            );

        let accuracy =
            rawAccuracy === null
                ? fallback.accuracy
                : Number(
                    rawAccuracy
                );

        if (
            !Number.isFinite(
                accuracy
            )
        ) {
            accuracy =
                fallback.accuracy;
        }

        setText(
            "low-satisfaction-count",
            formatNumber(
                low
            )
        );

        setText(
            "satisfied-count",
            formatNumber(
                satisfied
            )
        );

        setText(
            "satisfaction-risk-percentage",
            `${risk.toFixed(
                1
            )}%`
        );

        setText(
            "satisfaction-model-accuracy",
            `${accuracy.toFixed(
                2
            )}%`
        );

    } catch (error) {

        console.error(
            "Satisfaction data load failed:",
            error
        );

        setText(
            "low-satisfaction-count",
            formatNumber(
                fallback.low
            )
        );

        setText(
            "satisfied-count",
            formatNumber(
                fallback.satisfied
            )
        );

        setText(
            "satisfaction-risk-percentage",
            `${fallback.risk.toFixed(
                1
            )}%`
        );

        setText(
            "satisfaction-model-accuracy",
            `${fallback.accuracy.toFixed(
                2
            )}%`
        );
    }
}


/* =========================================================
   TICKET SEGMENT MAPPING
========================================================= */

async function loadTicketSegmentMapping() {

    try {

        const json =
            await fetchJSON(
                DATA_FILES.ticketSegmentMapping
            );

        const rows =
            unwrapArray(
                json,
                [
                    "mapping",
                    "segments"
                ]
            );

        ticketSegmentMap =
            new Map();

        rows.forEach(
            row => {

                const id =
                    getFirst(
                        row,
                        [
                            "Ticket ID",
                            "ticket_id",
                            "TicketID",
                            "id"
                        ]
                    );

                const segment =
                    normalizeSegmentName(
                        getFirst(
                            row,
                            [
                                "segment",
                                "Segment",
                                "segment_name"
                            ]
                        )
                    );

                const key =
                    makeTicketKey(
                        id
                    );

                if (
                    key &&
                    segment &&
                    !ticketSegmentMap.has(
                        key
                    )
                ) {

                    ticketSegmentMap.set(
                        key,
                        segment
                    );
                }
            }
        );

        console.log(
            `Loaded ${ticketSegmentMap.size} ticket-to-segment mappings.`
        );

    } catch (error) {

        console.warn(
            "Ticket segment mapping could not be loaded:",
            error
        );

        ticketSegmentMap =
            new Map();
    }
}


/* =========================================================
   RESOLUTION DATA
========================================================= */

async function loadResolutionData() {

    const sources = [
        [
            "priority",
            DATA_FILES.resolutionPriority
        ],
        [
            "type",
            DATA_FILES.resolutionType
        ],
        [
            "channel",
            DATA_FILES.resolutionChannel
        ]
    ];

    await Promise.all(
        sources.map(
            async (
                [
                    key,
                    url
                ]
            ) => {

                try {

                    const json =
                        await fetchJSON(
                            url
                        );

                    resolutionData[
                        key
                    ] =
                        unwrapArray(
                            json
                        );

                } catch (
                    error
                ) {

                    console.error(
                        `${key} resolution data load failed:`,
                        error
                    );

                    resolutionData[
                        key
                    ] = [];
                }
            }
        )
    );
}


/* =========================================================
   TICKET DATA
========================================================= */

async function loadTicketData() {

    try {

        const json =
            await fetchJSON(
                DATA_FILES.ticketData
            );

        ticketData =
            unwrapArray(
                json,
                [
                    "tickets"
                ]
            ).filter(
                ticket =>
                    ticket &&
                    typeof ticket ===
                        "object"
            );

        window.supportIQTickets =
            ticketData;

        console.log(
            `Loaded ${ticketData.length} support tickets.`
        );

        populateAllFilters();

        populateAITicketSelector();

        refreshFilteredDashboard();

    } catch (error) {

        console.error(
            "Ticket data load failed:",
            error
        );

        ticketData = [];

        window.supportIQTickets =
            [];

        const selector =
            byId(
                "ticket-selector"
            );

        if (selector) {

            selector.innerHTML =
                `
                <option value="">
                    Unable to load tickets
                </option>
                `;
        }

        const preview =
            byId(
                "selected-ticket-preview"
            );

        if (preview) {

            preview.innerHTML =
                `
                <div class="dashboard-status error">
                    Ticket data could not be loaded.
                </div>
                `;
        }
    }
}


/* =========================================================
   FILTERS
========================================================= */

function populateFilter(
    id,
    values
) {

    const select =
        byId(id);

    if (!select) {
        return;
    }

    const previous =
        select.value;

    select.innerHTML =
        `
        <option value="all">
            All
        </option>
        `;

    [
        ...new Set(
            values
                .map(
                    value =>
                        String(
                            value
                        )
                )
                .filter(Boolean)
        )
    ]
        .sort()
        .forEach(
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

    if (
        [
            ...select.options
        ].some(
            option =>
                option.value ===
                previous
        )
    ) {

        select.value =
            previous;
    }
}

function populateSegmentFilter() {

    const select =
        byId(
            "segment-filter"
        );

    if (!select) {
        return;
    }

    const previous =
        select.value;

    const segments =
        new Set(
            segmentData
                .map(
                    (
                        segment,
                        index
                    ) =>
                        getSegmentLabel(
                            segment,
                            index
                        )
                )
                .filter(Boolean)
        );

    select.innerHTML =
        `
        <option value="all">
            All
        </option>
        `;

    [
        ...segments
    ]
        .sort()
        .forEach(
            segment => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    segment;

                option.textContent =
                    segment;

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
                previous
        )
    ) {

        select.value =
            previous;
    }
}

function populateAllFilters() {

    populateFilter(
        "priority-filter",
        ticketData.map(
            getPriority
        )
    );

    populateFilter(
        "ticket-type-filter",
        ticketData.map(
            getType
        )
    );

    populateFilter(
        "channel-filter",
        ticketData.map(
            getChannel
        )
    );

    populateSegmentFilter();
}

function getActiveFilters() {

    return {

        priority:
            byId(
                "priority-filter"
            )?.value ||
            "all",

        type:
            byId(
                "ticket-type-filter"
            )?.value ||
            "all",

        channel:
            byId(
                "channel-filter"
            )?.value ||
            "all",

        segment:
            byId(
                "segment-filter"
            )?.value ||
            "all"
    };
}

function ticketMatchesFilters(
    ticket,
    filters
) {

    if (
        filters.priority !==
            "all" &&
        String(
            getPriority(
                ticket
            )
        ) !==
            String(
                filters.priority
            )
    ) {

        return false;
    }

    if (
        filters.type !==
            "all" &&
        String(
            getType(
                ticket
            )
        ) !==
            String(
                filters.type
            )
    ) {

        return false;
    }

    if (
        filters.channel !==
            "all" &&
        String(
            getChannel(
                ticket
            )
        ) !==
            String(
                filters.channel
            )
    ) {

        return false;
    }

    if (
        filters.segment !==
            "all" &&
        String(
            getTicketSegment(
                ticket
            )
        ) !==
            String(
                filters.segment
            )
    ) {

        return false;
    }

    return true;
}

function getFilteredTickets() {

    const filters =
        getActiveFilters();

    return ticketData.filter(
        ticket =>
            ticketMatchesFilters(
                ticket,
                filters
            )
    );
}


/* =========================================================
   FILTERED STATISTICS
========================================================= */

function calculateAverage(
    values
) {

    const numbers =
        values
            .map(Number)
            .filter(
                Number.isFinite
            );

    if (!numbers.length) {
        return null;
    }

    return (
        numbers.reduce(
            (
                sum,
                value
            ) =>
                sum + value,
            0
        ) /
        numbers.length
    );
}

function calculateFilteredSummary(
    tickets
) {

    /*
     * null ratings are excluded.
     * They are not treated as zero.
     */

    const rated =
        tickets
            .map(
                getSatisfaction
            )
            .filter(
                value =>
                    value !== null
            );

    const low =
        rated.filter(
            value =>
                value <= 2
        ).length;

    const satisfied =
        rated.filter(
            value =>
                value >= 4
        ).length;

    const average =
        calculateAverage(
            rated
        );

    return {

        total:
            tickets.length,

        average,

        low,

        satisfied,

        risk:
            rated.length
                ? (
                    low /
                    rated.length
                ) * 100
                : null
    };
}

function updateFilteredStats() {

    const filtered =
        getFilteredTickets();

    currentFilteredTickets =
        filtered;

    const summary =
        calculateFilteredSummary(
            filtered
        );

    setText(
        "filtered-tickets",
        formatNumber(
            summary.total
        )
    );

    /*
     * Support the older HTML ID too.
     */
    setText(
        "filtered-ticket-count",
        formatNumber(
            summary.total
        )
    );

    setText(
        "filtered-satisfaction",
        summary.average !== null
            ? `${summary.average.toFixed(
                2
            )} / 5`
            : "N/A"
    );

    const resolution =
        getFilteredResolutionAverage(
            filtered
        );

    setText(
        "filtered-resolution",
        resolution !== null
            ? `${resolution.toFixed(
                2
            )} hrs`
            : "See analytics"
    );

    const riskElement =
        byId(
            "filtered-risk"
        );

    if (riskElement) {

        riskElement.textContent =
            summary.risk !== null
                ? `${summary.risk.toFixed(
                    1
                )}%`
                : "N/A";
    }
}


/* =========================================================
   FILTERED RESOLUTION
========================================================= */

function findResolution(
    collection,
    fields,
    value
) {

    if (
        !value ||
        !Array.isArray(
            collection
        )
    ) {

        return null;
    }

    const target =
        String(value)
            .trim()
            .toLowerCase();

    const row =
        collection.find(
            item =>
                fields.some(
                    field =>
                        String(
                            item?.[
                                field
                            ] ??
                            ""
                        )
                            .trim()
                            .toLowerCase() ===
                        target
                )
        );

    if (!row) {
        return null;
    }

    const result =
        Number(
            row.average_resolution_hours ??
            row.avg_resolution_hours ??
            row.average_resolution ??
            row.value
        );

    return Number.isFinite(
        result
    )
        ? result
        : null;
}

function getFilteredResolutionAverage(
    filtered
) {

    if (!filtered.length) {
        return null;
    }

    const filters =
        getActiveFilters();

    if (
        filters.priority !==
            "all"
    ) {

        return findResolution(
            resolutionData.priority,
            [
                "priority",
                "Ticket Priority",
                "ticket_priority"
            ],
            filters.priority
        );
    }

    if (
        filters.type !==
            "all"
    ) {

        return findResolution(
            resolutionData.type,
            [
                "ticket_type",
                "Ticket Type",
                "type"
            ],
            filters.type
        );
    }

    if (
        filters.channel !==
            "all"
    ) {

        return findResolution(
            resolutionData.channel,
            [
                "support_channel",
                "Support Channel",
                "Ticket Channel",
                "channel"
            ],
            filters.channel
        );
    }

    /*
     * ticket_data.json does not provide
     * usable ticket-level resolution
     * duration values.
     */

    return null;
}

function refreshFilteredDashboard() {

    currentFilteredTickets =
        getFilteredTickets();

    updateFilteredStats();

    renderResolutionCharts();
}

function resetFilters() {

    [
        "priority-filter",
        "ticket-type-filter",
        "channel-filter",
        "segment-filter"
    ].forEach(
        id => {

            const select =
                byId(id);

            if (select) {
                select.value =
                    "all";
            }
        }
    );

    refreshFilteredDashboard();
}

function setupFilterListeners() {

    [
        "priority-filter",
        "ticket-type-filter",
        "channel-filter",
        "segment-filter"
    ].forEach(
        id => {

            const select =
                byId(id);

            if (
                select &&
                !select.dataset
                    .supportIqBound
            ) {

                select.addEventListener(
                    "change",
                    refreshFilteredDashboard
                );

                select.dataset
                    .supportIqBound =
                    "true";
            }
        }
    );

    const reset =
        byId(
            "reset-filters"
        );

    if (
        reset &&
        !reset.dataset
            .supportIqBound
    ) {

        reset.addEventListener(
            "click",
            resetFilters
        );

        reset.dataset
            .supportIqBound =
            "true";
    }
}


/* =========================================================
   RESOLUTION CHARTS
========================================================= */

function renderResolutionCharts() {

    renderResolutionChart(
        "priority-chart",
        resolutionData.priority,
        [
            "priority",
            "Ticket Priority",
            "ticket_priority"
        ],
        "Priority"
    );

    renderResolutionChart(
        "type-chart",
        resolutionData.type,
        [
            "ticket_type",
            "Ticket Type",
            "type"
        ],
        "Ticket Type"
    );

    renderResolutionChart(
        "channel-chart",
        resolutionData.channel,
        [
            "support_channel",
            "Support Channel",
            "Ticket Channel",
            "channel"
        ],
        "Support Channel"
    );
}

function renderResolutionChart(
    canvasId,
    data,
    fields,
    label
) {

    let element =
        byId(canvasId);

    if (
        !element ||
        typeof Chart ===
            "undefined" ||
        !data.length
    ) {

        return;
    }

    /*
     * Supports both:
     *
     * <canvas id="priority-chart">
     *
     * and:
     *
     * <div id="priority-chart">
     */

    let canvas =
        element;

    if (
        element.tagName
            .toLowerCase() !==
        "canvas"
    ) {

        canvas =
            element.querySelector(
                "canvas"
            );

        if (!canvas) {

            element.innerHTML =
                "";

            canvas =
                document.createElement(
                    "canvas"
                );

            canvas.id =
                `${canvasId}-canvas`;

            element.appendChild(
                canvas
            );
        }
    }

    const labels =
        data.map(
            row =>
                getFirst(
                    row,
                    fields,
                    "Unknown"
                )
        );

    const values =
        data.map(
            row =>
                Number(
                    row.average_resolution_hours ??
                    row.avg_resolution_hours ??
                    row.average_resolution ??
                    row.value
                ) || 0
        );

    if (
        charts[canvasId]
    ) {

        charts[
            canvasId
        ].destroy();
    }

    charts[
        canvasId
    ] =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {
                    labels,

                    datasets: [
                        {
                            label:
                                "Average Resolution Time",

                            data:
                                values
                        }
                    ]
                },

                options: {
                    responsive: true,

                    maintainAspectRatio:
                        false,

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


/* =========================================================
   AI TICKET SELECTOR
========================================================= */

function populateAITicketSelector() {

    const selector =
        byId(
            "ticket-selector"
        );

    if (!selector) {
        return;
    }

    selector.innerHTML =
        `
        <option value="">
            Select a ticket
        </option>
        `;

    if (
        !ticketData.length
    ) {

        selector.innerHTML =
            `
            <option value="">
                No tickets available
            </option>
            `;

        return;
    }

    /*
     * Keep the first 500 records in
     * the dropdown for usability.
     */

    ticketData
        .slice(
            0,
            500
        )
        .forEach(
            (
                ticket,
                index
            ) => {

                const option =
                    document.createElement(
                        "option"
                    );

                const id =
                    getTicketId(
                        ticket
                    ) ??
                    index + 1;

                option.value =
                    String(
                        index
                    );

                option.textContent =
                    `#${id} — ${getSubject(
                        ticket
                    )}`;

                selector.appendChild(
                    option
                );
            }
        );
}


/* =========================================================
   TICKET PREVIEW
========================================================= */

function updateTicketPreview(
    ticket
) {

    const preview =
        byId(
            "selected-ticket-preview"
        );

    if (!preview) {
        return;
    }

    if (!ticket) {

        preview.innerHTML =
            `
            <div class="dashboard-status">
                Select a ticket to preview its details.
            </div>
            `;

        return;
    }

    const satisfaction =
        getSatisfaction(
            ticket
        );

    preview.innerHTML =
        `
        <div class="ticket-preview-card">

            <div class="ticket-preview-header">

                <h4>
                    Ticket #${escapeHTML(
                        getTicketId(
                            ticket
                        ) ??
                        "N/A"
                    )}
                </h4>

            </div>

            <div class="ticket-preview-grid">

                <div>
                    <strong>
                        Customer Email
                    </strong>

                    <span>
                        ${escapeHTML(
                            getCustomerEmail(
                                ticket
                            ) ??
                            "N/A"
                        )}
                    </span>
                </div>

                <div>
                    <strong>
                        Customer Age
                    </strong>

                    <span>
                        ${escapeHTML(
                            getCustomerAge(
                                ticket
                            ) ??
                            "N/A"
                        )}
                    </span>
                </div>

                <div>
                    <strong>
                        Priority
                    </strong>

                    <span>
                        ${escapeHTML(
                            getPriority(
                                ticket
                            ) ??
                            "N/A"
                        )}
                    </span>
                </div>

                <div>
                    <strong>
                        Ticket Type
                    </strong>

                    <span>
                        ${escapeHTML(
                            getType(
                                ticket
                            ) ??
                            "N/A"
                        )}
                    </span>
                </div>

                <div>
                    <strong>
                        Channel
                    </strong>

                    <span>
                        ${escapeHTML(
                            getChannel(
                                ticket
                            ) ??
                            "N/A"
                        )}
                    </span>
                </div>

                <div>
                    <strong>
                        Satisfaction
                    </strong>

                    <span>
                        ${
                            satisfaction !==
                                null
                                ? `${satisfaction} / 5`
                                : "N/A"
                        }
                    </span>
                </div>

            </div>

            <div class="ticket-preview-content">

                <div>
                    <strong>
                        Subject
                    </strong>

                    <p>
                        ${escapeHTML(
                            getSubject(
                                ticket
                            )
                        )}
                    </p>
                </div>

                <div>
                    <strong>
                        Description
                    </strong>

                    <p>
                        ${escapeHTML(
                            getDescription(
                                ticket
                            ) ||
                            "N/A"
                        )}
                    </p>
                </div>

            </div>

        </div>
        `;
}

function setupTicketSelector() {

    const selector =
        byId(
            "ticket-selector"
        );

    if (
        !selector ||
        selector.dataset
            .supportIqBound
    ) {

        return;
    }

    selector.addEventListener(
        "change",
        event => {

            const index =
                Number(
                    event.target.value
                );

            updateTicketPreview(
                Number.isInteger(
                    index
                )
                    ? ticketData[
                        index
                    ]
                    : null
            );
        }
    );

    selector.dataset
        .supportIqBound =
        "true";
}


/* =========================================================
   AI RESULT HELPERS
========================================================= */

function normalizeProbability(
    value
) {

    const n =
        Number(value);

    if (
        !Number.isFinite(
            n
        )
    ) {

        return null;
    }

    return n <= 1
        ? n * 100
        : n;
}

function normalizeKeywords(
    value
) {

    if (
        Array.isArray(value)
    ) {

        return value;
    }

    if (
        typeof value ===
        "string"
    ) {

        return value
            .split(",")
            .map(
                v =>
                    v.trim()
            )
            .filter(Boolean);
    }

    return [];
}


/* =========================================================
   API RESULT RENDERING
========================================================= */

function renderAPIAnalysisResult(
    data
) {

    const result =
        byId(
            "ai-analysis-result"
        );

    if (!result) {
        return;
    }

    /*
     * Expected backend response:
     *
     * {
     *   ticket: ...,
     *   text_analysis: {
     *       important_terms: [...]
     *   },
     *   prediction: {
     *       risk_label: ...,
     *       risk_probability: ...
     *   }
     * }
     */

    const prediction =
        data?.prediction ||
        {};

    const textAnalysis =
        data?.text_analysis ||
        {};

    const risk =
        prediction.risk_label ??
        data.satisfaction_risk ??
        data.risk ??
        data.risk_level ??
        "Unknown";

    const probability =
        normalizeProbability(
            prediction.risk_probability ??
            data.risk_probability ??
            data.satisfaction_risk_probability ??
            data.probability
        );

    const keywordSource =
        textAnalysis.important_terms ??
        data.keywords ??
        data.extracted_keywords ??
        [];

    const keywords =
        Array.isArray(
            keywordSource
        )
            ? keywordSource.map(
                item => {

                    if (
                        typeof item ===
                        "string"
                    ) {
                        return item;
                    }

                    if (
                        item &&
                        item.term
                    ) {

                        return (
                            `${item.term}` +
                            (
                                item.frequency !==
                                    undefined
                                    ? ` (${item.frequency})`
                                    : ""
                            )
                        );
                    }

                    return JSON.stringify(
                        item
                    );
                }
            )
            : normalizeKeywords(
                keywordSource
            );

    const riskText =
        String(
            risk
        ).toLowerCase();

    const riskClass =
        riskText.includes(
            "low"
        )
            ? "low-risk"
            : riskText.includes(
                "high"
            )
                ? "high-risk"
                : "medium-risk";

    const tfidf =
        data.tfidf_analysis ??
        textAnalysis.tfidf ??
        data.tfidf;

    result.innerHTML =
        `
        <div class="ai-analysis-card">

            <div class="analysis-header">

                <h4>
                    AI Ticket Analysis
                </h4>

            </div>

            <div class="analysis-grid">

                <div class="analysis-item">

                    <span class="analysis-label">
                        Satisfaction Risk
                    </span>

                    <span
                        class="analysis-value ${riskClass}">
                        ${escapeHTML(
                            risk
                        )}
                    </span>

                </div>

                ${
                    probability !==
                        null
                        ? `
                            <div class="analysis-item">

                                <span class="analysis-label">
                                    Risk Probability
                                </span>

                                <span class="analysis-value">
                                    ${probability.toFixed(
                                        2
                                    )}%
                                </span>

                            </div>
                        `
                        : ""
                }

            </div>

            ${
                keywords.length
                    ? `
                        <div class="analysis-section">

                            <strong>
                                Important Terms
                            </strong>

                            <div class="keyword-list">

                                ${keywords
                                    .map(
                                        keyword =>
                                            `
                                            <span class="keyword">
                                                ${escapeHTML(
                                                    keyword
                                                )}
                                            </span>
                                            `
                                    )
                                    .join("")}

                            </div>

                        </div>
                    `
                    : ""
            }

            ${
                tfidf
                    ? `
                        <div class="analysis-section">

                            <strong>
                                Text Analysis
                            </strong>

                            <pre class="tfidf-output">${escapeHTML(
                                typeof tfidf ===
                                    "string"
                                    ? tfidf
                                    : JSON.stringify(
                                        tfidf,
                                        null,
                                        2
                                    )
                            )}</pre>

                        </div>
                    `
                    : ""
            }

        </div>
        `;
}


/* =========================================================
   API ERROR FORMATTER
========================================================= */

function formatAPIError(
    data,
    status
) {

    if (!data) {

        return `API request failed (${status}).`;
    }

    const detail =
        data.detail ??
        data.message ??
        data.error;

    if (
        typeof detail ===
        "string"
    ) {

        return detail;
    }

    /*
     * FastAPI / Pydantic commonly returns:
     *
     * detail: [
     *   {
     *      "loc": [...],
     *      "msg": "...",
     *      "type": "..."
     *   }
     * ]
     */

    if (
        Array.isArray(
            detail
        )
    ) {

        return detail
            .map(
                item => {

                    if (
                        typeof item ===
                        "string"
                    ) {
                        return item;
                    }

                    const location =
                        Array.isArray(
                            item?.loc
                        )
                            ? item.loc.join(
                                " → "
                            )
                            : "Validation";

                    const message =
                        item?.msg ||
                        item?.message ||
                        JSON.stringify(
                            item
                        );

                    return `${location}: ${message}`;
                }
            )
            .join(
                "; "
            );
    }

    if (
        detail &&
        typeof detail ===
            "object"
    ) {

        return Object.entries(
            detail
        )
            .map(
                (
                    [
                        key,
                        value
                    ]
                ) =>
                    `${key}: ${
                        typeof value ===
                        "string"
                            ? value
                            : JSON.stringify(
                                value
                            )
                    }`
            )
            .join(
                "; "
            );
    }

    return `API request failed (${status}).`;
}


/* =========================================================
   AI API REQUEST
========================================================= */

async function analyzeTicket(
    ticket
) {

    /*
     * IMPORTANT:
     *
     * These field names match the
     * current backend /analyze schema
     * indicated by the validation error:
     *
     * customer_age
     * priority
     * ticket_type
     * channel
     * description
     */

    const payload = {

        customer_age:
            Number(
                getCustomerAge(
                    ticket
                )
            ) || 0,

        priority:
            String(
                getPriority(
                    ticket
                ) || ""
            ),

        ticket_type:
            String(
                getType(
                    ticket
                ) || ""
            ),

        channel:
            String(
                getChannel(
                    ticket
                ) || ""
            ),

        description:
            String(
                getDescription(
                    ticket
                ) ||
                getSubject(
                    ticket
                ) ||
                ""
            )
    };

    console.log(
        "SupportIQ /analyze payload:",
        payload
    );

    const response =
        await fetch(
            `${API_BASE_URL}/analyze`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

    let data = null;

    try {

        data =
            await response.json();

    } catch (_) {

        data = null;
    }

    if (
        !response.ok
    ) {

        throw new Error(
            formatAPIError(
                data,
                response.status
            )
        );
    }

    return data || {};
}


/* =========================================================
   ANALYZE SELECTED TICKET
========================================================= */

async function analyzeSelectedTicket() {

    const selector =
        byId(
            "ticket-selector"
        );

    const result =
        byId(
            "ai-analysis-result"
        );

    const button =
        byId(
            "analyze-ticket-button"
        );

    if (
        !selector ||
        !result
    ) {

        return;
    }

    const index =
        Number(
            selector.value
        );

    const ticket =
        Number.isInteger(
            index
        )
            ? ticketData[
                index
            ]
            : null;

    if (!ticket) {

        result.innerHTML =
            `
            <div class="dashboard-status">
                Please select a ticket first.
            </div>
            `;

        return;
    }

    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Analyzing...";
    }

    result.innerHTML =
        `
        <div class="dashboard-status">
            Analyzing ticket...
        </div>
        `;

    try {

        const data =
            await analyzeTicket(
                ticket
            );

        renderAPIAnalysisResult(
            data
        );

    } catch (error) {

        console.error(
            "AI ticket analysis failed:",
            error
        );

        result.innerHTML =
            `
            <div class="dashboard-status error">

                Unable to analyze this ticket.

                <br>

                <small>
                    ${escapeHTML(
                        error.message
                    )}
                </small>

            </div>
            `;

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Analyze Selected Ticket";
        }
    }
}

function setupAPIAnalysis() {

    const button =
        byId(
            "analyze-ticket-button"
        );

    if (
        button &&
        !button.dataset
            .supportIqBound
    ) {

        button.addEventListener(
            "click",
            analyzeSelectedTicket
        );

        button.dataset
            .supportIqBound =
            "true";
    }

    setupTicketSelector();
}


/* =========================================================
   API HEALTH
========================================================= */

async function checkAPIHealth() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/health`,
                {
                    cache:
                        "no-store"
                }
            );

        if (
            !response.ok
        ) {

            return false;
        }

        const data =
            await response.json();

        return (
            data.status ===
                "healthy" ||
            data.status ===
                "ok" ||
            response.ok
        );

    } catch (error) {

        console.warn(
            "API health check failed:",
            error
        );

        return false;
    }
}

function updateAPIStatusUI() {

    const status =
        byId(
            "api-status"
        );

    if (!status) {
        return;
    }

    checkAPIHealth()
        .then(
            healthy => {

                status.textContent =
                    healthy
                        ? "API Connected"
                        : "API Unavailable";

                status.className =
                    healthy
                        ? "api-status connected"
                        : "api-status error";
            }
        );
}


/* =========================================================
   DASHBOARD INITIALIZATION
========================================================= */

async function initializeDashboard() {

    if (initialized) {
        return;
    }

    initialized =
        true;

    showDashboardStatus(
        "Loading dashboard data..."
    );

    const results =
        await Promise.allSettled(
            [
                loadDashboardMetrics(),
                loadSegmentData(),
                loadSatisfactionData(),
                loadTicketSegmentMapping(),
                loadResolutionData(),
                loadTicketData()
            ]
        );

    results.forEach(
        result => {

            if (
                result.status ===
                "rejected"
            ) {

                console.error(
                    "Dashboard load task failed:",
                    result.reason
                );
            }
        }
    );

    /*
     * Re-render after all asynchronous
     * data sources have finished.
     */

    renderSegmentSection();

    renderSegmentDistribution();

    populateAllFilters();

    setupFilterListeners();

    populateAITicketSelector();

    setupAPIAnalysis();

    refreshFilteredDashboard();

    renderResolutionCharts();

    updateAPIStatusUI();

    if (
        ticketData.length ===
        0
    ) {

        showDashboardStatus(
            "Ticket data could not be loaded.",
            "error"
        );

    } else {

        clearDashboardStatus();
    }

    console.log(
        "SupportIQ dashboard initialized."
    );
}


/* =========================================================
   COMPLETE DASHBOARD REFRESH
========================================================= */

function refreshEntireDashboard() {

    renderSegmentSection();

    renderSegmentDistribution();

    populateAllFilters();

    refreshFilteredDashboard();

    populateAITicketSelector();

    renderResolutionCharts();
}


/* =========================================================
   GLOBAL ERROR HANDLING
========================================================= */

function handleGlobalError(
    event
) {

    console.error(
        "SupportIQ runtime error:",
        event.error ||
        event.message
    );
}

function handleUnhandledRejection(
    event
) {

    console.error(
        "SupportIQ unhandled promise rejection:",
        event.reason
    );
}


/* =========================================================
   APPLICATION START
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboard,
        {
            once: true
        }
    );

} else {

    initializeDashboard();
}

window.addEventListener(
    "error",
    handleGlobalError
);

window.addEventListener(
    "unhandledrejection",
    handleUnhandledRejection
);


/* =========================================================
   WINDOW RESIZE
========================================================= */

window.addEventListener(
    "resize",
    () => {

        clearTimeout(
            resizeTimer
        );

        resizeTimer =
            setTimeout(
                () => {

                    Object.values(
                        charts
                    ).forEach(
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

                },
                150
            );
    }
);


/* =========================================================
   PAGE VISIBILITY
========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState ===
                "visible" &&
            initialized
        ) {

            refreshEntireDashboard();
        }
    }
);


/* =========================================================
   PUBLIC DEBUG API
========================================================= */

window.SupportIQ = {

    getTickets:
        () =>
            ticketData,

    getSegments:
        () =>
            segmentData,

    getResolutionData:
        () =>
            resolutionData,

    getFilteredTickets:
        () =>
            currentFilteredTickets,

    getTicketSegment:
        ticket =>
            getTicketSegment(
                ticket
            ),

    refresh:
        refreshEntireDashboard,

    refreshFilters:
        refreshFilteredDashboard,

    checkAPI:
        checkAPIHealth,

    analyzeTicket:
        index => {

            const ticket =
                ticketData[
                    index
                ];

            if (!ticket) {

                return Promise.reject(
                    new Error(
                        "Invalid ticket index."
                    )
                );
            }

            const selector =
                byId(
                    "ticket-selector"
                );

            if (selector) {

                selector.value =
                    String(
                        index
                    );
            }

            updateTicketPreview(
                ticket
            );

            return analyzeTicket(
                ticket
            ).then(
                data => {

                    renderAPIAnalysisResult(
                        data
                    );

                    return data;
                }
            );
        }
};


window.SupportIQDashboard = {

    initialize:
        initializeDashboard,

    refresh:
        refreshEntireDashboard,

    refreshFilters:
        refreshFilteredDashboard,

    getFilteredTickets,

    getActiveFilters,

    getResolutionData:
        () =>
            resolutionData,

    getSegmentData:
        () =>
            segmentData,

    getTicketData:
        () =>
            ticketData,

    checkAPIHealth,

    analyzeTicket:
        index =>
            window.SupportIQ
                .analyzeTicket(
                    index
                )
};


console.log(
    "SupportIQ final corrected script loaded."
);
