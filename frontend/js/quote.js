
/* ==========================================================
   BRIGHT KOLORS SIGNAGE STUDIO
   PROJECT ENQUIRY FORM
   File: frontend/js/quote.js
   ========================================================== */

(() => {
    "use strict";

    const form = document.getElementById("quoteForm");
    const statusMessage = document.getElementById("quoteStatus");
    const submitButton = form?.querySelector('button[type="submit"]');

    // This requires /api to be available on the current website origin.
    const API_BASE = "https://brightkolors.onrender.com/api";

    if (!form) {
        console.info("Quotation form is not present on this page.");
        return;
    }

    if (!statusMessage) {
        console.error("Missing quotation status element: #quoteStatus");
        return;
    }

    console.info("BRIGHT KOLORS quotation script loaded.");

    // DISPLAY STATUS
    function showStatus(message, state) {
        statusMessage.textContent = message;
        statusMessage.dataset.state = state;
    }

    // PRESELECT SERVICE FROM A URL PARAMETER
    // Example: quote.html?service=LED%20Letters
    const params = new URLSearchParams(window.location.search);
    const requestedService = params.get("service");
    const serviceField = form.querySelector('[name="service"]');

    if (requestedService && serviceField) {
        const matchingOption = Array.from(serviceField.options).find(
            (option) =>
                option.value === requestedService ||
                option.textContent.trim() === requestedService
        );

        if (matchingOption) {
            serviceField.value = matchingOption.value;
        }
    }

    // HANDLE SUBMISSION
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!form.reportValidity()) {
            return;
        }

        if (submitButton?.disabled) {
            return;
        }

        showStatus("Sending your quotation request…", "pending");

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.setAttribute("aria-busy", "true");
        }

        try {
            const response = await fetch(`${API_BASE}/quotes`, {
                method: "POST",
                body: new FormData(form)
            });

            const responseText = await response.text();
            let result = {};

            if (responseText) {
                try {
                    result = JSON.parse(responseText);
                } catch {
                    result = {};
                }
            }

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    `Server error ${response.status}. Please try again.`
                );
            }

            showStatus(
                "Thank you! Your quotation request has been received. Our team will contact you soon.",
                "success"
            );

            form.reset();

        } catch (error) {
            console.error("Quotation submission failed:", error);

            if (error instanceof TypeError) {
                showStatus(
                    "Unable to connect to the quotation server. Please start the backend or check the API connection, then try again. You can also contact us on WhatsApp.",
                    "error"
                );
            } else {
                showStatus(
                    error.message ||
                    "We could not submit your request. Please try again.",
                    "error"
                );
            }

        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.removeAttribute("aria-busy");
            }
        }
    });
})();
