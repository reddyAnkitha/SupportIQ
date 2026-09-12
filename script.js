console.log("SupportIQ dashboard loaded");

document.addEventListener("DOMContentLoaded", function () {
    loadDashboardMetrics();
    loadSegments();
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

        console.log("Customer segments loaded:", data.segments);

    } catch (error) {
        console.error("Could not load customer segments:", error);
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
        console.error("Could not load resolution analytics:", error);
    }
});
