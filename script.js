console.log("SupportIQ dashboard loaded");

document.addEventListener("DOMContentLoaded", function () {
    loadDashboardMetrics();
    loadSegments();
    loadSatisfactionData();
    loadResolutionData();
});


async function loadDashboardMetrics() {

    try {
        const response = await fetch("data/dashboard_metrics.csv");
        const text = await response.text();

        const lines = text.trim().split("\n");
        const metrics = {};

        lines.slice(1).forEach(function (line) {
            const parts = line.split(",");
            metrics[parts[0]] = parts[1];
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
        console.error("Could not load dashboard metrics:", error);
    }
}


async function loadSegments() {

    try {
        const response = await fetch("data/segment_dashboard.json");
        const data = await response.json();

        const container = document.getElementById("segment-container");

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
                    <td>${segment.avg_satisfaction} / 5</td>
                    <td>${segment.avg_resolution_hours} hrs</td>
                </tr>
            `;

        });

        table += `
                </tbody>
            </table>
        `;

        container.innerHTML = table;

    } catch (error) {
        console.error("Could not load customer segments:", error);
    }
}


async function loadSatisfactionData() {

    try {
        const response =
            await fetch("data/satisfaction_dashboard.json");

        const data = await response.json();

        document.getElementById("low-satisfaction").textContent =
            Number(data.low_satisfaction_tickets).toLocaleString();

        document.getElementById("satisfied-customers").textContent =
            Number(data.satisfied_tickets).toLocaleString();

        document.getElementById("low-satisfaction-rate").textContent =
            data.low_satisfaction_percentage + "%";

        document.getElementById("model-accuracy").textContent =
            data.model_accuracy + "%";

    } catch (error) {
        console.error("Could not load satisfaction data:", error);
    }
}


async function loadResolutionData() {

    try {

        const priorityResponse =
            await fetch("data/resolution_by_priority.json");

        const priorityData =
            await priorityResponse.json();

        console.log("Priority data:", priorityData.data);


        const typeResponse =
            await fetch("data/resolution_by_type.json");

        const typeData =
            await typeResponse.json();

        console.log("Ticket type data:", typeData.data);


        const channelResponse =
            await fetch("data/resolution_by_channel.json");

        const channelData =
            await channelResponse.json();

        console.log("Channel data:", channelData.data);

    } catch (error) {

        console.error(
            "Could not load resolution analytics:",
            error
        );

    }
});
