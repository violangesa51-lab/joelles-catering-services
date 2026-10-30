/* Visitor welcome message and shared view counter. */
(() => {
    "use strict";

    const prompt = document.getElementById("visitorPrompt");
    const closePrompt = document.getElementById("closeVisitorPrompt");
    const promptTitle = document.getElementById("visitorPromptTitle");
    const promptText = document.getElementById("visitorPromptText");
    const promptLink = document.getElementById("visitorPromptLink");
    const promptLinkText = document.getElementById("visitorPromptLinkText");
    const countBox = document.getElementById("visitorCount");
    const countText = document.getElementById("visitorCountNumber");

    const messages = [
        {
            title: "Planning an event?",
            text: "Check availability for your date.",
            link: "https://wa.me/254722785377?text=Hello%20Joelle%27s%20Catering%20Services%2C%20I%20would%20like%20to%20check%20availability%20for%20my%20event.",
            button: "Check availability"
        },
        {
            title: "Need a menu for your event?",
            text: "Explore choices for your guests.",
            link: "?page=menu",
            button: "View our menu"
        },
        {
            title: "Ready for a quotation?",
            text: "We will prepare a personalised quote.",
            link: "?page=quote",
            button: "Request a quote"
        }
    ];

    function showMessage(index) {
        if (!promptTitle || !promptText || !promptLink || !promptLinkText) return;
        const message = messages[index];
        promptTitle.textContent = message.title;
        promptText.textContent = message.text;
        promptLink.href = message.link;
        promptLink.target = message.link.startsWith("http") ? "_blank" : "_self";
        promptLinkText.textContent = message.button;
    }

    const currentPage = new URLSearchParams(window.location.search).get("page") || "home";
    if (prompt && currentPage === "menu") {
        let current = 0;
        showMessage(current);
        window.setTimeout(() => prompt.removeAttribute("hidden"), 900);
        window.setInterval(() => {
            if (prompt.hidden) return;
            current = (current + 1) % messages.length;
            showMessage(current);
        }, 5000);
    }

    if (closePrompt) {
        closePrompt.addEventListener("click", () => {
            prompt.hidden = true;
        });
    }

    const config = window.JOELLES_SUPABASE || {};
    if (!window.supabase || !config.url || !config.publishableKey || !countBox || !countText) return;

    const client = window.supabase.createClient(config.url, config.publishableKey);
    const visitorKey = "joelles-visitor-counted-v1";
    let alreadyCounted = false;
    try { alreadyCounted = window.localStorage.getItem(visitorKey) === "true"; } catch (_) { /* Counting still works when storage is unavailable. */ }
    const request = alreadyCounted ? client.rpc("get_site_view_total") : client.rpc("record_site_view");
    request.then(({ data, error }) => {
        const total = Number(data);
        if (error || !Number.isFinite(total)) return;
        if (!alreadyCounted) { try { window.localStorage.setItem(visitorKey, "true"); } catch (_) { /* Ignore blocked storage. */ } }
        countText.textContent = new Intl.NumberFormat("en-KE").format(total);
        countBox.hidden = false;
    });
})();
