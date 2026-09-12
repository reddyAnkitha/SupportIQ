console.log("SupportIQ dashboard loaded");

document.addEventListener("DOMContentLoaded", function () {

    loadDashboardMetrics();
    loadSegments();
    loadSatisfactionData();
    loadResolutionData();

});


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

    }

}


async function loadSegments() {

    try {

        const response =
            await fetch("./data/segment_dashboard.json");

        if (!response.ok) {
            throw new Error("segment_dashboard.json not found");
        }

        const data =
            await response.json();

        const container =
            document.getElementById("segment-container");


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


        data.segments.forEach(function (segment) {

            table += `

                <tr>

                    <td>${segment.segment}</td>

                    <td>${segment.customers}</td>

                    <td>${segment.avg_age}</td>

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


        container.innerHTML = table;


        createSegmentationChart(data.segments);


    } catch (error) {

        console.error(
            "Could not load customer segments:",
            error
        );

    }

}


async function loadSatisfactionData() {

    try {

        const response =
            await fetch("./data/satisfaction_dashboard.json");

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

    }

}


async function loadResolutionData() {

    try {

        const priorityResponse =
            await fetch(
                "./data/resolution_by_priority.json"
            );

        const priorityData =
            await priorityResponse.json();


        const typeResponse =
            await fetch(
                "./data/resolution_by_type.json"
            );

        const typeData =
            await typeResponse.json();


        const channelResponse =
            await fetch(
                "./data/resolution_by_channel.json"
            );

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

    }

}


function createResolutionChart(
    containerId,
    data,
    labelKey,
    chartTitle
) {

    const container =
        document.getElementById(containerId);


    container.innerHTML = `
        <div class="chart-wrapper">
            <canvas></canvas>
        </div>
    `;


    const canvas =
        container.querySelector("canvas");


    new Chart(canvas, {

        type: "bar",

        data: {

            labels: data.map(function (item) {
                return item[labelKey];
            }),

            datasets: [

                {
                    label: "Average Resolution Time (hours)",

                    data: data.map(function (item) {
                        return item.average_resolution_hours;
                    }),

                    borderWidth: 1
                }

            ]

        },

        options: {

            responsive: true,

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


function createSegmentationChart(segments) {

    const container =
        document.getElementById("segment-container");


    const chartDiv =
        document.createElement("div");


    chartDiv.className =
        "segment-chart";


    chartDiv.innerHTML = `
        <h3>Customer Satisfaction by Segment</h3>
        <canvas></canvas>
    `;


    container.appendChild(chartDiv);


    const canvas =
        chartDiv.querySelector("canvas");


    new Chart(canvas, {

        type: "bar",

        data: {

            labels: segments.map(function (segment) {
                return segment.segment;
            }),

            datasets: [

                {
                    label: "Average Satisfaction",

                    data: segments.map(function (segment) {
                        return segment.avg_satisfaction;
                    }),

                    borderWidth: 1
                }

            ]

        },

        options: {

            responsive: true,

            scales: {

                y: {

                    beginAtZero: true,

                    max: 5,

                    title: {
                        display: true,
                        text: "Satisfaction Score"
                    }

                }

            }

        }

    });

}
