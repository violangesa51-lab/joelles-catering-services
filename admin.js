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

  const say = (text, error = false) => { notice.textContent = text; notice.style.color = error ? "#a4152c" : ""; };
  const text = (value) => String(value || "-").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const date = (value) => value ? new Date(value).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" }) : "-";
  const empty = (body, columns, message) => body.innerHTML = `<tr><td colspan="${columns}">${message}</td></tr>`;
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
    if (await requireAdmin()) { login.close(); app.hidden = false; loadOverview(); }
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
  async function loadView(view) { if (!client) return; if (view === "menus") return loadMenus(); if (view === "enquiries") return loadEnquiries(); if (view === "bookings") return loadBookings(); if (view === "customers") return loadCustomers(); if (view === "reviews") return loadReviews(); if (view === "pages") return loadPage(); }
  async function loadMenus() { const body = document.querySelector("#menusBody"), rows = await get("catering_menus", "sort_order"); if (!rows?.length) return empty(body, 5, "No packages yet. Add your first package."); body.innerHTML = rows.map(row => `<tr><td><strong>${text(row.name)}</strong></td><td>${text(row.description)}</td><td>${row.price ? `KSh ${Number(row.price).toLocaleString()}` : "On request"}</td><td><span class="status ${row.is_published ? "" : "pending"}">${row.is_published ? "Published" : "Hidden"}</span></td><td><button class="row-action" data-edit-menu="${row.id}">Edit</button></td></tr>`).join(""); document.querySelectorAll("[data-edit-menu]").forEach(button => button.onclick = () => openMenu(rows.find(row => row.id === button.dataset.editMenu))); }
  async function loadEnquiries() { const body = document.querySelector("#enquiriesBody"), rows = await get("enquiries"); if (!rows?.length) return empty(body, 5, "No customer submissions yet."); body.innerHTML = rows.map(row => `<tr><td><strong>${text(row.full_name)}</strong></td><td>${text(row.event_type)}</td><td>${date(row.event_date)}</td><td>${text(row.phone || row.email)}</td><td><span class="status ${row.status === "new" ? "pending" : ""}">${text(row.status || "new")}</span></td></tr>`).join(""); }
  async function loadBookings() { const body = document.querySelector("#bookingsBody"), rows = await get("bookings", "event_date"); if (!rows?.length) return empty(body, 6, "No bookings have been added yet."); body.innerHTML = rows.map(row => `<tr><td><strong>${text(row.customer_name)}</strong>${row.phone ? `<br><small>${text(row.phone)}${row.email ? ` · ${text(row.email)}` : ""}</small>` : ""}</td><td>${text(row.event_type)}</td><td>${date(row.event_date)}</td><td>${text(row.guest_count)}</td><td><span class="status ${row.status === "pending" ? "pending" : ""}">${text(row.status || "confirmed")}</span></td><td>${row.status === "pending" ? `<button class="row-action" data-confirm-booking="${row.id}">Confirm</button> <button class="row-action" data-decline-booking="${row.id}">Decline</button>` : "-"}</td></tr>`).join(""); document.querySelectorAll("[data-confirm-booking]").forEach(button => button.onclick = async () => { const { error } = await client.from("bookings").update({ status: "confirmed" }).eq("id", button.dataset.confirmBooking); say(error ? "Could not confirm this booking." : "Booking confirmed.", Boolean(error)); loadBookings(); loadOverview(); }); document.querySelectorAll("[data-decline-booking]").forEach(button => button.onclick = async () => { const { error } = await client.from("bookings").update({ status: "declined" }).eq("id", button.dataset.declineBooking); say(error ? "Could not decline this booking." : "Booking declined.", Boolean(error)); loadBookings(); loadOverview(); }); }
  async function loadCustomers() { const body = document.querySelector("#customersBody"), rows = await get("customers"); if (!rows?.length) return empty(body, 4, "Customers appear here after an enquiry or booking."); body.innerHTML = rows.map(row => `<tr><td><strong>${text(row.full_name)}</strong></td><td>${text(row.phone)}</td><td>${text(row.email)}</td><td>${date(row.updated_at)}</td></tr>`).join(""); }
  async function loadReviews() { const body = document.querySelector("#reviewsBody"), rows = await get("customer_reviews"); if (!rows?.length) return empty(body, 5, "No reviews have been received yet."); body.innerHTML = rows.map(row => `<tr><td><strong>${text(row.name)}</strong></td><td>${text(row.message)}</td><td>${"★".repeat(Number(row.rating || 0))}</td><td><span class="status">Public</span></td><td></td></tr>`).join(""); }
  async function loadPage() { const key = document.querySelector("#pageKey").value; const { data } = await client.from("site_content").select("*").eq("section_key", key).maybeSingle(); document.querySelector("#pageTitle").value = data?.title || ""; document.querySelector("#pageBody").value = data?.body || ""; }
  document.querySelector("#pageKey").addEventListener("change", loadPage);
  document.querySelector("#savePage").addEventListener("click", async () => { const section_key = document.querySelector("#pageKey").value, title = document.querySelector("#pageTitle").value.trim(), body = document.querySelector("#pageBody").value.trim(); const { error } = await client.from("site_content").upsert({section_key, title, body}, {onConflict:"section_key"}); say(error ? "Could not save this page." : "Page changes saved.", Boolean(error)); });
  function openMenu(item) { editingMenu = item || null; document.querySelector("#itemKicker").textContent = "MENU PACKAGE"; document.querySelector("#itemTitle").textContent = item ? "Edit package" : "Add package"; document.querySelector("#itemName").value = item?.name || ""; document.querySelector("#itemDescription").value = item?.description || ""; document.querySelector("#itemPrice").value = item?.price || ""; document.querySelector("#itemPublished").checked = item?.is_published ?? true; document.querySelector("#itemDialog").showModal(); }
  document.querySelector("#newMenu").addEventListener("click", () => openMenu());
  document.querySelector("[data-close]").addEventListener("click", () => document.querySelector("#itemDialog").close());
  document.querySelector("#itemForm").addEventListener("submit", async event => { event.preventDefault(); const data = {name:document.querySelector("#itemName").value.trim(),description:document.querySelector("#itemDescription").value.trim(),price:document.querySelector("#itemPrice").value || null,is_published:document.querySelector("#itemPublished").checked}; const request = editingMenu ? client.from("catering_menus").update(data).eq("id", editingMenu.id) : client.from("catering_menus").insert(data); const { error } = await request; document.querySelector("#itemDialog").close(); say(error ? "Could not save this package. Please run the backend setup first." : "Menu package saved.", Boolean(error)); loadMenus(); });
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
  if (!client) { login.showModal(); document.querySelector("#loginError").textContent = "The admin connection is not configured."; return; }
  client.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") openRecovery(); });
  if (window.location.hash.includes("type=recovery")) openRecovery();
  requireAdmin().then(ok => { if (ok) { app.hidden = false; loadOverview(); } else login.showModal(); });
})();
