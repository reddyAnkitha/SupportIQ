const API_BASE_URL = "http://localhost:8000";


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

            if (
                !window.supportIQTickets ||
                window.supportIQTickets.length === 0
            ) {

                result.textContent =
                    "Ticket data is not available yet.";

                return;

            }


            const ticket =
                window.supportIQTickets[0];


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
                        .text_analysis
                        .important_terms
                        .map(
                            item =>
                                `${item.term} (${item.frequency})`
                        )
                        .join(", ");


                result.innerHTML = `
                    <strong>Analysis Complete</strong>
                    <br><br>

                    <strong>Risk:</strong>
                    ${analysis.prediction.risk_label}

                    <br>

                    <strong>Risk Probability:</strong>
                    ${analysis.prediction.risk_probability}

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
