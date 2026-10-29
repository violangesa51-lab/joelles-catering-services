(() => {
    "use strict";

    const config = window.JOELLES_SUPABASE || {};
    const ready = config.url && config.publishableKey && window.supabase;
    const isAdminPage = document.body.dataset.galleryAdminPage === "true";
    const $ = (selector) => document.querySelector(selector);
    const grid = $("#galleryGrid"), status = $("#galleryStatus"), admin = $("#galleryAdmin");
    const loginDialog = $("#galleryLoginDialog"), lightbox = $("#galleryLightbox");
    const categories = ["Buffet Catering", "Event Setup", "Wedding Catering", "Birthday Catering", "Corporate Catering", "Breakfast", "Main Meals", "Snacks", "Desserts", "Drinks", "Private Events", "Other"];
    let client, published = [], isAdmin = false, previewUrl = "", lightboxIndex = 0;

    const message = (text, error = false) => { status.textContent = text; status.style.color = error ? "#a81717" : ""; };
    const escapeHtml = (text) => String(text || "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[char]);

    const staticItems = () => [...grid.querySelectorAll("figure")].map((figure) => ({
        id: null,
        image_url: figure.querySelector("img").src,
        title: figure.querySelector("figcaption").textContent.trim(),
        category: figure.dataset.category || "Other"
    }));
    const fallback = staticItems();
    const publishButton = $("#galleryPublishButton");

    function updatePublishState() {
        publishButton.disabled = !($("#galleryFile").files[0] && $("#galleryTitle").value.trim() && $("#galleryCategory").value);
    }

    function render() {
        const grouped = published.reduce((groups, item, index) => {
            const rawCategory = (item.category || "").toLowerCase();
            const category = rawCategory.includes("breakfast") ? "Breakfast" : rawCategory.includes("snack") ? "Snacks" : (rawCategory.includes("lunch") || rawCategory.includes("main meal")) ? "Lunch" : "Buffet Catering";
            (groups[category] ||= []).push({ item, index });
            return groups;
        }, {});
        const categoryOrder = ["Buffet Catering", "Breakfast", "Lunch", "Snacks"];
        const categoryCards = Object.entries(grouped)
            .sort(([first], [second]) => categoryOrder.indexOf(first) - categoryOrder.indexOf(second))
            .map(([category, items]) => {
            let current = 0;
            const card = document.createElement("article");
            card.className = "gallery-category-card";
            card.innerHTML = `
                <div class="gallery-category-image">
                    <img src="${escapeHtml(items[0].item.image_url)}" alt="${escapeHtml(items[0].item.title)}" loading="lazy">
                    ${items.length > 1 ? '<button type="button" class="gallery-slide-arrow gallery-slide-prev" aria-label="Previous photo"><i class="fa-solid fa-chevron-left"></i></button><button type="button" class="gallery-slide-arrow gallery-slide-next" aria-label="Next photo"><i class="fa-solid fa-chevron-right"></i></button>' : ""}
                </div>
                <div class="gallery-category-info"><h3>${escapeHtml(category)}</h3><span class="gallery-slide-count">1 / ${items.length}</span></div>`;
            const image = card.querySelector("img"), count = card.querySelector(".gallery-slide-count");
            const show = (next) => {
                current = (next + items.length) % items.length;
                const selected = items[current].item;
                image.src = selected.image_url;
                image.alt = selected.title;
                count.textContent = `${current + 1} / ${items.length}`;
            };
            card.querySelector(".gallery-category-image").addEventListener("click", (event) => {
                if (event.target.closest("button")) return;
                openLightbox(items[current].index);
            });
            const previous = card.querySelector(".gallery-slide-prev"), next = card.querySelector(".gallery-slide-next");
            if (previous) previous.addEventListener("click", () => show(current - 1));
            if (next) next.addEventListener("click", () => show(current + 1));
                return card;
            });
        grid.replaceChildren(...categoryCards);
    }
    function openLightbox(index) { lightboxIndex = index; const item = published[index]; $("#galleryLightboxImage").src = item.image_url; $("#galleryLightboxImage").alt = item.title; $("#galleryLightboxTitle").textContent = item.title; $("#galleryLightboxCategory").textContent = item.category || ""; lightbox.showModal(); }
    function stepLightbox(offset) { openLightbox((lightboxIndex + offset + published.length) % published.length); }

    async function loadGallery() {
        if (!ready) { published = fallback; render(); return; }
        message("Loading gallery…");
        const { data, error } = await client.from("gallery_photos").select("id,title,category,storage_path").eq("is_published", true).order("created_at", { ascending: false });
        if (error) { published = fallback; render(); message("Showing our current gallery.", true); return; }
        const remote = (await Promise.all(data.map(async (item) => {
            const { data: signed, error: signedError } = await client.storage.from("gallery-images").createSignedUrl(item.storage_path, 3600);
            return signedError ? null : { ...item, image_url: signed.signedUrl };
        }))).filter(Boolean);
        published = remote.length ? [...fallback, ...remote] : fallback;
        render(); message("");
    }
    async function checkAdmin() {
        const { data: { session } } = await client.auth.getSession();
        if (!session) { isAdmin = false; admin.hidden = true; render(); if (isAdminPage && !loginDialog.open) loginDialog.showModal(); return; }
        const { data, error } = await client.rpc("is_gallery_admin");
        isAdmin = !error && data === true; admin.hidden = !isAdmin || !isAdminPage; render();
        if (!isAdmin) { message("This account is not authorised to manage the gallery.", true); if (isAdminPage && !loginDialog.open) loginDialog.showModal(); }
    }
    async function editItem(item) {
        const title = window.prompt("Photo title", item.title); if (title === null) return;
        const category = window.prompt(`Category (${categories.join(", ")})`, item.category); if (category === null) return;
        if (!title.trim() || !categories.includes(category)) return message("Enter a title and choose a listed category.", true);
        const { error } = await client.from("gallery_photos").update({ title: title.trim(), category }).eq("id", item.id);
        if (error) return message("Could not update this photo.", true); message("Photo updated."); await loadGallery();
    }
    async function deleteItem(item) {
        if (!window.confirm("Are you sure you want to remove this photo from the gallery?")) return;
        const { error: deleteRecordError } = await client.from("gallery_photos").delete().eq("id", item.id);
        if (deleteRecordError) return message("Could not delete this photo.", true);
        const { error: deleteFileError } = await client.storage.from("gallery-images").remove([item.storage_path]);
        if (deleteFileError) message("Photo was removed from the gallery, but its stored file could not be removed.", true); else message("Photo deleted.");
        await loadGallery();
    }
    function clearPreview(clearFile = true) { if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = ""; $("#galleryPreview").hidden = true; if (clearFile) $("#galleryFile").value = ""; }
    async function publish(event) {
        event.preventDefault(); const file = $("#galleryFile").files[0], title = $("#galleryTitle").value.trim(), category = $("#galleryCategory").value;
        if (!file || !title || !category) return;
        const validTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!validTypes.includes(file.type) || file.size > 5 * 1024 * 1024) return message("Use a JPG, PNG, or WebP image no larger than 5 MB.", true);
        const { data: { user } } = await client.auth.getUser(); if (!user) return message("Your session has ended. Please sign in again.", true);
        const ext = file.name.split(".").pop().toLowerCase(); const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
        message("Uploading photo…"); const { error: uploadError } = await client.storage.from("gallery-images").upload(storagePath, file, { contentType: file.type, upsert: false });
        if (uploadError) return message("Upload failed. Please try again.", true);
        const { error: recordError } = await client.from("gallery_photos").insert({ title, category, storage_path: storagePath, is_published: true });
        if (recordError) { await client.storage.from("gallery-images").remove([storagePath]); return message("The photo could not be published.", true); }
        event.target.reset(); clearPreview(); updatePublishState(); message("Photo added successfully."); await loadGallery();
    }

    grid.addEventListener("keydown", () => {});
    const adminTrigger = $("#galleryAdminTrigger");
    if (adminTrigger) adminTrigger.addEventListener("click", () => { if (!ready) { message("Gallery administration will be available after Supabase is configured.", true); return; } loginDialog.showModal(); });
    document.querySelectorAll("[data-gallery-close]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
    $("#galleryLightboxPrev").addEventListener("click", () => stepLightbox(-1)); $("#galleryLightboxNext").addEventListener("click", () => stepLightbox(1));
    document.addEventListener("keydown", (event) => { if (!lightbox.open) return; if (event.key === "Escape") lightbox.close(); if (event.key === "ArrowLeft") stepLightbox(-1); if (event.key === "ArrowRight") stepLightbox(1); });
    $("#galleryFile").addEventListener("change", () => { const file = $("#galleryFile").files[0]; if (!file) { updatePublishState(); return; } clearPreview(false); previewUrl = URL.createObjectURL(file); $("#galleryPreviewImage").src = previewUrl; $("#galleryPreview").hidden = false; updatePublishState(); });
    $("#galleryTitle").addEventListener("input", updatePublishState); $("#galleryCategory").addEventListener("change", updatePublishState);
    $("#galleryPreviewCancel").addEventListener("click", () => { clearPreview(); updatePublishState(); }); $("#galleryUploadForm").addEventListener("submit", publish);
    updatePublishState();

    if (!ready) { loadGallery(); return; }
    client = window.supabase.createClient(config.url, config.publishableKey);
    $("#galleryLoginForm").addEventListener("submit", async (event) => { event.preventDefault(); const formMessage = $("#galleryLoginMessage"); formMessage.textContent = ""; const { error } = await client.auth.signInWithPassword({ email: $("#galleryEmail").value, password: $("#galleryPassword").value }); if (error) { formMessage.textContent = "Unable to sign in with those details."; return; } await checkAdmin(); if (isAdmin) { loginDialog.close(); $("#galleryLoginForm").reset(); } });
    $("#galleryLogout").addEventListener("click", async () => { await client.auth.signOut(); message("Signed out."); });
    client.auth.onAuthStateChange(() => { checkAdmin(); });
    loadGallery(); checkAdmin();
})();
