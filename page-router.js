/* Presents each public area as a separate page view while preserving the shared site design. */
(() => {
    "use strict";
    const pages = {
        home: ["home"], about: ["about"], services: ["services"],
        menu: ["menu", "tailored-section"], gallery: ["gallery"],
        experiences: ["testimonials"], areas: ["coverage"],
        quote: ["quote", "how-it-works", "policy-section"], contact: ["contact"]
    };
    const titles = {
        home: "Joelle's Catering Services | Outside Catering Kenya",
        about: "About Us | Joelle's Catering Services", services: "Catering Services | Joelle's Catering Services",
        menu: "Our Menu | Joelle's Catering Services", gallery: "Gallery | Joelle's Catering Services",
        experiences: "Client Experiences | Joelle's Catering Services", areas: "Areas We Serve | Joelle's Catering Services",
        quote: "Request a Quote | Joelle's Catering Services", contact: "Contact Us | Joelle's Catering Services",
        booking: "Book an Event | Joelle's Catering Services"
    };
    const anchors = { home: "home", about: "about", services: "services", menu: "menu", gallery: "gallery", testimonials: "experiences", coverage: "areas", quote: "quote", contact: "contact" };
    const requested = new URLSearchParams(window.location.search).get("page") || "home";
    const page = requested === "booking" || pages[requested] ? requested : "home";
    document.title = titles[page] || titles.home;
    document.querySelectorAll("main > section").forEach((section) => {
        section.hidden = !(pages[page] || []).some((name) => section.id === name || section.classList.contains(name));
    });
    const cta = document.querySelector(".cta-section");
    if (cta) cta.hidden = page !== "home";
    document.querySelectorAll("a[href^='#']").forEach((link) => {
        const target = link.getAttribute("href").slice(1);
        if (anchors[target]) link.href = `?page=${anchors[target]}`;
    });
    document.querySelectorAll("[data-open-booking]").forEach((button) => {
        button.addEventListener("click", (event) => { event.preventDefault(); event.stopImmediatePropagation(); window.location.href = "?page=booking"; }, true);
    });
    if (page === "booking") window.addEventListener("DOMContentLoaded", () => {
        const dialog = document.getElementById("bookingDialog");
        if (dialog && !dialog.open) dialog.showModal();
    });
})();
