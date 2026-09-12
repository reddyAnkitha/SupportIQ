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

        console.log("Dashboard metrics loaded");
        console.log(text);

    } catch (error) {
        console.error("Could not load dashboard metrics:", error);
    }
}

async function loadSegments() {

    try {
        const response = await fetch("data/segment_dashboard.json");
        const data = await response.json();

        console.log("Customer segments loaded");
        console.log(data.segments);

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

        console.log("Priority resolution data loaded");
        console.log(priorityData.data);


        const typeResponse =
            await fetch("data/resolution_by_type.json");

        const typeData =
            await typeResponse.json();

        console.log("Ticket type resolution data loaded");
        console.log(typeData.data);


        const channelResponse =
            await fetch("data/resolution_by_channel.json");

        const channelData =
            await channelResponse.json();

        console.log("Channel resolution data loaded");
        console.log(channelData.data);

    } catch (error) {

        console.error(
            "Could not load resolution analytics:",
            error
        );

    }
});
