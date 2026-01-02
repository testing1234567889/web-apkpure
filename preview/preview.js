import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  onValue,
  get,
  set,
  remove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ===== Firebase config (same as index) ===== */
const firebaseConfig = {
      apiKey: "AIzaSyAu--L2T5_o9xLVT09mXFLIcpPuLLWlL1Q",
      authDomain: "aplikasi-percobaan-dbf84.firebaseapp.com",
      databaseURL: "https://aplikasi-percobaan-dbf84-default-rtdb.firebaseio.com",
      projectId: "aplikasi-percobaan-dbf84",
      storageBucket: "aplikasi-percobaan-dbf84.appspot.com",
      messagingSenderId: "52109851315",
      appId: "1:52109851315:web:ba255b74b4ce0500774ec6",
      measurementId: "G-H6WCVTQQEM"
    };

/* ===== Helpers ===== */
const $ = (id) => document.getElementById(id);

const previewEl = $("preview");
const toastEl = $("toast");
const loginBtn = $("loginBtn");
const avatarBtn = $("avatarBtn");
const headerAvatar = $("headerAvatar");
const backBtn = $("backBtn");

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.style.display = "block";
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => (toastEl.style.display = "none"), 1900);
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(String(text));
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = String(text);
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch {
    return false;
  }
}

function safeText(v, fallback = "") {
  return typeof v === "string" || typeof v === "number" ? String(v) : fallback;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseDate(v) {
  if (!v) return null;
  if (typeof v === "number") return new Date(v);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(v) {
  const d = parseDate(v);
  if (!d) return "-";
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function timeAgo(ts) {
  const d = new Date(Number(ts) || 0);
  if (!ts || isNaN(d.getTime())) return "";
  const diff = Math.max(0, Date.now() - d.getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day} hari lalu`;
  return fmtDate(d.getTime());
}

function fmtNum(n) {
  const x = Number(n);
  if (!isFinite(x)) return "0";
  if (x >= 1e6) return (x/1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (x >= 1e3) return (x/1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(Math.round(x));
}

function isNew(updatedAt) {
  const d = parseDate(updatedAt);
  if (!d) return false;
  const diff = (Date.now() - d.getTime()) / (1000*60*60*24);
  return diff <= 30;
}

function starsDisplay(avg) {
  const rating = Math.max(0, Math.min(5, Number(avg) || 0));
  let html = `<span class="stars" title="Rating ${rating.toFixed(1)}">`;
  for (let i = 1; i <= 5; i++) {
    const on = i <= Math.round(rating);
    html += `
      <svg viewBox="0 0 24 24" class="${on ? "on" : "off"}" aria-hidden="true">
        <path d="M12 17.3l-6.2 3.4 1.5-7L1.9 8.9l7.2-1L12 1.5l2.9 6.4 7.2 1-5.4 4.8 1.5 7z"/>
      </svg>`;
  }
  html += `</span>`;
  return html;
}

function iconPencil() {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
}
function iconShare() {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 8a3 3 0 1 0-2.8-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 12l10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 12l10 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="2"/><path d="M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="2"/></svg>`;
}
function iconDownload() {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 11l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 21h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
}
function iconBookmark() {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
}
function iconThumbUp() {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 10V4a2 2 0 0 0-2-2L7 12v10h10a2 2 0 0 0 2-1.5l2-7A2 2 0 0 0 19 10h-5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 12H4v10h3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
}
function iconThumbDown() {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 14v6a2 2 0 0 0 2 2l5-10V2H7a2 2 0 0 0-2 1.5l-2 7A2 2 0 0 0 5 14h5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M17 12h3V2h-3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
}

function computeReviewStats(reviewsObj) {
  if (!reviewsObj || typeof reviewsObj !== "object") return { avg: 0, count: 0, dist: [0,0,0,0,0] };
  let sum = 0, count = 0;
  const dist = [0,0,0,0,0];
  for (const uid in reviewsObj) {
    const s = Number(reviewsObj[uid]?.stars);
    if (isFinite(s) && s >= 1 && s <= 5) {
      sum += s; count += 1;
      dist[s-1] += 1;
    }
  }
  return { avg: count ? (sum / count) : 0, count, dist };
}

function computeVoteCounts(votesObj) {
  const counts = {};
  if (!votesObj || typeof votesObj !== "object") return counts;
  for (const reviewUid of Object.keys(votesObj)) {
    const m = votesObj[reviewUid] || {};
    let like = 0, dislike = 0;
    for (const voterUid of Object.keys(m)) {
      const val = Number(m[voterUid]);
      if (val === 1) like += 1;
      else if (val === -1) dislike += 1;
    }
    counts[reviewUid] = { like, dislike, score: like - dislike };
  }
  return counts;
}


// ===== Perf hint (low-end devices) =====
try {
  const dm = Number(navigator.deviceMemory || 0);
  const hc = Number(navigator.hardwareConcurrency || 0);
  // Heuristic: very low RAM / cores -> disable expensive blur/shadow in CSS
  if ((dm && dm <= 2) || (hc && hc <= 4)) {
    document.body.classList.add("lowPerf");
  }
} catch {}

/* ===== Init ===== */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const ADMIN_UID = "DAQG3iy23JekAyRb4PDQPORIeKY2";
const REVIEW_EDIT_COOLDOWN_MS = 30 * 1000;

function isAdminUid(uid) {
  return String(uid || "") === ADMIN_UID;
}

const qs = new URLSearchParams(location.search);
const appId = (qs.get("id") || "").trim();

let currentUser = null;
let appData = null;
let reviews = {};
let reviewVotes = {};
let voteCounts = {};
let replies = {};
let whitelist = {};
let reviewFilterStar = 0;
// ===== Reviews rendering perf =====
const REVIEWS_PAGE_SIZE = 25;
let reviewsVisibleCount = REVIEWS_PAGE_SIZE;

let __reviewsRenderQueued = false;
let __reviewsRenderMode = "full"; // "full" | "list"
function scheduleReviewsRender(mode = "list") {
  // Upgrade to full if any caller requests full.
  if (mode === "full") __reviewsRenderMode = "full";
  else if (!__reviewsRenderQueued) __reviewsRenderMode = mode;

  if (__reviewsRenderQueued) return;
  __reviewsRenderQueued = true;
  requestAnimationFrame(() => {
    __reviewsRenderQueued = false;
    const m = __reviewsRenderMode;
    __reviewsRenderMode = "list";
    if (m === "full") renderReviewsOnly();
    else renderReviewsList();
  });
}


let unsubApp = null;
let unsubReviews = null;
let unsubVotes = null;
let unsubReplies = null;
let unsubWhitelist = null;

backBtn?.addEventListener("click", () => {
  // base href already points to root
  location.href = "./";
});

loginBtn?.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error(e);
    toast("Login gagal.");
  }
});

avatarBtn?.addEventListener("click", async () => {
  if (!currentUser) return;
  const ok = confirm("Logout dari akun ini?");
  if (!ok) return;
  try {
    await signOut(auth);
    toast("Logout berhasil.");
  } catch (e) {
    console.error(e);
    toast("Logout gagal.");
  }
});

onAuthStateChanged(auth, (u) => {
  currentUser = u || null;
  updateAuthUI();
  startWhitelistListener();
  render();
});

function updateAuthUI() {
  if (!loginBtn || !avatarBtn) return;
  if (currentUser) {
    loginBtn.style.display = "none";
    avatarBtn.style.display = "grid";
    if (headerAvatar) {
      headerAvatar.src = currentUser.photoURL || "";
      headerAvatar.style.display = currentUser.photoURL ? "block" : "none";
      headerAvatar.alt = currentUser.displayName || "profil";
    }
  } else {
    loginBtn.style.display = "inline-flex";
    avatarBtn.style.display = "none";
  }
}

function stopListeners() {
  for (const fn of [unsubApp, unsubReviews, unsubVotes, unsubReplies, unsubWhitelist]) {
    if (typeof fn === "function") {
      try { fn(); } catch {}
    }
  }
  unsubApp = unsubReviews = unsubVotes = unsubReplies = unsubWhitelist = null;
}

function startWhitelistListener() {
  // only if logged in
  if (!currentUser) {
    if (typeof unsubWhitelist === "function") {
      try { unsubWhitelist(); } catch {}
    }
    whitelist = {};
    unsubWhitelist = null;
    renderWhitelistButton();
    return;
  }
  if (unsubWhitelist) return;
  const wRef = ref(db, `users/${currentUser.uid}/whitelist`);
  unsubWhitelist = onValue(wRef, (snap) => {
    whitelist = snap.exists() ? (snap.val() || {}) : {};
    renderWhitelistButton();
  });
}

function isWhitelisted(id) {
  if (!id) return false;
  return Boolean(whitelist && Object.prototype.hasOwnProperty.call(whitelist, id));
}

async function addWhitelist(id) {
  if (!currentUser) {
    toast("Login dulu untuk whitelist.");
    return;
  }
  await set(ref(db, `users/${currentUser.uid}/whitelist/${id}`), { addedAt: Date.now() });
  toast("Ditambahkan ke whitelist.");
}

async function removeWhitelist(id) {
  if (!currentUser) {
    toast("Login dulu.");
    return;
  }
  await remove(ref(db, `users/${currentUser.uid}/whitelist/${id}`));
  toast("Dihapus dari whitelist.");
}

async function toggleWhitelist(id) {
  try {
    if (isWhitelisted(id)) await removeWhitelist(id);
    else await addWhitelist(id);
  } catch (e) {
    console.error(e);
    toast("Gagal mengubah whitelist.");
  }
}

function normalizeApp(raw) {
  const a = raw || {};
  return {
    id: appId,
    type: safeText(a.type, ""),
    name: safeText(a.name, "Untitled"),
    description: safeText(a.description, ""),
    version: safeText(a.version, ""),
    size: safeText(a.size, ""),
    updatedAt: a.updatedAt ?? null,
    category: safeText(a.category, "Lainnya"),
    developer: safeText(a.developer, ""),
    minAndroid: safeText(a.minAndroid, ""),
    downloads: Number(a.downloads || 0),
    mod: Boolean(a.mod || false),
    icon: safeText(a.icon, "icon/default.png"),
    downloadUrl: safeText(a.downloadUrl, ""),
    changelog: safeText(a.changelog, ""),
    screenshots: Array.isArray(a.screenshots) ? a.screenshots.slice(0, 12) : []
  };
}

function startAppListeners() {
  stopListeners();

  if (!appId) {
    previewEl.innerHTML = `
      <div class="state">
        ID aplikasi tidak ditemukan.<br/>
        <a class="linkBtn" href="./">Kembali ke Home</a>
      </div>`;
    return;
  }

  unsubApp = onValue(ref(db, `apps/${appId}`), (snap) => {
    appData = snap.exists() ? normalizeApp(snap.val()) : null;
    render();
  });

  unsubReviews = onValue(ref(db, `apps/${appId}/reviews`), (snap) => {
    reviews = snap.exists() ? (snap.val() || {}) : {};
    scheduleReviewsRender("full");
  });

  unsubVotes = onValue(ref(db, `apps/${appId}/reviewVotes`), (snap) => {
    reviewVotes = snap.exists() ? (snap.val() || {}) : {};
    voteCounts = computeVoteCounts(reviewVotes);
    scheduleReviewsRender("list");
  });

  unsubReplies = onValue(ref(db, `apps/${appId}/replies`), (snap) => {
    replies = snap.exists() ? (snap.val() || {}) : {};
    scheduleReviewsRender("list");
  });

  // whitelist listener is handled by auth state
}

function getMyReview() {
  if (!currentUser) return null;
  return reviews?.[currentUser.uid] || null;
}

function canEditReview(review, uid) {
  if (!review) return true;
  if (isAdminUid(uid)) return true;
  const last = Number(review.updatedAt || review.createdAt || 0);
  if (!last) return true;
  return (last + REVIEW_EDIT_COOLDOWN_MS) <= Date.now();
}

function remainingEditMs(review) {
  if (!review || !currentUser || isAdminUid(currentUser.uid)) return 0;
  const last = Number(review.updatedAt || review.createdAt || 0);
  if (!last) return 0;
  return (last + REVIEW_EDIT_COOLDOWN_MS) - Date.now();
}

async function submitReview(stars, comment) {
  if (!currentUser) throw new Error("Not logged in");
  const uid = currentUser.uid;
  const now = Date.now();

  let existing = null;
  try {
    const s = await get(ref(db, `apps/${appId}/reviews/${uid}`));
    existing = s.exists() ? (s.val() || null) : null;
  } catch {}

  if (existing && !isAdminUid(uid)) {
    const last = Number(existing.updatedAt || existing.createdAt || 0);
    const remain = (last + REVIEW_EDIT_COOLDOWN_MS) - now;
    if (remain > 0) {
      const err = new Error("EDIT_COOLDOWN");
      err.remainMs = remain;
      throw err;
    }
  }

  const baseCreatedAt = existing ? Number(existing.createdAt || existing.updatedAt || now) : now;

  const payload = {
    stars: Number(stars),
    comment: String(comment || ""),
    userName: currentUser.displayName || "User",
    userPhoto: currentUser.photoURL || "",
    createdAt: baseCreatedAt,
    updatedAt: now
  };

  await set(ref(db, `apps/${appId}/reviews/${uid}`), payload);
  toast("Ulasan tersimpan.");
}

function myVote(reviewUid) {
  if (!currentUser) return 0;
  return Number(reviewVotes?.[reviewUid]?.[currentUser.uid] || 0);
}

async function voteReview(reviewUid, val) {
  if (!currentUser) {
    toast("Login dulu untuk vote.");
    return;
  }
  try {
    const path = `apps/${appId}/reviewVotes/${reviewUid}/${currentUser.uid}`;
    const v = myVote(reviewUid);
    if (v === val) await remove(ref(db, path));
    else await set(ref(db, path), val);
  } catch (e) {
    console.error(e);
    toast("Gagal vote.");
  }
}

function canReplyTo(reviewUid) {
  if (!currentUser) return false;
  const meAdmin = isAdminUid(currentUser.uid);
  const targetAdmin = isAdminUid(reviewUid);
  return meAdmin || targetAdmin;
}

async function submitReply(targetReviewUid, text) {
  if (!currentUser) throw new Error("Not logged in");
  const uid = currentUser.uid;
  const meAdmin = isAdminUid(uid);
  const targetAdmin = isAdminUid(targetReviewUid);
  if (!meAdmin && !targetAdmin) {
    const err = new Error("Not allowed");
    err.code = "REPLY_NOT_ALLOWED";
    throw err;
  }

  const t = String(text || "").trim();
  if (!t) {
    const err = new Error("Empty");
    err.code = "REPLY_EMPTY";
    throw err;
  }

  const now = Date.now();
  const path = `apps/${appId}/replies/${targetReviewUid}/${uid}`;

  let existing = null;
  try {
    const s = await get(ref(db, path));
    existing = s.exists() ? (s.val() || null) : null;
  } catch {}

  const createdAt = existing ? Number(existing.createdAt || existing.updatedAt || now) : now;

  const payload = {
    uid,
    userName: String(currentUser.displayName || "User"),
    userPhoto: String(currentUser.photoURL || ""),
    role: meAdmin ? "admin" : "user",
    text: t,
    createdAt,
    updatedAt: now
  };

  await set(ref(db, path), payload);
  toast("Balasan tersimpan.");
}

function renderWhitelistButton() {
  const btn = document.getElementById("whitelistBtn");
  if (!btn) return;
  const on = isWhitelisted(appId);
  btn.classList.toggle("on", on);
  btn.innerHTML = `${iconBookmark()} ${on ? "Whitelisted" : "Whitelist"}`;
}

function render() {
  if (!previewEl) return;

  if (!appId) {
    previewEl.innerHTML = `<div class="state">ID aplikasi tidak ditemukan.</div>`;
    return;
  }

  if (!appData) {
    // jangan tampilkan "tidak ditemukan" dulu (biar nggak flicker)
    if (!window.__nfTimer) {
      previewEl.innerHTML = `<div class="state">Memuat aplikasi…</div>`;
      window.__nfTimer = setTimeout(() => {
        if (!appData) previewEl.innerHTML = `<div class="state">Aplikasi tidak ditemukan.</div>`;
        window.__nfTimer = null;
      }, 1200);
    }
    return;
  } else {
    if (window.__nfTimer) { clearTimeout(window.__nfTimer); window.__nfTimer = null; }
  }

  const a = appData;
  const stats = computeReviewStats(reviews);
  const badges = [
    isNew(a.updatedAt) ? `<span class="badge new">NEW</span>` : ``,
    a.mod ? `<span class="badge mod">MOD</span>` : ``
  ].filter(Boolean).join("");

  const shotsHtml = (a.screenshots && a.screenshots.length)
    ? `<div class="shots">
        ${a.screenshots.map((u)=>`<img class="shot" src="${escapeHtml(u)}" alt="screenshot" loading="lazy" decoding="async" />`).join("")}
      </div>`
    : `<div class="state" style="padding:12px">Tidak ada screenshot.</div>`;

  const downloadBtn = a.downloadUrl
    ? `<a class="btn primary" href="${escapeHtml(a.downloadUrl)}" target="_blank" rel="noopener">${iconDownload()} Unduh</a>`
    : `<button class="btn" type="button" disabled style="opacity:.6">${iconDownload()} Unduh</button>`;

  previewEl.innerHTML = `
    <div class="modal" style="margin-top:18px">
      <div class="modalBody" id="previewBody">
        <div class="hero">
          <img class="ico" src="${escapeHtml(a.icon)}" alt="icon" loading="lazy" decoding="async"/>
          <div style="min-width:0;flex:1">
            <h2>${escapeHtml(a.name)} ${badges}</h2>
            <div class="heroSmall">
              <span class="ratingNum">${stats.avg.toFixed(1)}</span>
              ${starsDisplay(stats.avg)}
              <span>•</span>
              <span>${fmtNum(stats.count)} ulasan</span>
              <span>•</span>
              <span>${fmtNum(a.downloads)} download</span>
            </div>

            <div class="actions">
              ${downloadBtn}
              <button class="btn ghost" id="shareBtn" type="button">${iconShare()} Share</button>
              <button class="btn wl" id="whitelistBtn" type="button">${iconBookmark()} Simpan</button>
            </div>
          </div>
        </div>

        <div class="kv">
          <div class="box"><div class="k">Versi</div><div class="v">${escapeHtml(a.version || "-")}</div></div>
          <div class="box"><div class="k">Ukuran</div><div class="v">${escapeHtml(a.size || "-")}</div></div>
          <div class="box"><div class="k">Update</div><div class="v">${escapeHtml(fmtDate(a.updatedAt))}</div></div>
          <div class="box"><div class="k">Kategori</div><div class="v">${escapeHtml(a.category || "-")}</div></div>
          <div class="box"><div class="k">Developer</div><div class="v">${escapeHtml(a.developer || "-")}</div></div>
          <div class="box"><div class="k">Min Android</div><div class="v">${escapeHtml(a.minAndroid || "-")}</div></div>
        </div>

        <div class="panel">
          <div class="panelHead"><h3>Deskripsi</h3></div>
          <p>${escapeHtml(a.description || "-")}</p>
        </div>

        <div class="panel">
          <div class="panelHead"><h3>Screenshot</h3></div>
          ${shotsHtml}
        </div>

        <div class="panel">
          <div class="panelHead"><h3>Changelog</h3></div>
          <p>${escapeHtml(a.changelog || "-")}</p>
        </div>

        <div class="panel" id="reviewsPanel">
          <!-- reviews rendered separately -->
        </div>
      </div>
    </div>
  `;

  // wire actions
  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) {
    shareBtn.onclick = async () => {
      const ok = await copyToClipboard(location.href);
      toast(ok ? "Link disalin." : "Gagal menyalin.");
    };
  }

  const wlBtn = document.getElementById("whitelistBtn");
  if (wlBtn) {
    wlBtn.onclick = () => toggleWhitelist(appId);
  }
  renderWhitelistButton();

  renderReviewsOnly();
}

function renderReviewsOnly() {
  const host = document.getElementById("reviewsPanel");
  if (!host) return;
  // keep pagination sane
  if (!reviewsVisibleCount || reviewsVisibleCount < REVIEWS_PAGE_SIZE) reviewsVisibleCount = REVIEWS_PAGE_SIZE;

  const stats = computeReviewStats(reviews);
  const distTotal = Math.max(1, stats.count);

  const distRows = [5,4,3,2,1].map((star) => {
    const c = stats.dist[star-1] || 0;
    const pct = Math.round((c / distTotal) * 100);
    const active = reviewFilterStar === star;
    return `
      <div class="barRow ${active ? "active" : ""}" data-star="${star}">
        <div>${star}</div>
        <div class="bar"><span style="width:${pct}%"></span></div>
        <div>${c}</div>
      </div>
    `;
  }).join("") + (hasMore ? `
    <button class="btn" data-act="loadMore" type="button" style="align-self:center">Muat lagi</button>
  ` : "");

  const me = getMyReview();
  const meStars = Number(me?.stars || 0);
  const meCanEdit = currentUser ? canEditReview(me, currentUser.uid) : false;
  const rem = me && currentUser && !isAdminUid(currentUser.uid) ? remainingEditMs(me) : 0;

  host.innerHTML = `
    <div class="panelHead">
      <h3>Rating & Ulasan</h3>
      <span class="reviewSummary">
        <span class="ratingNum">${stats.avg.toFixed(1)}</span>
        ${starsDisplay(stats.avg)}
        <span>•</span>
        <span>${fmtNum(stats.count)} ulasan</span>
      </span>
    </div>

    <div class="reviewGrid">
      <div class="reviewStats">
        <div class="bigRating">
          <div class="num">${stats.avg.toFixed(1)}</div>
          <div>${starsDisplay(stats.avg)}</div>
          <div class="hint">${fmtNum(stats.count)} ulasan</div>
        </div>
        <div class="bars" id="barsHost">
          ${distRows}
          <div class="hint" style="margin-top:6px">
            <button class="linkBtn" id="clearFilterBtn" type="button">Reset filter</button>
            <span class="filterPill ${reviewFilterStar ? "show" : ""}" id="filterPill">Filter: ${reviewFilterStar}★</span>
          </div>
        </div>
      </div>

      <div>
        <div class="myReviewCard">
          <div class="myReviewTop">
            <div class="t">Ulasan kamu</div>
            <button class="iconBtn" id="editReviewBtn" type="button" ${(!currentUser || !meCanEdit) ? "disabled" : ""} style="${(!currentUser || !meCanEdit) ? "opacity:.5" : ""}">
              ${iconPencil()}
            </button>
          </div>
          <div class="myReviewMeta">
            ${currentUser ? `
              <span>${me ? `Rating: ${meStars}★` : "Belum ada ulasan"}</span>
              <span>•</span>
              <span>${me ? `Update: ${timeAgo(me.updatedAt || me.createdAt)}` : ""}</span>
            ` : `Login untuk menulis ulasan.`}
          </div>

          <div class="${me?.comment ? "myReviewText" : "myReviewEmpty"}">
            ${currentUser ? (me?.comment ? escapeHtml(me.comment) : "Tulis ulasan kamu...") : "Klik tombol Login Google di atas."}
          </div>

          <div class="editor" id="reviewEditor">
            <div class="rateStars" id="rateStars"></div>
            <div class="hint" id="reviewHint">${rem > 0 ? `Edit terkunci: <span id="editorCountdown">${Math.ceil(rem/1000)}</span> dtk` : "Silakan isi ulasan."}</div>
            <textarea id="reviewText" placeholder="Tulis ulasan..."></textarea>
            <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:10px">
              <button class="btn" id="cancelEditBtn" type="button">Tutup</button>
              <button class="btn primary" id="submitReviewBtn" type="button">Simpan</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="reviewsList" id="reviewsList"></div>
  `;

  // interactions (delegation) - bind once
  if (!host.__bound) {
    host.__bound = true;

    host.addEventListener("click", (ev) => {
      const bar = ev.target.closest(".barRow");
      if (bar && host.contains(bar)) {
        const star = Number(bar.getAttribute("data-star") || "0");
        reviewFilterStar = reviewFilterStar === star ? 0 : star;
        reviewsVisibleCount = REVIEWS_PAGE_SIZE;
        // full re-render (updates active bars + pill)
        renderReviewsOnly();
        return;
      }

      const clear = ev.target.closest("#clearFilterBtn");
      if (clear) {
        reviewFilterStar = 0;
        reviewsVisibleCount = REVIEWS_PAGE_SIZE;
        renderReviewsOnly();
        return;
      }

      const loadMore = ev.target.closest('[data-act="loadMore"]');
      if (loadMore) {
        reviewsVisibleCount += REVIEWS_PAGE_SIZE;
        renderReviewsList();
        return;
      }

      const voteBtn = ev.target.closest(".voteBtn");
      if (voteBtn) {
        const item = voteBtn.closest(".reviewItem");
        const rid = item?.getAttribute("data-review");
        const v = Number(voteBtn.getAttribute("data-v"));
        if (rid) voteReview(rid, v);
        return;
      }

      const toggle = ev.target.closest('[data-act="toggleReply"]');
      if (toggle) {
        const item = toggle.closest(".reviewItem");
        const editor = item?.querySelector(".replyEditor");
        const ta = editor?.querySelector("textarea");
        editor?.classList.toggle("hidden");
        if (editor && !editor.classList.contains("hidden")) {
          setTimeout(() => ta?.focus(), 0);
        }
        return;
      }

      const cancel = ev.target.closest('[data-act="cancelReply"]');
      if (cancel) {
        const item = cancel.closest(".reviewItem");
        item?.querySelector(".replyEditor")?.classList.add("hidden");
        return;
      }

      const send = ev.target.closest('[data-act="sendReply"]');
      if (send) {
        const item = send.closest(".reviewItem");
        const rid = item?.getAttribute("data-review");
        const editor = item?.querySelector(".replyEditor");
        const ta = editor?.querySelector("textarea");
        const txt = (ta?.value || "").trim();
        (async () => {
          try {
            send.disabled = true;
            await submitReply(rid, txt);
            if (ta) ta.value = "";
            editor?.classList.add("hidden");
          } catch (e) {
            console.error(e);
            toast(e?.code === "REPLY_NOT_ALLOWED" ? "Tidak diizinkan membalas." : "Gagal kirim balasan.");
          } finally {
            send.disabled = false;
          }
        })();
        return;
      }
    }, { passive: true });
  }


  // my review editor
  const editBtn = document.getElementById("editReviewBtn");
  const editor = document.getElementById("reviewEditor");
  const rateStars = document.getElementById("rateStars");
  const reviewText = document.getElementById("reviewText");
  const cancelBtn = document.getElementById("cancelEditBtn");
  const submitBtn = document.getElementById("submitReviewBtn");
  const hintEl = document.getElementById("reviewHint");

  let selectedStars = meStars || 5;

  function renderStarPicker() {
    if (!rateStars) return;
    rateStars.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const b = document.createElement("button");
      b.className = "starBtn";
      b.type = "button";
      b.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="${i <= selectedStars ? "var(--star)" : "var(--starOff)"}"
            d="M12 17.3l-6.2 3.4 1.5-7L1.9 8.9l7.2-1L12 1.5l2.9 6.4 7.2 1-5.4 4.8 1.5 7z"/>
        </svg>`;
      b.onclick = () => {
        selectedStars = i;
        renderStarPicker();
      };
      rateStars.appendChild(b);
    }
  }

  function openEditor() {
    if (!currentUser) {
      toast("Login dulu.");
      return;
    }
    if (!editor) return;

    const mine = getMyReview();
    selectedStars = Number(mine?.stars || selectedStars || 5);
    if (reviewText) reviewText.value = mine?.comment || "";
    editor.classList.add("show");
    renderStarPicker();
    // cooldown countdown (simple)
    if (mine && currentUser && !isAdminUid(currentUser.uid)) {
      clearInterval(window.__reviewCooldownTimer);
      const tick = () => {
        const r = remainingEditMs(mine);
        if (!hintEl) return;
        if (r > 0) {
          hintEl.innerHTML = `Edit terkunci: <span id="editorCountdown">${Math.ceil(r/1000)}</span> dtk`;
          if (submitBtn) submitBtn.disabled = true;
        } else {
          hintEl.textContent = "Silakan isi ulasan.";
          if (submitBtn) submitBtn.disabled = false;
          clearInterval(window.__reviewCooldownTimer);
          window.__reviewCooldownTimer = null;
        }
      };
      tick();
      window.__reviewCooldownTimer = setInterval(tick, 1000);
    } else {
      clearInterval(window.__reviewCooldownTimer);
      window.__reviewCooldownTimer = null;
    }
  }

  editBtn?.addEventListener("click", openEditor);
  cancelBtn?.addEventListener("click", () => {
    editor?.classList.remove("show");
    clearInterval(window.__reviewCooldownTimer);
    window.__reviewCooldownTimer = null;
  });

  submitBtn?.addEventListener("click", async () => {
    if (!currentUser) {
      toast("Login dulu.");
      return;
    }
    const txt = (reviewText?.value || "").trim();
    try {
      submitBtn.disabled = true;
      await submitReview(selectedStars, txt);
      editor?.classList.remove("show");
      clearInterval(window.__reviewCooldownTimer);
      window.__reviewCooldownTimer = null;
    } catch (e) {
      console.error(e);
      if (e?.remainMs) {
        toast(`Tunggu ${Math.ceil(e.remainMs/1000)} detik.`);
      } else {
        toast("Gagal simpan ulasan.");
      }
    } finally {
      submitBtn.disabled = false;
    }
  });

  // render reviews list
  renderReviewsList();
}

function renderReviewsList() {
  const listEl = document.getElementById("reviewsList");
  if (!listEl) return;

  const entries = Object.entries(reviews || {})
    .filter(([uid, r]) => Number(r?.stars) >= 1 && Number(r?.stars) <= 5);

  const filtered = reviewFilterStar
    ? entries.filter(([uid, r]) => Number(r.stars) === reviewFilterStar)
    : entries;

  const sorted = filtered.sort((a, b) => {
    const [auid, ar] = a;
    const [buid, br] = b;
    const as = voteCounts?.[auid]?.score ?? 0;
    const bs = voteCounts?.[buid]?.score ?? 0;
    if (!reviewFilterStar && bs !== as) return bs - as; // popular
    const at = Number(ar.updatedAt || ar.createdAt || 0);
    const bt = Number(br.updatedAt || br.createdAt || 0);
    return bt - at;
  });

  if (!sorted.length) {
    listEl.innerHTML = `<div class="state">Belum ada ulasan.</div>`;
    return;
  }

  const view = sorted.slice(0, Math.max(0, reviewsVisibleCount || REVIEWS_PAGE_SIZE));
  const hasMore = view.length < sorted.length;

  listEl.innerHTML = view.map(([uid, r]) => {
    const vc = voteCounts?.[uid] || { like: 0, dislike: 0, score: 0 };
    const my = myVote(uid);
    const rs = Number(r.stars || 0);
    const rTime = timeAgo(r.updatedAt || r.createdAt);

    const replObj = replies?.[uid] || {};
    const replArr = Object.values(replObj || {}).sort((a,b)=>Number(a.createdAt||0)-Number(b.createdAt||0));
    const replHtml = replArr.length
      ? `<div class="replySection">
          <div class="replyList">
            ${replArr.map((x)=>`
              <div class="replyItem">
                <div class="replyTop">
                  <div class="replyName">${escapeHtml(x.userName || (x.role==="admin" ? "Admin" : "User"))}${x.role==="admin" ? ` <span class="adminBadge small">ADMIN</span>` : ""}</div>
                  <div class="rTime">${timeAgo(x.updatedAt || x.createdAt)}</div>
                </div>
                <div class="replyText">${escapeHtml(x.text || "")}</div>
              </div>
            `).join("")}
          </div>
        </div>`
      : "";

    const canReply = canReplyTo(uid);

    return `
      <div class="reviewItem" data-review="${uid}">
        <img class="rAvatar" src="${escapeHtml(r.userPhoto || "icon/default.png")}" alt="avatar" loading="lazy" decoding="async"/>
        <div class="rMain">
          <div class="rTop">
            <div class="rName">
              <span class="rNameText">${escapeHtml(r.userName || "User")}</span>
              ${isAdminUid(uid) ? `<span class="adminBadge small">ADMIN</span>` : ""}
            </div>
            <div class="rTime">${escapeHtml(rTime)}</div>
          </div>
          <div class="reviewSummary" style="margin-top:4px">
            <span class="ratingNum">${rs.toFixed(1)}</span>
            ${starsDisplay(rs)}
          </div>
          <div class="rComment">${escapeHtml(r.comment || "")}</div>

          <div class="voteRow">
            <button class="voteBtn ${my===1 ? "active":""}" data-v="1" type="button">${iconThumbUp()} <span>${vc.like}</span></button>
            <button class="voteBtn ${my===-1 ? "active":""}" data-v="-1" type="button">${iconThumbDown()} <span>${vc.dislike}</span></button>
            ${reviewFilterStar ? `<span class="filterPill show">Filter: ${reviewFilterStar}★</span>` : ""}
          </div>

          ${canReply ? `
            <div class="replyActions">
              <button class="replyBtn" data-act="toggleReply" type="button">Balas</button>
            </div>
            <div class="replyEditor hidden">
              <textarea placeholder="Tulis balasan..."></textarea>
              <div class="row">
                <button class="btn" data-act="cancelReply" type="button">Batal</button>
                <button class="btn primary" data-act="sendReply" type="button">Kirim</button>
              </div>
            </div>
          ` : ""}

          ${replHtml}
        </div>
      </div>
    `;
  }).join("");
}

// boot
startAppListeners();
