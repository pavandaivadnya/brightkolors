/* QUOTATION FORM: Sends customer details and optional image to POST /api/quotes. */

const form = document.getElementById("quoteForm");

const statusMessage = document.getElementById("quoteStatus");

const submitButton = form?.querySelector('button[type="submit"]');

const API_BASE = "/api";

// Preselect a service when linked from a service page with ?service=...
const params = new URLSearchParams(window.location.search);

const requestedService = params.get("service");

const serviceField = form?.querySelector('[name="service"]');

if (requestedService && serviceField) {
const matchingOption = [...serviceField.options].find(
(option) => option.value === requestedService ||
option.textContent.trim() === requestedService
);

if (matchingOption) serviceField.value = matchingOption.value;

}

form?.addEventListener("submit", async (event) => {
event.preventDefault();
if (!statusMessage) return;

statusMessage.textContent = "Sending your quotation request…";
statusMessage.dataset.state = "pending";
if (submitButton) {
submitButton.disabled = true;
submitButton.setAttribute("aria-busy", "true");
}

try {
const response = await fetch(`${API_BASE}/quotes`, {
method: "POST",
body: new FormData(form)
});
const result = await response.json().catch(() => ({}));

if (!response.ok) {
throw new Error(result.message || "We could not submit your request. Please check your details and try again.");
}

statusMessage.textContent = "Thank you! Your quotation request has been received. Our team will contact you soon.";
statusMessage.dataset.state = "success";
form.reset();
} catch (error) {
statusMessage.textContent = error.message || "Could not connect to the backend. Please try again or contact us by WhatsApp.";
statusMessage.dataset.state = "error";
} finally {
if (submitButton) {
submitButton.disabled = false;
submitButton.removeAttribute("aria-busy");
}
}
});
