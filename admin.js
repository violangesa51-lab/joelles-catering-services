(() => {
  "use strict";
  const config = window.JOELLES_SUPABASE || {};
  const login = document.querySelector("#loginDialog");
  const recovery = document.querySelector("#recoveryDialog");
  const app = document.querySelector("#app");
  const notice = document.querySelector("#notice");
  const client = window.supabase && config.url && config.publishableKey
    ? window.supabase.createClient(config.url, config.publishableKey) : null;
  let editingMenu = null;
  const requestedView = new URLSearchParams(window.location.search).get("view");
  const validViews = new Set(["overview", "pages", "menus", "gallery", "reviews", "enquiries", "bookings", "customers"]);

  let noticeTimer;
  const say = (text, error = false) => {
    clearTimeout(noticeTimer);
    notice.textContent = text;
    notice.style.color = error ? "#a4152c" : "";
    if (text) noticeTimer = setTimeout(() => { notice.textContent = ""; notice.style.color = ""; }, 5000);
  };
  const text = (value) => String(value || "-").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const date = (value) => value ? new Date(value).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" }) : "-";
  const empty = (body, columns, message) => body.innerHTML = `<tr><td colspan="${columns}">${message}</td></tr>`;
  const customerName = value => String(value || "there").trim() || "there";
  const whatsappNumber = value => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith("0")) return `254${digits.slice(1)}`;
    if (digits.length === 9 && digits.startsWith("7")) return `254${digits}`;
    return digits;
  };
  const notifyCustomer = ({ phone, email, title, message, subject }) => {
    const whatsapp = document.querySelector("#notificationWhatsapp");
    const emailLink = document.querySelector("#notificationEmail");
    document.querySelector("#notificationTitle").textContent = title;
    document.querySelector("#notificationText").textContent = "Your message is ready. Send it using WhatsApp, email, or both.";
    const number = whatsappNumber(phone);
    whatsapp.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    whatsapp.hidden = !number;
    emailLink.href = `mailto:${encodeURIComponent(email || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    emailLink.hidden = !email;
    if (!number && !email) document.querySelector("#notificationText").textContent = "This customer has no phone number or email address saved.";
    document.querySelector("#notificationDialog").showModal();
  };
  document.querySelector("[data-close-notification]").addEventListener("click", () => document.querySelector("#notificationDialog").close());
  const openRecovery = () => { login.close(); recovery.showModal(); };
  const activate = (view) => { document.querySelectorAll(".view").forEach(el => el.classList.toggle("active", el.id === view)); document.querySelectorAll("[data-view]").forEach(el => el.classList.toggle("active", el.dataset.view === view)); document.querySelector("#viewTitle").textContent = document.querySelector(`[data-view="${view}"]`).textContent.trim(); document.querySelector(".sidebar").classList.remove("open"); if (view !== "overview") loadView(view); };

  document.querySelectorAll("[data-view],[data-go]").forEach(button => button.addEventListener("click", () => activate(button.dataset.view || button.dataset.go)));
  document.querySelector("#mobileMenu").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));
  document.querySelector("#logout").addEventListener("click", async () => { await client.auth.signOut(); app.hidden = true; login.showModal(); });

  async function requireAdmin() {
    const { data: { session } } = await client.auth.getSession();
    if (!session) return false;
    const { data, error } = await client.rpc("is_gallery_admin");
    if (error || data !== true) { say("This account is not authorised to use the admin dashboard.", true); return false; }
    document.querySelector("#profileEmail").textContent = session.user.email;
    document.querySelector("#profileInitial").textContent = (session.user.email || "J").charAt(0).toUpperCase();
    return true;
  }

  document.querySelector("#loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!client) return document.querySelector("#loginError").textContent = "The admin connection is not configured.";
    document.querySelector("#loginError").textContent = "";
    const { error } = await client.auth.signInWithPassword({ email: document.querySelector("#email").value, password: document.querySelector("#password").value });
    if (error) return document.querySelector("#loginError").textContent = "Unable to sign in with those details.";
    if (await requireAdmin()) { login.close(); app.hidden = false; const view = validViews.has(requestedView) ? requestedView : "overview"; activate(view); if (view === "overview") loadOverview(); }
  });

  document.querySelector("#recoveryForm").addEventListener("submit", async event => {
    event.preventDefault();
    const password = document.querySelector("#recoveryPassword").value;
    const confirmation = document.querySelector("#recoveryConfirm").value;
    const error = document.querySelector("#recoveryError");
    error.textContent = "";
    if (password.length < 8) return error.textContent = "Use at least 8 characters.";
    if (password !== confirmation) return error.textContent = "The passwords do not match.";
    const { error: updateError } = await client.auth.updateUser({ password });
    if (updateError) return error.textContent = "Could not save this password. Please request a new link.";
    await client.auth.signOut();
    recovery.close();
    document.querySelector("#recoveryForm").reset();
    document.querySelector("#loginError").textContent = "Password saved. Sign in with your new password.";
    login.showModal();
  });

  async function get(table, order = "created_at") { const { data, error } = await client.from(table).select("*").order(order, { ascending: false }); return error ? null : data; }
  async function loadOverview() {
    const [enquiries, bookings, gallery, reviews] = await Promise.all([get("enquiries"), get("bookings"), get("gallery_photos"), get("customer_reviews")]);
    const values = [enquiries?.filter(x => x.status === "new").length || 0, bookings?.filter(x => x.status !== "completed").length || 0, gallery?.length || 0, reviews?.length || 0];
    document.querySelectorAll("#stats strong").forEach((el, i) => el.textContent = values[i]);
  }
  async function loadView(view) {
    if (!client) return;
    if (view === "menus") return loadMenus();
    if (view === "enquiries") return loadEnquiries();
    if (view === "bookings") return loadBookings();
    if (view === "customers") return loadCustomers();
    if (view === "reviews") return loadReviews();
    if (view === "pages") return loadPage();
    if (view === "gallery") return loadGalleryManager();
  }

  let adminGalleryPreviewUrl = "";

  const galleryMessage = (value, isError = false) => {
    const element = document.querySelector("#adminGalleryMessage");
    element.textContent = value;
    element.style.color = isError ? "#a4152c" : "";
  };

  const updateGalleryPublishButton = () => {
    const file = document.querySelector("#adminGalleryFile").files[0];
    const title = document.querySelector("#adminGalleryTitle").value.trim();
    const category = document.querySelector("#adminGalleryCategory").value;
    document.querySelector("#adminGalleryPublish").disabled = !(file && title && category);
  };

  const clearGalleryPreview = (clearFile = true) => {
    if (adminGalleryPreviewUrl) URL.revokeObjectURL(adminGalleryPreviewUrl);
    adminGalleryPreviewUrl = "";
    document.querySelector("#adminGalleryPreview").hidden = true;
    if (clearFile) document.querySelector("#adminGalleryFile").value = "";
  };

  async function loadGalleryManager() {
    const list = document.querySelector("#adminGalleryList");
    list.innerHTML = '<div class="admin-gallery-empty">Loading gallery photos…</div>';
    const { data, error } = await client.from("gallery_photos").select("id,title,category,storage_path,created_at").order("created_at", { ascending: false });
    if (error) { list.innerHTML = '<div class="admin-gallery-empty">Could not load your gallery photos.</div>'; return; }
    if (!data.length) { list.innerHTML = '<div class="admin-gallery-empty">No gallery photos have been added yet.</div>'; return; }
    const photos = (await Promise.all(data.map(async (item) => {
      const { data: signed, error: signedError } = await client.storage.from("gallery-images").createSignedUrl(item.storage_path, 3600);
      return signedError ? null : { ...item, image_url: signed.signedUrl };
    }))).filter(Boolean);
    list.innerHTML = photos.map(photo => `<article class="admin-gallery-card"><img src="${text(photo.image_url)}" alt="${text(photo.title)}"><div class="admin-gallery-card-body"><div><strong>${text(photo.title)}</strong><small>${text(photo.category)}</small></div><button type="button" class="admin-gallery-delete" data-delete-gallery-photo="${text(photo.id)}">Delete</button></div></article>`).join("");
    document.querySelectorAll("[data-delete-gallery-photo]").forEach(button => button.addEventListener("click", async () => {
      const photo = photos.find(item => item.id === button.dataset.deleteGalleryPhoto);
      if (!photo || !window.confirm(`Remove “${photo.title}” from the Gallery?`)) return;
      const { error: recordError } = await client.from("gallery_photos").delete().eq("id", photo.id);
      if (recordError) return galleryMessage("Could not remove this photo.", true);
      await client.storage.from("gallery-images").remove([photo.storage_path]);
      galleryMessage("Photo removed from the Gallery.");
      loadGalleryManager();
    }));
  }
  async function loadMenus() { const body = document.querySelector("#menusBody"), rows = await get("catering_menus", "sort_order"); if (!rows?.length) return empty(body, 5, "No menu items yet. Add your first item."); body.innerHTML = rows.map(row => `<tr><td><strong>${text(row.name)}</strong></td><td>${text(row.description)}</td><td>${row.price ? `KSh ${Number(row.price).toLocaleString()}` : "On request"}</td><td><span class="status ${row.is_published ? "" : "pending"}">${row.is_published ? "Published" : "Hidden"}</span></td><td><button class="row-action" data-edit-menu="${row.id}">Edit</button></td></tr>`).join(""); document.querySelectorAll("[data-edit-menu]").forEach(button => button.onclick = () => openMenu(rows.find(row => row.id === button.dataset.editMenu))); }
  async function loadEnquiries() { const body = document.querySelector("#enquiriesBody"), rows = await get("enquiries"); if (!rows?.length) return empty(body, 6, "No customer submissions yet."); body.innerHTML = rows.map(row => `<tr><td><strong>${text(row.full_name)}</strong></td><td>${text(row.event_type)}</td><td>${date(row.event_date)}</td><td>${text(row.phone || row.email)}</td><td><span class="status ${row.status === "new" ? "pending" : ""}">${text(row.status || "new")}</span></td><td><button class="row-action" data-quote-notify="${row.id}">Notify customer</button></td></tr>`).join(""); document.querySelectorAll("[data-quote-notify]").forEach(button => button.onclick = async () => { const row = rows.find(item => item.id === button.dataset.quoteNotify); const { error } = await client.from("enquiries").update({ status: "received" }).eq("id", row.id); if (error) return say("Could not update this quotation request.", true); const name = customerName(row.full_name), event = row.event_type || "event"; notifyCustomer({ phone: row.phone, email: row.email, title: "Quotation receipt ready", subject: "We received your quotation request | Joelle's Catering Services", message: `Hello ${name},\n\nThank you for your quotation request for your ${event}. We have received it and are calculating your amount. We will send your quotation shortly.\n\nKind regards,\nJoelle's Catering Services` }); say("Quotation request marked as received."); loadEnquiries(); loadOverview(); }); }
  async function loadBookings() { const body = document.querySelector("#bookingsBody"), rows = await get("bookings", "event_date"); if (!rows?.length) return empty(body, 6, "No bookings have been added yet."); body.innerHTML = rows.map(row => `<tr><td><strong>${text(row.customer_name)}</strong>${row.phone ? `<br><small>${text(row.phone)}${row.email ? ` · ${text(row.email)}` : ""}</small>` : ""}</td><td>${text(row.event_type)}</td><td>${date(row.event_date)}</td><td>${text(row.guest_count)}</td><td><span class="status ${row.status === "pending" ? "pending" : ""}">${text(row.status || "confirmed")}</span></td><td>${row.status === "pending" ? `<button class="row-action" data-confirm-booking="${row.id}">Confirm &amp; notify</button><button class="row-action" data-decline-booking="${row.id}">Decline &amp; notify</button>` : "-"}</td></tr>`).join(""); document.querySelectorAll("[data-confirm-booking]").forEach(button => button.onclick = async () => { const row = rows.find(item => item.id === button.dataset.confirmBooking); const { error } = await client.from("bookings").update({ status: "confirmed" }).eq("id", row.id); if (error) return say("Could not confirm this booking.", true); const name = customerName(row.customer_name), event = row.event_type || "event", when = date(row.event_date); notifyCustomer({ phone: row.phone, email: row.email, title: "Booking confirmation ready", subject: "Your booking is confirmed | Joelle's Catering Services", message: `Hello ${name},\n\nGreat news! Your ${event} booking for ${when} has been confirmed. Thank you for choosing Joelle's Catering Services.\n\nKind regards,\nJoelle's Catering Services` }); say("Booking confirmed."); loadBookings(); loadOverview(); }); document.querySelectorAll("[data-decline-booking]").forEach(button => button.onclick = async () => { const row = rows.find(item => item.id === button.dataset.declineBooking); const { error } = await client.from("bookings").update({ status: "declined" }).eq("id", row.id); if (error) return say("Could not decline this booking.", true); const name = customerName(row.customer_name), event = row.event_type || "event", when = date(row.event_date); notifyCustomer({ phone: row.phone, email: row.email, title: "Booking update ready", subject: "Update on your booking request | Joelle's Catering Services", message: `Hello ${name},\n\nThank you for your ${event} booking request for ${when}. Unfortunately, we are unable to accommodate this booking. We are sorry for the inconvenience and hope to serve you at another occasion.\n\nKind regards,\nJoelle's Catering Services` }); say("Booking declined."); loadBookings(); loadOverview(); }); }
  async function loadCustomers() { const body = document.querySelector("#customersBody"), rows = await get("customers"); if (!rows?.length) return empty(body, 4, "Customers appear here after an enquiry or booking."); body.innerHTML = rows.map(row => `<tr><td><strong>${text(row.full_name)}</strong></td><td>${text(row.phone)}</td><td>${text(row.email)}</td><td>${date(row.updated_at)}</td></tr>`).join(""); }
  let replyingReview = null;
  async function loadReviews() {
    const body = document.querySelector("#reviewsBody"), rows = await get("customer_reviews");
    if (!rows?.length) return empty(body, 5, "No reviews have been received yet.");
    body.innerHTML = rows.map(row => {
      const isPublished = row.is_published !== false;
      return `<tr><td><strong>${text(row.name)}</strong></td><td>${text(row.message)}</td><td>${"★".repeat(Number(row.rating || 0))}</td><td><span class="status ${isPublished ? "" : "pending"}">${isPublished ? "Public" : "Hidden"}</span></td><td><button class="row-action" data-toggle-review="${row.id}">${isPublished ? "Hide" : "Publish"}</button><button class="row-action" data-reply-review="${row.id}">${row.business_response ? "Edit reply" : "Reply"}</button></td></tr>`;
    }).join("");
    document.querySelectorAll("[data-toggle-review]").forEach(button => button.onclick = async () => {
      const row = rows.find(item => item.id === button.dataset.toggleReview);
      const next = !(row.is_published !== false);
      const { error } = await client.from("customer_reviews").update({ is_published: next }).eq("id", row.id);
      if (error) return say("Could not update this review. Please apply the review update first.", true);
      say(next ? "Review published." : "Review hidden from the website.");
      loadReviews();
    });
    document.querySelectorAll("[data-reply-review]").forEach(button => button.onclick = () => {
      replyingReview = rows.find(item => item.id === button.dataset.replyReview);
      document.querySelector("#reviewReplyText").value = replyingReview.business_response || "";
      document.querySelector("#reviewReplyDialog").showModal();
    });
  }
  async function loadPage() { const key = document.querySelector("#pageKey").value; const { data } = await client.from("site_content").select("*").eq("section_key", key).maybeSingle(); document.querySelector("#pageTitle").value = data?.title || ""; document.querySelector("#pageBody").value = data?.body || ""; }
  document.querySelector("#pageKey").addEventListener("change", loadPage);
  document.querySelector("#savePage").addEventListener("click", async () => { const section_key = document.querySelector("#pageKey").value, title = document.querySelector("#pageTitle").value.trim(), body = document.querySelector("#pageBody").value.trim(); const { error } = await client.from("site_content").upsert({section_key, title, body}, {onConflict:"section_key"}); say(error ? "Could not save this page." : "Page changes saved.", Boolean(error)); });
  function openMenu(item) { editingMenu = item || null; document.querySelector("#itemKicker").textContent = "MENU ITEM"; document.querySelector("#itemTitle").textContent = item ? "Edit item" : "Add item"; document.querySelector("#itemName").value = item?.name || ""; document.querySelector("#itemDescription").value = item?.description || ""; document.querySelector("#itemPrice").value = item?.price || ""; document.querySelector("#itemPublished").checked = item?.is_published ?? true; document.querySelector("#itemDialog").showModal(); }
  document.querySelector("#newMenu").addEventListener("click", () => openMenu());
  document.querySelector("[data-close]").addEventListener("click", () => document.querySelector("#itemDialog").close());
  document.querySelector("#itemForm").addEventListener("submit", async event => { event.preventDefault(); const data = {name:document.querySelector("#itemName").value.trim(),description:document.querySelector("#itemDescription").value.trim(),price:document.querySelector("#itemPrice").value || null,is_published:document.querySelector("#itemPublished").checked}; const request = editingMenu ? client.from("catering_menus").update(data).eq("id", editingMenu.id) : client.from("catering_menus").insert(data); const { error } = await request; document.querySelector("#itemDialog").close(); say(error ? "Could not save this item. Please run the backend setup first." : "Menu item saved.", Boolean(error)); loadMenus(); });
  document.querySelector("[data-close-review-reply]").addEventListener("click", () => document.querySelector("#reviewReplyDialog").close());
  document.querySelector("#reviewReplyForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!replyingReview) return;
    const business_response = document.querySelector("#reviewReplyText").value.trim();
    const { error } = await client.from("customer_reviews").update({ business_response, responded_at: new Date().toISOString() }).eq("id", replyingReview.id);
    if (error) return say("Could not publish the reply. Please apply the review update first.", true);
    document.querySelector("#reviewReplyDialog").close();
    say("Your reply is now visible below the review.");
    loadReviews();
  });
  const openBooking = () => { document.querySelector("#bookingForm").reset(); document.querySelector("#bookingStatus").value = "confirmed"; document.querySelector("#bookingDialog").showModal(); };
  document.querySelector("#newBooking").addEventListener("click", openBooking);
  document.querySelector("[data-close-booking]").addEventListener("click", () => document.querySelector("#bookingDialog").close());
  document.querySelector("#bookingForm").addEventListener("submit", async event => {
    event.preventDefault();
    const booking = {
      customer_name: document.querySelector("#bookingCustomer").value.trim(),
      event_type: document.querySelector("#bookingEvent").value.trim(),
      event_date: document.querySelector("#bookingDate").value,
      guest_count: Number(document.querySelector("#bookingGuests").value),
      status: document.querySelector("#bookingStatus").value
    };
    const { error } = await client.from("bookings").insert(booking);
    if (error) return say("Could not save this booking. Please try again.", true);
    document.querySelector("#bookingDialog").close();
    say("Booking saved.");
    loadBookings();
    loadOverview();
  });
  document.querySelector("#adminGalleryFile").addEventListener("change", () => {
    const file = document.querySelector("#adminGalleryFile").files[0];
    clearGalleryPreview(false);
    if (file) {
      adminGalleryPreviewUrl = URL.createObjectURL(file);
      document.querySelector("#adminGalleryPreviewImage").src = adminGalleryPreviewUrl;
      document.querySelector("#adminGalleryPreview").hidden = false;
    }
    updateGalleryPublishButton();
  });
  document.querySelector("#adminGalleryTitle").addEventListener("input", updateGalleryPublishButton);
  document.querySelector("#adminGalleryCategory").addEventListener("change", updateGalleryPublishButton);
  document.querySelector("#adminGalleryPreviewCancel").addEventListener("click", () => { clearGalleryPreview(); updateGalleryPublishButton(); });
  document.querySelector("#adminGalleryForm").addEventListener("submit", async event => {
    event.preventDefault();
    const file = document.querySelector("#adminGalleryFile").files[0];
    const title = document.querySelector("#adminGalleryTitle").value.trim();
    const category = document.querySelector("#adminGalleryCategory").value;
    if (!file || !title || !category) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) return galleryMessage("Use a JPG, PNG or WebP image no larger than 5 MB.", true);
    const { data: { user } } = await client.auth.getUser();
    if (!user) return galleryMessage("Your session has ended. Please sign in again.", true);
    const submit = document.querySelector("#adminGalleryPublish");
    submit.disabled = true;
    submit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading…';
    const ext = file.name.split(".").pop().toLowerCase();
    const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await client.storage.from("gallery-images").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) { submit.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Publish photo'; updateGalleryPublishButton(); return galleryMessage("Upload failed. Please try again.", true); }
    const { error: recordError } = await client.from("gallery_photos").insert({ title, category, storage_path: storagePath, is_published: true });
    submit.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Publish photo';
    if (recordError) { await client.storage.from("gallery-images").remove([storagePath]); updateGalleryPublishButton(); return galleryMessage("The photo could not be published.", true); }
    event.target.reset();
    clearGalleryPreview(false);
    updateGalleryPublishButton();
    galleryMessage("Photo published to your Gallery.");
    loadGalleryManager();
  });
  if (!client) { login.showModal(); document.querySelector("#loginError").textContent = "The admin connection is not configured."; return; }
  client.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") openRecovery(); });
  if (window.location.hash.includes("type=recovery")) openRecovery();
  requireAdmin().then(ok => { if (ok) { app.hidden = false; const view = validViews.has(requestedView) ? requestedView : "overview"; activate(view); if (view === "overview") loadOverview(); } else login.showModal(); });
})();
