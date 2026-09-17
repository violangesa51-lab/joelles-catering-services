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
        id: null, image_url: figure.querySelector("img").src, title: figure.querySelector("figcaption").textContent.trim(), category: ""
    }));
    const fallback = staticItems();
    const publishButton = $("#galleryPublishButton");

    function updatePublishState() {
        publishButton.disabled = !($("#galleryFile").files[0] && $("#galleryTitle").value.trim() && $("#galleryCategory").value);
    }

    function card(item, index) {
        const figure = document.createElement("figure");
        figure.className = `gallery-item ${index === 0 ? "gallery-large" : ""}`;
        figure.tabIndex = 0;
        figure.setAttribute("role", "button");
        figure.setAttribute("aria-label", `View ${item.title}`);
        figure.innerHTML = `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" loading="lazy"><figcaption>${escapeHtml(item.title)}${item.category ? `<small>${escapeHtml(item.category)}</small>` : ""}</figcaption>`;
        figure.addEventListener("click", () => openLightbox(index));
        figure.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openLightbox(index); } });
        if (isAdmin && item.id) {
            const controls = document.createElement("div"); controls.className = "gallery-admin-card";
            controls.innerHTML = '<button type="button" data-edit>Edit</button><button type="button" data-delete>Delete</button>';
            controls.addEventListener("click", (event) => { event.stopPropagation(); if (event.target.dataset.edit !== undefined) editItem(item); if (event.target.dataset.delete !== undefined) deleteItem(item); });
            figure.append(controls);
        }
        return figure;
    }
    function render() { grid.replaceChildren(...published.map(card)); }
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
        published = remote.length ? [...remote, ...fallback] : fallback;
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
