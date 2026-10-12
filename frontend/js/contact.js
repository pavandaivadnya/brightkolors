const form = document.getElementById("contactForm");

form?.addEventListener("submit", (event) => {
event.preventDefault();
const value = (id) => document.getElementById(id)?.value.trim() || "";
const service = document.getElementById("contactService")?.value || "Not selected";
const text = [
"Hello BRIGHT KOLORS SIGNAGE STUDIO,",
"",
`Name: ${value("contactName")}`,
`Mobile: ${value("contactPhone")}`,
`Email: ${value("contactEmail") || "Not provided"}`,
`City / Project Location: ${value("contactCity") || "Not provided"}`,
`Service: ${service}`,
`Requirement: ${value("contactMessage") || "I would like to discuss a signage project."}`
].join("\n");
const url = "https://wa.me/918553217683?text=" + encodeURIComponent(text);
window.open(url, "_blank", "noopener,noreferrer");
});
