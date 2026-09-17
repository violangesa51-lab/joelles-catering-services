/* Shared public customer reviews. This replaces browser-only localStorage
   reviews only when the Supabase public configuration is available. */
(() => {
    "use strict";
    const config = window.JOELLES_SUPABASE || {};
    if (!config.url || !config.publishableKey || !window.supabase) return;

    const client = window.supabase.createClient(config.url, config.publishableKey);
    const form = document.getElementById("feedbackForm");
    const reviewsList = document.getElementById("reviewsList");
    const empty = document.getElementById("reviewsEmpty");
    const nameInput = document.getElementById("reviewName");
    const eventInput = document.getElementById("reviewEvent");
    const ratingInput = document.getElementById("reviewRating");
    const messageInput = document.getElementById("reviewMessage");
    const error = document.getElementById("ratingError");
    const success = document.getElementById("feedbackSuccess");
    const stars = document.querySelectorAll(".rating-star");

    function formatDate(value) {
        return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
    }
    function card(review) {
        const article = document.createElement("article"); article.className = "review-card";
        const top = document.createElement("div"); top.className = "review-card-top";
        const person = document.createElement("div"); person.className = "review-person";
        const avatar = document.createElement("div"); avatar.className = "review-avatar"; avatar.textContent = review.name.charAt(0).toUpperCase();
        const info = document.createElement("div"); const title = document.createElement("strong"); title.textContent = review.name; info.append(title);
        if (review.event_type) { const event = document.createElement("span"); event.className = "review-event"; event.textContent = review.event_type; info.append(event); }
        person.append(avatar, info);
        const reviewStars = document.createElement("div"); reviewStars.className = "review-stars"; reviewStars.setAttribute("aria-label", `${review.rating} out of 5 stars`);
        for (let i = 1; i <= 5; i += 1) { const star = document.createElement("i"); star.className = i <= review.rating ? "fa-solid fa-star" : "fa-regular fa-star"; reviewStars.append(star); }
        top.append(person, reviewStars);
        const text = document.createElement("p"); text.className = "review-text"; text.textContent = review.message;
        const date = document.createElement("span"); date.className = "review-date"; date.textContent = formatDate(review.created_at);
        article.append(top, text, date); return article;
    }
    async function loadReviews() {
        const { data, error: loadError } = await client.from("customer_reviews").select("name,event_type,rating,message,created_at").order("created_at", { ascending: false });
        if (loadError) return;
        reviewsList.querySelectorAll(".review-card").forEach((item) => item.remove());
        empty.style.display = data.length ? "none" : "flex";
        data.forEach((review) => reviewsList.append(card(review)));
    }
    function resetForm() {
        form.reset(); error.textContent = "";
        stars.forEach((star) => { star.setAttribute("aria-checked", "false"); star.classList.remove("selected", "preview"); const icon = star.querySelector("i"); icon.classList.remove("fa-solid"); icon.classList.add("fa-regular"); });
    }
    form.addEventListener("submit", async (event) => {
        event.preventDefault(); event.stopImmediatePropagation();
        const name = nameInput.value.trim(), message = messageInput.value.trim(), rating = Number(ratingInput.value);
        if (!name) return nameInput.focus();
        if (!rating) { error.textContent = "Please choose a star rating."; return stars[0].focus(); }
        if (!message) return messageInput.focus();
        const submit = form.querySelector("button[type='submit']"); submit.disabled = true; submit.textContent = "Submitting…";
        const { error: insertError } = await client.from("customer_reviews").insert({ name, event_type: eventInput.value || null, rating, message });
        submit.disabled = false; submit.innerHTML = '<i class="fa-regular fa-paper-plane"></i> Submit Review';
        if (insertError) { error.textContent = "Your review could not be submitted. Please try again."; return; }
        resetForm(); success.classList.add("show"); setTimeout(() => success.classList.remove("show"), 6000); loadReviews();
    }, true);
    loadReviews();
})();
