console.log("SupportIQ dashboard loaded");

document.addEventListener("DOMContentLoaded", function () {

    loadDashboardMetrics();
    loadSegments();
    loadSatisfactionData();
    loadResolutionData();

});


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

        const lines = text.trim().split(/\r?\n/);

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

        showError(
            "total-tickets",
            "Unable to load"
        );

        showError(
            "average-satisfaction",
            "Unable to load"
        );

        showError(
            "average-resolution",
            "Unable to load"
        );

        showError(
            "customer-segments",
            "Unable to load"
        );

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

        const container =
            document.getElementById("segment-container");


        /*
         * Add interactive segment filter
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

                ${data.segments.map(function (segment) {

                    return `
                        <option value="${escapeHtml(segment.segment)}">
                            ${escapeHtml(segment.segment)}
                        </option>
                    `;

                }).join("")}

            </select>

        `;


        container.innerHTML = "";

        container.appendChild(filterContainer);


        /*
         * Create table container
         */

        const tableContainer =
            document.createElement("div");

        tableContainer.id =
            "segment-table-container";

        container.appendChild(tableContainer);


        /*
         * Create chart container
         */

        const chartContainer =
            document.createElement("div");

        chartContainer.id =
            "segment-chart-container";

        container.appendChild(chartContainer);


        /*
         * Initial display
         */

        renderSegments(
            data.segments,
            "all"
        );


        /*
         * Filter change event
         */

        document
            .getElementById("segment-filter")
            .addEventListener("change", function () {

                renderSegments(
                    data.segments,
                    this.value
                );

            });


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
            segments.filter(function (segment) {

                return segment.segment ===
                    selectedSegment;

            });

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
                    ${escapeHtml(segment.segment)}
                </td>

                <td>
                    ${Number(segment.customers).toLocaleString()}
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

let segmentChart = null;


function renderSegmentChart(
    segments
) {

    const container =
        document.getElementById(
            "segment-chart-container"
        );


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


    /*
     * Destroy previous chart
     */

    if (segmentChart) {

        segmentChart.destroy();

    }


    segmentChart =
        new Chart(canvas, {

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


        document.getElementById(
            "low-satisfaction"
        ).textContent =
            "Unavailable";


        document.getElementById(
            "satisfied-customers"
        ).textContent =
            "Unavailable";


        document.getElementById(
            "low-satisfaction-rate"
        ).textContent =
            "Unavailable";


        document.getElementById(
            "model-accuracy"
        ).textContent =
            "Unavailable";

    }

}


/* =========================================================
   RESOLUTION ANALYTICS
========================================================= */

async function loadResolutionData() {

    try {

        const priorityResponse =
            await fetch(
                "./data/resolution_by_priority.json"
            );

        if (!priorityResponse.ok) {

            throw new Error(
                "resolution_by_priority.json not found"
            );

        }

        const priorityData =
            await priorityResponse.json();


        const typeResponse =
            await fetch(
                "./data/resolution_by_type.json"
            );

        if (!typeResponse.ok) {

            throw new Error(
                "resolution_by_type.json not found"
            );

        }

        const typeData =
            await typeResponse.json();


        const channelResponse =
            await fetch(
                "./data/resolution_by_channel.json"
            );

        if (!channelResponse.ok) {

            throw new Error(
                "resolution_by_channel.json not found"
            );

        }

        const channelData =
            await channelResponse.json();


        createResolutionChart(
            "priority-chart",
            priorityData.data,
            "priority",
            "Resolution Time by Priority"
        );


        createResolutionChart(
            "type-chart",
            typeData.data,
            "ticket_type",
            "Resolution Time by Ticket Type"
        );


        createResolutionChart(
            "channel-chart",
            channelData.data,
            "channel",
            "Resolution Time by Channel"
        );


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
   RESOLUTION CHART
========================================================= */

function createResolutionChart(
    containerId,
    data,
    labelKey,
    chartTitle
) {

    const container =
        document.getElementById(
            containerId
        );


    container.innerHTML = `

        <div class="chart-wrapper">

            <canvas></canvas>

        </div>

    `;


    const canvas =
        container.querySelector(
            "canvas"
        );


    new Chart(canvas, {

        type: "bar",

        data: {

            labels:
                data.map(function (item) {

                    return item[labelKey];

                }),

            datasets: [

                {

                    label:
                        "Average Resolution Time (hours)",

                    data:
                        data.map(function (item) {

                            return Number(
                                item.average_resolution_hours
                            );

                        }),

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
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
