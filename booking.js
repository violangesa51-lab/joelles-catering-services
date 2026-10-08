(() => {
    "use strict";

    const dialog = document.getElementById("bookingDialog");
    const form = document.getElementById("publicBookingForm");
    const eventDate = document.getElementById("bookingEventDate");
    const message = document.getElementById("bookingMessage");
    const closeButton = document.querySelector("[data-close-booking]");
    if (!dialog || !form || !eventDate || !message || !closeButton) return;

    const today = new Date();
    const minimumDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    eventDate.min = minimumDate;

    document.querySelectorAll("[data-open-booking]").forEach((button) => {
        button.addEventListener("click", () => {
            message.textContent = "";
            form.reset();
            eventDate.min = minimumDate;
            dialog.showModal();
        });
    });

    closeButton.addEventListener("click", () => dialog.close());

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const config = window.JOELLES_SUPABASE || {};
        if (!window.supabase || !config.url || !config.publishableKey) {
            message.textContent = "Booking is temporarily unavailable. Please call or WhatsApp us.";
            return;
        }
        const submit = form.querySelector("button[type='submit']");
        submit.disabled = true;
        submit.textContent = "Sending…";
        const client = window.supabase.createClient(config.url, config.publishableKey);
        const { error } = await client.from("bookings").insert({
            customer_name: document.getElementById("bookingName").value.trim(),
            phone: document.getElementById("bookingPhone").value.trim(),
            email: document.getElementById("bookingEmail").value.trim() || null,
            event_type: document.getElementById("bookingEventType").value,
            event_date: eventDate.value,
            guest_count: Number(document.getElementById("bookingGuestCount").value),
            status: "pending"
        });
        submit.disabled = false;
        submit.textContent = "Send booking request";
        if (error) {
            message.textContent = "We could not send this request. Please WhatsApp or call us.";
            return;
        }
        message.textContent = "Thank you — your booking request has been received. We will contact you to confirm availability and deposit details.";
        form.reset();
    });
})();
