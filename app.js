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

    // ====== Firebase config ======
    // ✅ Firebase config kamu
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

    // ====== Helpers ======
    const $ = (id)=>document.getElementById(id);
    const contentEl = $("content");
    const qEl = $("q");
    const countPill = $("countPill");
    const headerExtras = $("headerExtras");
    const overlay = $("overlay");
    const modalBody = $("modalBody");
    const modalTitle = $("modalTitle");
    const closeBtn = $("closeBtn");
    const dialogOverlay = $("dialogOverlay");
    const dialogBody = $("dialogBody");
    const dialogTitle = $("dialogTitle");
    const dialogCloseBtn = $("dialogCloseBtn");
    const toastEl = $("toast");
    const loginBtn = $("loginBtn");
    const avatarBtn = $("avatarBtn");
    const headerAvatar = $("headerAvatar");

    function toast(msg){
      toastEl.textContent = msg;
      toastEl.style.display = "block";
      clearTimeout(toastEl._t);
      toastEl._t = setTimeout(()=>toastEl.style.display="none", 1900);
    }

        async function copyToClipboard(text){
          // Clipboard API (secure context), dengan fallback untuk browser/file lama
          try{
            if (navigator.clipboard && window.isSecureContext){
              await navigator.clipboard.writeText(String(text));
              return true;
            }
          } catch(e){}
          try{
            const ta = document.createElement("textarea");
            ta.value = String(text);
            ta.setAttribute("readonly","");
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            ta.style.top = "0";
            document.body.appendChild(ta);
            ta.select();
            ta.setSelectionRange(0, ta.value.length);
            const ok = document.execCommand("copy");
            document.body.removeChild(ta);
            return !!ok;
          } catch(e){
            return false;
          }
        }
    
    
    function openDialog(title, html){
      // Pastikan tidak ketutup overlay preview/detail
      if (overlay.classList.contains("show")) closeDetail();
      dialogTitle.textContent = title;
      dialogBody.innerHTML = html;
      dialogOverlay.classList.add("show");
      dialogOverlay.setAttribute("aria-hidden","false");
      lockBodyScroll(true);
    }
    function closeDialog(){
      dialogOverlay.classList.remove("show");
      dialogOverlay.setAttribute("aria-hidden","true");
      if (!overlay.classList.contains("show")) lockBodyScroll(false);
    }

    function confirmLogout(){
      openDialog("Logout", `
        <div class="panel">
          <div class="panelHead"><h3>Logout</h3></div>
          <p style="margin:0">Yakin ingin logout dari akun ini?</p>
          <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px">
            <button class="btn" id="dlgCancel" type="button">Batal</button>
            <button class="btn dangerSolid" id="dlgLogout" type="button">Logout</button>
          </div>
        </div>
      `);

      const cancelBtn = document.getElementById("dlgCancel");
      const okBtn = document.getElementById("dlgLogout");
      if (cancelBtn) cancelBtn.onclick = closeDialog;
      if (okBtn) okBtn.onclick = async ()=>{
        okBtn.disabled = true;
        okBtn.style.opacity = ".85";
        try{
          await signOut(auth);
          closeDialog();
          toast("Logout berhasil.");
        } catch(e){
          console.error(e);
          toast("Logout gagal.");
          okBtn.disabled = false;
          okBtn.style.opacity = "1";
        }
      };
    }
    function safeText(v, fallback=""){ return (typeof v === "string" || typeof v === "number") ? String(v) : fallback; }
    function escapeHtml(s){
      return String(s)
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
    }
    function parseDate(v){
      if (!v) return null;
      if (typeof v === "number") return new Date(v);
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    function fmtDate(v){
      const d = parseDate(v);
      if (!d) return "-";
      const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    function timeAgo(ts){
      const d = new Date(Number(ts)||0);
      if (!ts || isNaN(d.getTime())) return "";
      const diff = Math.max(0, Date.now() - d.getTime());
      const m = Math.floor(diff/60000);
      if (m < 1) return "baru saja";
      if (m < 60) return `${m} menit lalu`;
      const h = Math.floor(m/60);
      if (h < 24) return `${h} jam lalu`;
      const day = Math.floor(h/24);
      if (day < 30) return `${day} hari lalu`;
      return fmtDate(d.getTime());
    }
    function fmtNum(n){
      const x = Number(n);
      if (!isFinite(x)) return "0";
      if (x >= 1e6) return (x/1e6).toFixed(1).replace(/\.0$/,"")+"M";
      if (x >= 1e3) return (x/1e3).toFixed(1).replace(/\.0$/,"")+"K";
      return String(Math.round(x));
    }
    function isNew(updatedAt){
      const d = parseDate(updatedAt);
      if (!d) return false;
      const diff = (Date.now() - d.getTime()) / (1000*60*60*24);
      return diff <= 30;
    }

    function starsDisplay(avg){
      const rating = Math.max(0, Math.min(5, Number(avg)||0));
      let html = `<span class="stars" title="Rating ${rating.toFixed(1)}">`;
      for(let i=1;i<=5;i++){
        const on = (i <= Math.round(rating));
        html += `
          <svg viewBox="0 0 24 24" class="${on ? "on":"off"}" aria-hidden="true">
            <path d="M12 17.3l-6.2 3.4 1.5-7L1.9 8.9l7.2-1L12 1.5l2.9 6.4 7.2 1-5.4 4.8 1.5 7z"/>
          </svg>`;
      }
      html += `</span>`;
      return html;
    }
    function starSvg(on){
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="${on ? "var(--star)" : "var(--starOff)"}"
            d="M12 17.3l-6.2 3.4 1.5-7L1.9 8.9l7.2-1L12 1.5l2.9 6.4 7.2 1-5.4 4.8 1.5 7z"/>
        </svg>
      `;
    }
    function iconPencil(){
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
    }
    function iconShare(){
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 8a3 3 0 1 0-2.8-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 12l10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 12l10 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="2"/><path d="M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="2"/></svg>`;
    }
    function iconDownload(){
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 11l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 21h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    }
    function iconBookmark(){
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
    }
    function iconThumbUp(){
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 10V4a2 2 0 0 0-2-2L7 12v10h10a2 2 0 0 0 2-1.5l2-7A2 2 0 0 0 19 10h-5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 12H4v10h3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
    }
    function iconThumbDown(){
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 14v6a2 2 0 0 0 2 2l5-10V2H7a2 2 0 0 0-2 1.5l-2 7A2 2 0 0 0 5 14h5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M17 12h3V2h-3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
    }

    function iconChevronRight(){
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M10 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    }
    function iconChevronDown(){
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 10l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    }

    function computeReviewStats(reviewsObj){
      if (!reviewsObj || typeof reviewsObj !== "object") return { avg: 0, count: 0, dist:[0,0,0,0,0] };
      let sum = 0, count = 0;
      const dist = [0,0,0,0,0];
      for (const uid in reviewsObj){
        const s = Number(reviewsObj[uid]?.stars);
        if (isFinite(s) && s >= 1 && s <= 5){
          sum += s; count += 1;
          dist[s-1] += 1;
        }
      }
      return { avg: count ? (sum/count) : 0, count, dist };
    }

    function computeVoteCounts(votesObj){
      const counts = {};
      if (!votesObj || typeof votesObj !== "object") return counts;
      for (const reviewUid of Object.keys(votesObj)){
        const m = votesObj[reviewUid] || {};
        let like = 0, dislike = 0;
        for (const voterUid of Object.keys(m)){
          const val = Number(m[voterUid]);
          if (val === 1) like += 1;
          else if (val === -1) dislike += 1;
        }
        counts[reviewUid] = { like, dislike, score: like - dislike };
      }
      return counts;
    }

    // ====== Firebase init ======
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();

    // ====== Keyboard fix: hide bottom nav when keyboard open ======
    let _kbdRaf = 0;
let _kbdOpen = null;
function updateKeyboardState(){
  if (_kbdRaf) return;
  _kbdRaf = requestAnimationFrame(()=>{
    _kbdRaf = 0;
    const vv = window.visualViewport;
    if (!vv) return;
    const ratio = vv.height / window.innerHeight;
    const open = ratio < 0.78; // threshold
    if (_kbdOpen === open) return;
    _kbdOpen = open;
    document.body.classList.toggle("kbd", open);
  });
}
    if (window.visualViewport){
      try{ window.visualViewport.addEventListener("resize", updateKeyboardState, {passive:true}); }catch{ window.visualViewport.addEventListener("resize", updateKeyboardState); }
      try{ window.visualViewport.addEventListener("scroll", updateKeyboardState, {passive:true}); }catch{ window.visualViewport.addEventListener("scroll", updateKeyboardState); }
    }
    document.addEventListener("focusin",(e)=>{
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")){
        setTimeout(updateKeyboardState, 0);
      }
    });
    document.addEventListener("focusout",(e)=>{
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")){
        setTimeout(updateKeyboardState, 50);
      }
    });

    // ====== State ======
    let currentUser = null;
    let allApps = [];
    let currentAppId = null;

    // modal listeners
    let unsubscribeReviews = null;
    let unsubscribeVotes = null;
    let unsubscribeReplies = null;

    let currentReplies = {}; // {reviewUid:{replyUid:{text,uid,role,createdAt,updatedAt}}}

    // user whitelist listener
    let unsubscribeWhitelist = null;
    let whitelist = {}; // {appId: true|{addedAt}}

    // detail state
    let reviewFilterStar = 0; // 0=default (popular by likes), else 1..5
    let currentVotes = {};    // raw votes
    let voteCounts = {};      // {reviewUid:{like,dislike,score}}

    const state = {
      tab: "apps",      // apps|games
      page: "home",     // home|top|profile
      query: "",
      sort: "popular"   // popular|rating|latest (ONLY on Top page)
    };

    // ====== Admin badge ======
    const ADMIN_UID = "DAQG3iy23JekAyRb4PDQPORIeKY2";
    function isAdminUid(uid){
      return String(uid || "") === ADMIN_UID;
    }



    // ====== Review edit cooldown ======
    const REVIEW_EDIT_COOLDOWN_MS = 30 * 1000;

    /**
     * Non-admin: setelah mengirim / perbarui ulasan, tombol edit terkunci 30 detik.
     * Admin: bebas edit.
     */
    function getReviewEditRemainingMs(review, uid){
      if (!review) return 0;
      if (isAdminUid(uid)) return Infinity;
      const updated = Number(review.updatedAt || review.createdAt || 0);
      if (!updated) return 0;
      return (updated + REVIEW_EDIT_COOLDOWN_MS) - Date.now();
    }
    function canEditReview(review, uid){
      const rem = getReviewEditRemainingMs(review, uid);
      return rem === Infinity || rem <= 0;
    }

    // ====== Realtime edit cooldown countdown (30 detik) ======
    let _reviewEditTicker = null;
    let _reviewEditTickerAppId = null;

    function stopReviewEditTicker(){
      if (_reviewEditTicker){
        try{ clearInterval(_reviewEditTicker); }catch{}
      }
      _reviewEditTicker = null;
      _reviewEditTickerAppId = null;
    }

    function startReviewEditTicker(appId){
      stopReviewEditTicker();
      _reviewEditTickerAppId = appId;

      // only run when there is a review AND still locked (non-admin)
      if (!currentUser || !currentAppId) return;
      const a0 = appById(appId);
      const mine0 = a0?.reviews?.[currentUser.uid] || null;
      if (!mine0) return;
      const rem0 = getReviewEditRemainingMs(mine0, currentUser.uid);
      if (rem0 === Infinity || rem0 <= 0) return;

      const tick = ()=>{
        if (!currentUser || !currentAppId || currentAppId !== _reviewEditTickerAppId){
          stopReviewEditTicker();
          return;
        }
        const a = appById(_reviewEditTickerAppId);
        const mine = a?.reviews?.[currentUser.uid] || null;
        if (!mine){
          stopReviewEditTicker();
          return;
        }
        const rem = getReviewEditRemainingMs(mine, currentUser.uid);
        if (rem === Infinity){
          stopReviewEditTicker();
          return;
        }

        const editBtn = document.getElementById("editReviewBtn");
        const submitBtn = document.getElementById("submitReviewBtn");
        const hintEl = document.getElementById("reviewHint");
        const editorEl = document.getElementById("reviewEditor");
        const editorOpen = editorEl?.classList?.contains("show");

        if (rem > 0){
          const secs = Math.max(0, Math.ceil(rem/1000));
          const c1 = document.getElementById("editCountdown");
          if (c1) c1.textContent = String(secs);
          const c2 = document.getElementById("editorCountdown");
          if (c2) c2.textContent = String(secs);

          if (editBtn){
            editBtn.disabled = true;
            editBtn.style.opacity = ".5";
          }
          if (submitBtn && editorOpen) submitBtn.disabled = true;

          if (hintEl){
            // keep existing countdown node if present
            if (hintEl.querySelector("#editorCountdown")){
              // no-op (tick updates the span)
            } else {
              hintEl.innerHTML = `Edit terkunci: <span id="editorCountdown">${secs}</span> dtk`;
            }
          }
          return;
        }

        // unlocked
        if (editBtn){
          editBtn.disabled = false;
          editBtn.style.opacity = "1";
        }
        if (submitBtn && editorOpen) submitBtn.disabled = false;

        // rerender summary to remove countdown label
        try{
          const a2 = appById(_reviewEditTickerAppId);
          refreshMyReviewSummary(_reviewEditTickerAppId, a2?.reviews || {});
        }catch{}

        if (hintEl && (hintEl.querySelector("#editorCountdown") || String(hintEl.textContent||"").includes("Edit terkunci"))){
          hintEl.textContent = "Silakan edit.";
        }

        stopReviewEditTicker();
      };

      tick();
      _reviewEditTicker = setInterval(tick, 1000);
    }



    function updateHeaderVisibility(){
      headerExtras.classList.toggle("hidden", state.page === "profile");
    }

    function typeOfApp(a){
      const t = String(a.type || "").toLowerCase().trim();
      if (t === "game" || t === "games") return "games";
      if (t === "apk" || t === "aplikasi") return "apps";
      if (t === "app" || t === "apps") return "apps";
      return "apps";
    }

    function normalizeApps(raw){
      const arr = [];
      if (!raw || typeof raw !== "object") return arr;
      for(const id of Object.keys(raw)){
        const a = raw[id] || {};
        arr.push({
          id,
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
          screenshots: Array.isArray(a.screenshots) ? a.screenshots.slice(0, 12) : [],
          reviews: (a.reviews && typeof a.reviews === "object") ? a.reviews : null
        });
      }
      return arr;
    }

    // ====== Auth ======
    function stopWhitelistListener(){
      if (typeof unsubscribeWhitelist === "function"){
        try{ unsubscribeWhitelist(); }catch{}
      }
      unsubscribeWhitelist = null;
      whitelist = {};
    }
    function startWhitelistListener(uid){
      stopWhitelistListener();
      const wRef = ref(db, `users/${uid}/whitelist`);
      unsubscribeWhitelist = onValue(wRef, (snap)=>{
        whitelist = snap.exists() ? (snap.val() || {}) : {};
        // update button state if modal open
        if (currentAppId) updateWhitelistButton(currentAppId);
        if (state.page === "profile") render();
      });
    }

    onAuthStateChanged(auth, (user)=>{
      currentUser = user || null;
      if (currentUser){
        loginBtn.style.display = "none";
        avatarBtn.style.display = "grid";
        headerAvatar.src = currentUser.photoURL || "icon/default.png";
        startWhitelistListener(currentUser.uid);
      } else {
        loginBtn.style.display = "inline-flex";
        avatarBtn.style.display = "none";
        stopWhitelistListener();
      }

      if (currentAppId) refreshReviewForm(currentAppId);
      if (state.page === "profile") render();
    });

    loginBtn.onclick = async ()=>{
      try{
        await signInWithPopup(auth, provider);
        toast("Login berhasil!");
      } catch (e){
        toast("Login gagal. Cek Authorized domains.");
        console.error(e);
      }
    };

    avatarBtn.onclick = ()=>{
      state.page = "profile";
      setActiveNav();
      updateHeaderVisibility();
      render();
      window.scrollTo({top:0, behavior:"smooth"});
    };

    // ====== Tabs + Nav ======
    document.getElementById("mainTabs").addEventListener("click",(e)=>{
      const tab = e.target?.dataset?.tab;
      if (!tab) return;
      state.tab = tab;
      // keep current page (home/top/profile) when switching tab
      // so switching Apps/Game does not force back to Home.
      setActiveTabs();
      setActiveNav();
      updateHeaderVisibility();
      render();
      window.scrollTo({top:0, behavior:"smooth"});
    });

    document.querySelectorAll(".navBtn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        state.page = btn.dataset.page;
        setActiveNav();
        updateHeaderVisibility();
        render();
        window.scrollTo({top:0, behavior:"smooth"});
      });
    });

    function setActiveTabs(){
      document.querySelectorAll(".tab").forEach(t=>{
        t.classList.toggle("active", t.dataset.tab === state.tab);
      });
    }
    function setActiveNav(){
      document.querySelectorAll(".navBtn").forEach(b=>{
        b.classList.toggle("active", b.dataset.page === state.page);
      });
    }

    // ====== Search ======
    let tmr = null;
    qEl.addEventListener("input", ()=>{
      clearTimeout(tmr);
      tmr = setTimeout(()=>{
        state.query = qEl.value || "";
        state.page = "home";
        setActiveNav();
        updateHeaderVisibility();
        render();
      }, 120);
    });

    function matchesQuery(a){
      const q = state.query.trim().toLowerCase();
      if (!q) return true;
      const hay = `${a.name} ${a.description} ${a.category} ${a.developer} ${a.version}`.toLowerCase();
      return hay.includes(q);
    }
    function filteredByTab(){
      return allApps.filter(a => typeOfApp(a) === state.tab);
    }
    function filteredApps(){
      return filteredByTab().filter(a => matchesQuery(a));
    }

    function sortItems(items, sortKey){
      const copy = items.slice();
      if (sortKey === "latest"){
        return copy.sort((x,y)=>{
          const dx = parseDate(x.updatedAt)?.getTime() || 0;
          const dy = parseDate(y.updatedAt)?.getTime() || 0;
          return dy - dx;
        });
      }
      if (sortKey === "rating"){
        return copy.sort((x,y)=>{
          const rx = computeReviewStats(x.reviews).avg;
          const ry = computeReviewStats(y.reviews).avg;
          if (ry !== rx) return ry - rx;
          return (Number(y.downloads||0)-Number(x.downloads||0));
        });
      }
      // popular
      return copy.sort((x,y)=>(Number(y.downloads||0)-Number(x.downloads||0)));
    }

    // ====== Categories list (no chips) ======
    function categoriesForTab(){
      const cats = new Map();
      for (const a of filteredByTab()){
        const c = a.category || "Lainnya";
        cats.set(c, (cats.get(c)||0)+1);
      }
      return Array.from(cats.entries()).sort((x,y)=>y[1]-x[1]).map(([c])=>c);
    }

    // ====== UI components ======
    function createTile(a){
      const {avg} = computeReviewStats(a.reviews);
      const div = document.createElement("div");
      div.className = "tile";
      div.onclick = ()=>openDetail(a.id);
      div.innerHTML = `
        <img class="ico" src="${a.icon || "icon/default.png"}" alt="${escapeHtml(a.name)}" onerror="this.src='icon/default.png'">
        <div class="tileMain">
          <p class="tileName">${escapeHtml(a.name)}</p>
          <div class="tileMeta">
            <span>${starsDisplay(avg)}</span>
            <span class="ratingNum">${avg ? avg.toFixed(1) : "0.0"}</span>
          </div>
        </div>
      `;
      return div;
    }

    function createRowCard(a, idx=null, minimalMeta=false){
      const {avg, count} = computeReviewStats(a.reviews);
      const card = document.createElement("div");
      card.className = "rowCard";
      card.onclick = ()=>openDetail(a.id);

      const badges = [];
      if (isNew(a.updatedAt)) badges.push(`<span class="badge new">NEW</span>`);
      if (a.mod) badges.push(`<span class="badge mod">MOD</span>`);
      const rank = (idx !== null) ? `<span class="badge" style="margin-right:6px">#${idx+1}</span>` : ``;

      card.innerHTML = `
        <img class="ico" src="${a.icon || "icon/default.png"}" alt="${escapeHtml(a.name)}" onerror="this.src='icon/default.png'">
        <div class="rowMain">
          <div class="rowTitle">
            <h3 class="rowName">${rank}${escapeHtml(a.name)}</h3>
            <div style="display:flex;gap:6px;align-items:center">${badges.join("")}</div>
          </div>
          <div class="rowDesc">${escapeHtml(a.description || "-")}</div>
          ${minimalMeta ? "" : `
            <div class="rowMeta">
              <span>${starsDisplay(avg)}</span>
              <span class="ratingNum">${avg ? avg.toFixed(1) : "0.0"}</span>
              <span>(${count})</span>
              <span>•</span>
              <span>${fmtNum(a.downloads)} download</span>
              <span>•</span>
              <span>Update ${fmtDate(a.updatedAt)}</span>
            </div>
          `}
        </div>
        <button class="btnInstall" type="button">${iconDownload()} Install</button>
      `;

      const btn = card.querySelector(".btnInstall");
      btn.onclick = (e)=>{
        e.stopPropagation();
        if (!a.downloadUrl){
          toast("Link download belum diisi.");
          return;
        }
        window.open(a.downloadUrl, "_blank", "noopener");
      };

      return card;
    }

    function sectionBlock(title, items, onSeeAll){
      const section = document.createElement("section");
      section.className = "section";
      const head = document.createElement("div");
      head.className = "sectionHead";
      head.innerHTML = `
        ${onSeeAll
          ? `<button class="sectionLink" type="button" aria-label="Buka ${escapeHtml(title)}">
              <span class="sectionTitle">${escapeHtml(title)}</span>
              <span class="chevMini">${iconChevronRight()}</span>
            </button>`
          : `<div class="sectionTitle">${escapeHtml(title)}</div>`
        }
      `;
      if (onSeeAll) head.querySelector("button").onclick = onSeeAll;

      const row = document.createElement("div");
      row.className = "hscroll";
      for(const a of items){ row.appendChild(createTile(a)); }

      section.appendChild(head);
      section.appendChild(row);
      return section;
    }

    function bannerCard(a){
      const {avg, count} = computeReviewStats(a.reviews);
      const div = document.createElement("div");
      div.className = "banner";
      div.onclick = ()=>openDetail(a.id);

      const bg = (a.screenshots && a.screenshots.length) ? a.screenshots[0] : (a.icon || "icon/default.png");

      div.innerHTML = `
        <div class="bannerBg"></div>
        <img class="bannerImg" src="${bg}" alt="" onerror="this.style.display='none'">
        <div class="bannerInner">
          <img class="bannerIco" src="${a.icon || "icon/default.png"}" alt="${escapeHtml(a.name)}" onerror="this.src='icon/default.png'">
          <div class="bannerMain">
            <h3 class="bannerTitle">${escapeHtml(a.name)}</h3>
            <div class="bannerDesc">${escapeHtml(a.description || "")}</div>
            <div class="bannerMeta">
              <span>${starsDisplay(avg)}</span>
              <span class="ratingNum">${avg ? avg.toFixed(1) : "0.0"}</span>
              <span>(${count})</span>
              <span>•</span>
              <span>${fmtNum(a.downloads)} download</span>
            </div>
          </div>
          <button class="bannerCta" type="button">Lihat</button>
        </div>
      `;

      div.querySelector(".bannerCta").onclick = (e)=>{
        e.stopPropagation();
        openDetail(a.id);
      };
      return div;
    }

    // ====== Pages ======
    function renderHome(){
      const apps = filteredApps();
      countPill.textContent = `${apps.length}`;
      contentEl.innerHTML = "";

      if (apps.length === 0){
        contentEl.innerHTML = `<div class="state">Belum ada data di tab ini. Tambahkan data di RTDB: <b>apps/{appId}</b></div>`;
        return;
      }

      // Search results (list)
      if (state.query.trim()){
        const head = document.createElement("div");
        head.className = "sectionHead";
        head.innerHTML = `<div class="sectionTitle">Hasil pencarian</div><div class="pill">${apps.length} hasil</div>`;
        contentEl.appendChild(head);

        const vlist = document.createElement("div");
        vlist.className = "vlist";
        sortItems(apps, "popular").slice(0, 120).forEach((a)=>vlist.appendChild(createRowCard(a, null)));
        contentEl.appendChild(vlist);
        return;
      }

      // Banner populer
      const topPopular = sortItems(apps, "popular").slice(0, 6);
      const bannerSec = document.createElement("section");
      bannerSec.className = "section";
      bannerSec.innerHTML = `
        <div class="sectionHead">
          <div class="sectionTitle">${state.tab === "games" ? "Populer Game" : "Populer Aplikasi"}</div>
          <button class="arrowBtn" type="button" id="goTopBtn" aria-label="Buka Top">${iconChevronRight()}</button>
        </div>
      `;
      const row = document.createElement("div");
      row.className = "bannerRow";
      topPopular.forEach(a => row.appendChild(bannerCard(a)));
      bannerSec.appendChild(row);
      contentEl.appendChild(bannerSec);
      bannerSec.querySelector("#goTopBtn").onclick = ()=>{
        state.page = "top";
        setActiveNav();
        updateHeaderVisibility();
        render();
      };

      // kategori sections
      const cats = categoriesForTab().slice(0, 12);
      for (const c of cats){
        const items = sortItems(apps.filter(a => (a.category || "Lainnya") === c), "popular");
        if (!items.length) continue;
        contentEl.appendChild(sectionBlock(c, items.slice(0, 12), ()=>{
          state.page = "top";
          setActiveNav();
          updateHeaderVisibility();
          render();
        }));
      }
    }

    function renderTop(){
      const apps = filteredApps();
      countPill.textContent = `${apps.length}`;
      contentEl.innerHTML = "";

      const head = document.createElement("div");
      head.className = "sectionHead";
      head.innerHTML = `
        <div class="sectionTitle">Top ${state.tab === "games" ? "Game" : "Aplikasi"}</div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div class="pill">Urutkan</div>
          <select id="sortOnly" class="selectPill" aria-label="Urutkan daftar">
            <option value="popular">Populer</option>
            <option value="rating">Rating</option>
            <option value="latest">Terbaru</option>
          </select>
        </div>
      `;
      contentEl.appendChild(head);

      const sortOnly = head.querySelector("#sortOnly");
      sortOnly.value = state.sort;
      sortOnly.onchange = ()=>{
        state.sort = sortOnly.value;
        render();
      };

      const vlist = document.createElement("div");
      vlist.className = "vlist";
      const sorted = sortItems(apps, state.sort);
      if (sorted.length === 0){
        vlist.innerHTML = `<div class="state">Tidak ada data.</div>`;
      } else {
        sorted.slice(0, 200).forEach((a,i)=>vlist.appendChild(createRowCard(a, i)));
      }
      contentEl.appendChild(vlist);
    }

    function appById(id){ return allApps.find(x=>x.id===id); }

    async function renderProfile(){
      contentEl.innerHTML = "";
      countPill.textContent = "";

      const shell = document.createElement("div");
      shell.className = "profileShell";

      // Guest
      if (!currentUser){
        shell.innerHTML = `
          <div class="profileHero">
            <div class="profileCover"></div>
            <div class="profileBody">
              <img class="profileAvatar" src="icon/default.png" alt="avatar" onerror="this.src='icon/default.png'">
              <div class="profileHeaderRow">
                <div style="min-width:0">
                  <p class="pName">Guest</p>
                  <div class="pEmail">Login untuk whitelist & ulasan</div>
                </div>
                <div class="profileActions">
                  <button class="ghostBtn" id="pLogin">Login Google</button>
                </div>
              </div>

              <div class="profileStats">
                 <div class="stat"><div class="k">Whitelist</div><div class="v">0</div></div>
                 <div class="stat"><div class="k">UID</div><div class="v">-</div></div>
               </div>
            </div>
          </div>

          <div class="cardList">
            <div class="cardListHead"><h3>Akun</h3><span class="pill">Masuk untuk fitur lengkap</span></div>
            <div class="cardListBody">
              <div class="settingRow" id="rLogin">
                <div class="settingLeft">
                  <div class="settingIcon">🔐</div>
                  <div class="settingText">
                    <div class="settingTitle">Login <span class="chevMini">›</span></div>
                    <div class="settingDesc">Whitelist & 1 akun = 1 ulasan</div>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        `;
        contentEl.appendChild(shell);

        shell.querySelector("#pLogin").onclick = ()=>loginBtn.click();
        shell.querySelector("#rLogin").onclick = ()=>loginBtn.click();
        return;
      }

      const wIds = Object.keys(whitelist || {});
      const wItems = wIds.map(id => appById(id)).filter(Boolean);

      shell.innerHTML = `
        <div class="profileHero">
          <div class="profileCover"></div>
          <div class="profileBody">
            <img class="profileAvatar" src="${currentUser.photoURL || "icon/default.png"}" alt="avatar" onerror="this.src='icon/default.png'">
            <div class="profileHeaderRow">
              <div style="min-width:0">
                <p class="pName"><span class="pNameText">${escapeHtml(currentUser.displayName || "User")}</span>${isAdminUid(currentUser.uid) ? '<span class="adminBadge" title="Admin">ADMIN</span>' : ''}</p>
                <div class="pEmail">${escapeHtml(currentUser.email || "-")}</div>
              </div>
            </div>

            <div class="profileStats">
              <div class="stat"><div class="k">Whitelist</div><div class="v">${wItems.length}</div></div>
              <div class="stat"><div class="k">UID</div><div class="v copyable" id="uidCopy" title="Klik untuk menyalin UID">${escapeHtml(currentUser.uid).slice(0,8)}…</div></div>
            </div>
          </div>
        </div>

        <div class="cardList" id="wlCard">
          <div class="cardListHead">
            <h3>Whitelist</h3>
            <span class="pill">${wItems.length ? "Tap untuk buka" : "Kosong"}</span>
          </div>
          <div class="cardListBody" id="wlBody"></div>
        </div>

        
                ${isAdminUid(currentUser.uid) ? `
        
        <div class="cardList">
                  <div class="cardListHead"><h3>Admin</h3><span class="pill">v1</span></div>
                  <div class="cardListBody">
                    <div class="settingRow" id="howData">
                      <div class="settingLeft">
                        <div class="settingIcon">🧩</div>
                        <div class="settingText">
                          <div class="settingTitle">Struktur data <span class="chevMini">›</span></div>
                          <div class="settingDesc">apps/{appId} + reviews/{uid} + whitelist</div>
                        </div>
                      </div>
                    </div>

                    <div class="settingRow" id="rulesTip">
                      <div class="settingLeft">
                        <div class="settingIcon">🛡️</div>
                        <div class="settingText">
                          <div class="settingTitle">Keamanan <span class="chevMini">›</span></div>
                          <div class="settingDesc">Rules: auth.uid == $uid (review & whitelist)</div>
                        </div>
                      </div>
                    </div>

                    <div class="settingRow" id="logoutRow">
                      <div class="settingLeft">
                        <div class="settingIcon">🚪</div>
                        <div class="settingText">
                          <div class="settingTitle">Logout <span class="chevMini">›</span></div>
                          <div class="settingDesc">Keluar dari akun Google</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                ` : `
        
        <div class="cardList">
                  <div class="cardListHead"><h3>Akun</h3><span class="pill">Login</span></div>
                  <div class="cardListBody">
                    <div class="settingRow" id="logoutRow">
                      <div class="settingLeft">
                        <div class="settingIcon">🚪</div>
                        <div class="settingText">
                          <div class="settingTitle">Logout <span class="chevMini">›</span></div>
                          <div class="settingDesc">Keluar dari akun Google</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                `}
      `;
      contentEl.appendChild(shell);

      const howDataRow = shell.querySelector("#howData");
      if (howDataRow) howDataRow.onclick = ()=>{
        openDialog("Struktur data", `
          <div class="panel">
            <div class="panelHead"><h3>Struktur data</h3></div>
            <p>
              Data tersimpan di Firebase Realtime Database (RTDB).

              • apps/{appId} → metadata aplikasi/game

              • apps/{appId}/reviews/{uid} → 1 akun = 1 ulasan

              • users/{uid}/whitelist/{appId} → item yang kamu simpan
            </p>
          </div>
        `);
      };

      const rulesTipRow = shell.querySelector("#rulesTip");
      if (rulesTipRow) rulesTipRow.onclick = ()=>{
        openDialog("Keamanan", `
          <div class="panel">
            <div class="panelHead"><h3>Keamanan</h3></div>
            <p>
              Saran rules dasar:

              • Write review hanya untuk auth.uid milik user

              • Whitelist hanya boleh write/read oleh user terkait

              • Votes ulasan juga dibatasi auth.uid

              (Supaya tidak ada user lain yang mengubah data akunmu.)
            </p>
          </div>
        `);
      };

      shell.querySelector("#logoutRow").onclick = ()=>confirmLogout();


      // Tap UID untuk auto-copy (tanpa tombol)
      const uidCopyEl = shell.querySelector("#uidCopy");
      if (uidCopyEl){
        uidCopyEl.onclick = async ()=>{
          const ok = await copyToClipboard(currentUser.uid);
          if (ok){
            toast("UID disalin.");
            try{ navigator.vibrate?.(18); }catch{}
          } else {
            toast("Gagal menyalin UID.");
          }
        };
      }


      const wlBody = shell.querySelector("#wlBody");
      if (!wItems.length){
        wlBody.innerHTML = `<div class="state" style="margin:0">Belum ada whitelist. Buka detail item → tambahkan ke whitelist.</div>`;
      } else {
        const list = document.createElement("div");
        list.className = "vlist";
        wItems.slice(0, 120).forEach((a)=>{
          const card = createRowCard(a, null, true);
          // replace install button -> remove from whitelist
          const btn = card.querySelector(".btnInstall");
          btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Hapus`;
          btn.style.background = "rgba(239,68,68,.10)";
          btn.style.borderColor = "rgba(239,68,68,.22)";
          btn.style.color = "#b91c1c";
          btn.onclick = async (e)=>{
            e.stopPropagation();
            await removeWhitelist(a.id);
          };
          list.appendChild(card);
        });
        wlBody.appendChild(list);
      }
    }

    function render(){
      if (state.page === "top") return renderTop();
      if (state.page === "profile") return renderProfile();
      return renderHome();
    }

    // ====== Whitelist ======
    function isWhitelisted(appId){
      return Boolean(whitelist && whitelist[appId]);
    }
    async function addWhitelist(appId){
      if (!currentUser){
        toast("Login dulu untuk whitelist.");
        return false;
      }
      await set(ref(db, `users/${currentUser.uid}/whitelist/${appId}`), { addedAt: Date.now() });
      toast("Ditambahkan ke whitelist.");
      return true;
    }
    async function removeWhitelist(appId){
      if (!currentUser){
        toast("Login dulu.");
        return false;
      }
      await remove(ref(db, `users/${currentUser.uid}/whitelist/${appId}`));
      toast("Dihapus dari whitelist.");
      return true;
    }
    async function toggleWhitelist(appId){
      if (isWhitelisted(appId)) return removeWhitelist(appId);
      return addWhitelist(appId);
    }
    function updateWhitelistButton(appId){
      const btn = document.getElementById("whitelistBtn");
      if (!btn) return;
      const on = isWhitelisted(appId);
      btn.classList.toggle("on", on);
      btn.innerHTML = `${iconBookmark()} ${on ? "Whitelisted" : "Whitelist"}`;
    }

    // ====== Votes for reviews ======
    function myVote(reviewUid){
      if (!currentUser) return 0;
      return Number(currentVotes?.[reviewUid]?.[currentUser.uid] || 0);
    }
    async function setVote(appId, reviewUid, val){
      if (!currentUser){
        toast("Login dulu untuk vote.");
        return;
      }
      const path = `apps/${appId}/reviewVotes/${reviewUid}/${currentUser.uid}`;
      const v = myVote(reviewUid);
      // toggle behavior
      if (v === val){
        await remove(ref(db, path));
      } else {
        await set(ref(db, path), val);
      }
    }

    // ====== Reviews LIVE + filter ======
    function setReviewFilter(star){
      reviewFilterStar = star;
      const pill = document.getElementById("filterPill");
      if (pill){
        pill.classList.toggle("show", reviewFilterStar !== 0);
        pill.textContent = reviewFilterStar ? `Filter: ${reviewFilterStar}★` : "";
      }
      // highlight bars
      document.querySelectorAll(".barRow").forEach(r=>{
        const s = Number(r.dataset.star || 0);
        r.classList.toggle("active", reviewFilterStar !== 0 && s === reviewFilterStar);
      });
      if (currentAppId){
        const a = appById(currentAppId);
        renderReviewsList(currentAppId, a?.reviews || {});
      }
    }

    function updateReviewStatsUI(reviews){
      const stats = computeReviewStats(reviews || {});
      const avg = stats.avg ? stats.avg.toFixed(1) : "0.0";

      // Hero
      const heroStars = document.getElementById("heroStars");
      const heroAvg = document.getElementById("heroAvg");
      const heroCount = document.getElementById("heroCount");
      if (heroStars) heroStars.innerHTML = starsDisplay(stats.avg);
      if (heroAvg) heroAvg.textContent = avg;
      if (heroCount) heroCount.textContent = `(${stats.count} ulasan)`;

      // Panel header
      const avgStarsEl = document.getElementById("avgStars");
      const avgNum = document.getElementById("avgNum");
      const reviewCount = document.getElementById("reviewCount");
      if (avgStarsEl) avgStarsEl.innerHTML = starsDisplay(stats.avg);
      if (avgNum) avgNum.textContent = avg;
      if (reviewCount) reviewCount.textContent = `(${stats.count})`;

      // Big
      const bigAvg = document.getElementById("bigAvg");
      const bigStars = document.getElementById("bigStars");
      const bigCount = document.getElementById("bigCount");
      if (bigAvg) bigAvg.textContent = avg;
      if (bigStars) bigStars.innerHTML = starsDisplay(stats.avg);
      if (bigCount) bigCount.textContent = `${stats.count} ulasan`;

      // Bars
      const total = Math.max(1, stats.count);
      [5,4,3,2,1].forEach((s)=>{
        const span = document.querySelector(`.bar > span[data-star="${s}"]`);
        const pctEl = document.querySelector(`.barPct[data-star="${s}"]`);
        if (!span) return;
        const c = stats.dist[s-1] || 0;
        const pct = Math.round((c/total)*100);
        span.style.width = pct + "%";
        if (pctEl) pctEl.textContent = pct + "%";
      });
    }

    function stopDetailListeners(){
      if (typeof unsubscribeReviews === "function"){
        try{ unsubscribeReviews(); }catch{}
      }
      if (typeof unsubscribeVotes === "function"){
        try{ unsubscribeVotes(); }catch{}
      }
      if (typeof unsubscribeReplies === "function"){
        try{ unsubscribeReplies(); }catch{}
      }
      unsubscribeReviews = null;
      unsubscribeVotes = null;
      unsubscribeReplies = null;
      currentVotes = {};
      voteCounts = {};
      currentReplies = {};
      stopReviewEditTicker();
    }

    function attachReviewsListener(appId){
      stopDetailListeners();

      const rRef = ref(db, `apps/${appId}/reviews`);
      unsubscribeReviews = onValue(rRef, (snap)=>{
        const reviews = snap.exists() ? snap.val() : {};
        const idx = allApps.findIndex(x=>x.id===appId);
        if (idx !== -1) allApps[idx].reviews = reviews;

        updateReviewStatsUI(reviews);
        renderReviewsList(appId, reviews);
        refreshMyReviewSummary(appId, reviews);
        startReviewEditTicker(appId);
      });

      const vRef = ref(db, `apps/${appId}/reviewVotes`);
      unsubscribeVotes = onValue(vRef, (snap)=>{
        currentVotes = snap.exists() ? (snap.val() || {}) : {};
        voteCounts = computeVoteCounts(currentVotes);
        // rerender list (popular depends on likes)
        const a = appById(appId);
        renderReviewsList(appId, a?.reviews || {});
      });

      const pRef = ref(db, `apps/${appId}/replies`);
      unsubscribeReplies = onValue(pRef, (snap)=>{
        currentReplies = snap.exists() ? (snap.val() || {}) : {};
        const idx = allApps.findIndex(x=>x.id===appId);
        if (idx !== -1) allApps[idx].replies = currentReplies;
        const a = appById(appId);
        renderReviewsList(appId, a?.reviews || {});
      });
    }

    async function getMyReview(appId){
      if (!currentUser) return null;
      const uid = currentUser.uid;
      const snap = await get(ref(db, `apps/${appId}/reviews/${uid}`));
      return snap.exists() ? snap.val() : null;
    }

    function canReplyToReview(targetReviewUid){
      if (!currentUser) return false;
      const meAdmin = isAdminUid(currentUser.uid);
      const targetAdmin = isAdminUid(targetReviewUid);
      if (meAdmin) return true; // admin bebas balas semua ulasan
      return targetAdmin;       // user biasa hanya boleh balas ulasan admin
    }

    async function submitReply(appId, targetReviewUid, text){
      if (!currentUser) throw new Error("Not logged in");
      const uid = currentUser.uid;
      const meAdmin = isAdminUid(uid);
      const targetAdmin = isAdminUid(targetReviewUid);
      if (!meAdmin && !targetAdmin){
        const err = new Error("Not allowed");
        err.code = "REPLY_NOT_ALLOWED";
        throw err;
      }

      const t = String(text || "").trim();
      if (!t){
        const err = new Error("Empty");
        err.code = "REPLY_EMPTY";
        throw err;
      }

      const now = Date.now();
      const path = `apps/${appId}/replies/${targetReviewUid}/${uid}`;

      let existing = null;
      try{
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
      return payload;
    }


    async function submitReview(appId, stars, comment){
      if (!currentUser) throw new Error("Not logged in");
      const uid = currentUser.uid;
      const now = Date.now();

      // Read existing first to enforce edit cooldown (30s) for non-admin
      let existing = null;
      try{
        const s = await get(ref(db, `apps/${appId}/reviews/${uid}`));
        existing = s.exists() ? (s.val() || null) : null;
      } catch {}

      const baseCreatedAt = existing ? Number(existing.createdAt || existing.updatedAt || now) : now;

      // cooldown: setelah kirim/perbarui, tunggu 30 detik baru boleh edit lagi
      if (existing && !isAdminUid(uid)){
        const last = Number(existing.updatedAt || existing.createdAt || 0);
        const remain = (last + REVIEW_EDIT_COOLDOWN_MS) - now;
        if (remain > 0){
          const err = new Error("EDIT_COOLDOWN");
          err.code = "EDIT_COOLDOWN";
          err.remainMs = remain;
          throw err;
        }
      }

      const payload = {
        stars: Number(stars),
        comment: String(comment || ""),
        userName: currentUser.displayName || "User",
        userPhoto: currentUser.photoURL || "",
        createdAt: baseCreatedAt,
        updatedAt: now
      };

      // optimistic
      const idx = allApps.findIndex(x=>x.id===appId);
      if (idx !== -1){
        if (!allApps[idx].reviews || typeof allApps[idx].reviews !== "object") allApps[idx].reviews = {};
        allApps[idx].reviews[uid] = payload;
        updateReviewStatsUI(allApps[idx].reviews);
        renderReviewsList(appId, allApps[idx].reviews);
      }

      await set(ref(db, `apps/${appId}/reviews/${uid}`), payload);
      return payload;
    }

    function lockBodyScroll(lock){
      document.body.style.overflow = lock ? "hidden" : "";
    }

    function openDetail(id){
      // Open dedicated preview page in a new navigation (separate page)
      const previewUrl = new URL("./preview/", location.href);
      previewUrl.searchParams.set("id", String(id));
      location.href = previewUrl.toString();
    }

    function closeDetail(){
      overlay.classList.remove("show");
      overlay.setAttribute("aria-hidden","true");
      lockBodyScroll(false);
      const url = new URL(location.href);
      url.searchParams.delete("id");
      history.replaceState({}, "", url);
      currentAppId = null;
      stopDetailListeners();
    }
    closeBtn.onclick = closeDetail;
    overlay.addEventListener("click",(e)=>{ if (e.target===overlay) closeDetail(); });
    dialogCloseBtn.onclick = closeDialog;
    dialogOverlay.addEventListener("click",(e)=>{ if (e.target===dialogOverlay) closeDialog(); });
    window.addEventListener("keydown",(e)=>{
      if (e.key !== "Escape") return;
      if (dialogOverlay.classList.contains("show")) return closeDialog();
      if (overlay.classList.contains("show")) return closeDetail();
    });

    // ===== Review editor + summary =====
    let _reviewFormCache = null;

    function setEditorOpen(open){
      const editor = document.getElementById("reviewEditor");
      if (!editor) return;
      editor.classList.toggle("show", open);
      editor.setAttribute("aria-hidden", open ? "false" : "true");
    }

    function refreshMyReviewSummary(appId, reviews){
      const body = document.getElementById("myReviewBody");
      const editBtn = document.getElementById("editReviewBtn");
      if (!body || !editBtn) return;

      if (!currentUser){
        body.innerHTML = `
          <div class="myReviewEmpty">Login untuk menulis ulasan.</div>
          <div class="myReviewMeta"><button class="btn" id="myLoginBtn" type="button">Login Google</button></div>
        `;
        editBtn.style.opacity = ".5";
        editBtn.disabled = true;
        const b = document.getElementById("myLoginBtn");
        if (b) b.onclick = ()=>loginBtn.click();
        return;
      }

      const mine = (reviews && reviews[currentUser.uid]) ? reviews[currentUser.uid] : null;

      if (!mine){
        editBtn.style.opacity = "1";
        editBtn.disabled = false;
        body.innerHTML = `<div class="myReviewEmpty">Belum ada ulasan. Tap ikon pensil untuk menulis.</div>`;
        return;
      }

      const canEdit = canEditReview(mine, currentUser.uid);
      editBtn.style.opacity = canEdit ? "1" : ".5";
      editBtn.disabled = !canEdit;

      const s = Number(mine.stars || 0);
      const c = String(mine.comment || "");

      let extra = "";
      const rem = getReviewEditRemainingMs(mine, currentUser.uid);
      if (rem === Infinity){
        extra = `<span>•</span><span class="hint">ADMIN</span>`;
      } else if (rem > 0){
        extra = `<span>•</span><span class="hint">Tunggu: <span id="editCountdown">${Math.ceil(rem/1000)}</span> dtk</span>`;
      }

      body.innerHTML = `
        <div class="myReviewMeta">
          <span>${starsDisplay(s)}</span>
          <span class="ratingNum">${s || "0"}</span>
          <span>•</span>
          <span>${mine.updatedAt ? timeAgo(mine.updatedAt) : ""}</span>
          ${extra}
        </div>
        ${c ? `<div class="myReviewText">${escapeHtml(c)}</div>` : `<div class="myReviewEmpty">(Tanpa komentar)</div>`}
      `;
    }

    function setupReviewUI(appId){
      const rateStarsEl = document.getElementById("rateStars");
      const commentBox = document.getElementById("commentBox");
      const submitBtn = document.getElementById("submitReviewBtn");
      const cancelBtn = document.getElementById("cancelEditBtn");
      const hintEl = document.getElementById("reviewHint");
      const charInfo = document.getElementById("charInfo");
      const selectedLabel = document.getElementById("selectedLabel");
      const editBtn = document.getElementById("editReviewBtn");

      let selectedStars = 0;
      const MAX_LEN = 500;

      function updateSelectedLabel(){
        selectedLabel.textContent = selectedStars ? `Rating: ${selectedStars}/5` : "Pilih rating";
      }
      function updateCharInfo(){
        const len = (commentBox.value || "").length;
        charInfo.textContent = `${len}/${MAX_LEN}`;
        if (len > MAX_LEN){
          charInfo.classList.add("danger");
          charInfo.textContent = `${len}/${MAX_LEN} (kepanjangan)`;
        } else charInfo.classList.remove("danger");
      }
      function renderStars(){
        rateStarsEl.innerHTML = "";
        for (let i=1;i<=5;i++){
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "starBtn";
          btn.innerHTML = starSvg(i <= selectedStars);
          btn.onpointerdown = (e)=>{
            e.preventDefault();
            selectedStars = i;
            renderStars();
            updateSelectedLabel();
          };
          rateStarsEl.appendChild(btn);
        }
      }

      async function loadMyExistingReview(){
        if (!currentUser){
          selectedStars = 0;
          commentBox.value = "";
          submitBtn.textContent = "Kirim";
          submitBtn.disabled = true;
          hintEl.textContent = "Login dulu untuk ulasan.";
          stopReviewEditTicker();
          renderStars(); updateSelectedLabel(); updateCharInfo();
          return;
        }

        submitBtn.disabled = false;

        const mine = await getMyReview(appId);

        // keep local cache for ticker/UI (biar countdown realtime tanpa reopen)
        const a0 = appById(appId);
        if (a0){
          a0.reviews = a0.reviews || {};
          if (mine) a0.reviews[currentUser.uid] = mine;
        }
        if (mine){
          selectedStars = Number(mine.stars || 0);
          commentBox.value = String(mine.comment || "");
          submitBtn.textContent = "Perbarui";

          const rem = getReviewEditRemainingMs(mine, currentUser.uid);
          if (rem === Infinity){
            hintEl.textContent = "Admin: edit bebas.";
            submitBtn.disabled = false;
            stopReviewEditTicker();
          } else if (rem > 0){
            hintEl.innerHTML = `Edit terkunci: <span id="editorCountdown">${Math.ceil(rem/1000)}</span> dtk`;
            submitBtn.disabled = true;
            startReviewEditTicker(appId);
          } else {
            hintEl.textContent = "Silakan edit.";
            submitBtn.disabled = false;
            stopReviewEditTicker();
          }
        } else {
          selectedStars = 0;
          commentBox.value = "";
          submitBtn.textContent = "Kirim";
          hintEl.textContent = "Isi lalu Kirim.";
          stopReviewEditTicker();
        }
        renderStars(); updateSelectedLabel(); updateCharInfo();
      }

      editBtn.onclick = async ()=>{
        if (!currentUser){
          toast("Login dulu untuk ulasan.");
          return;
        }

        const mine = await getMyReview(appId);
        if (mine && !canEditReview(mine, currentUser.uid)){
          const rem = getReviewEditRemainingMs(mine, currentUser.uid);
          const secs = Math.max(1, Math.ceil(rem/1000));
          toast(`Edit terkunci. Tunggu ${secs} dtk.`);
          return;
        }

        await loadMyExistingReview();
        setEditorOpen(true);
        // fokus halus
        setTimeout(()=>commentBox.focus({preventScroll:false}), 50);
      };

      cancelBtn.onclick = ()=>{
        setEditorOpen(false);
      };

      commentBox.addEventListener("input", updateCharInfo);

      submitBtn.onclick = async ()=>{
        if (!currentUser){
          toast("Login dulu untuk ulasan.");
          return;
        }
        if (selectedStars < 1 || selectedStars > 5){
          toast("Pilih rating 1–5 bintang.");
          return;
        }
        const comment = (commentBox.value || "").trim();
        if (comment.length > MAX_LEN){
          toast("Komentar terlalu panjang (max 500).");
          return;
        }
        try{
          await submitReview(appId, selectedStars, comment);
          toast("Ulasan tersimpan.");
          setEditorOpen(false); // ✅ setelah kirim/perbarui, editor hilang

          // lock edit instantly (tanpa nunggu listener)
          try{
            const a = appById(appId);
            refreshMyReviewSummary(appId, a?.reviews || {});
            startReviewEditTicker(appId);
          }catch{}

          // summary akan ke-update dari listener
        } catch (e){
          if (String(e?.code||e?.message||"") === "EDIT_COOLDOWN"){
            const ms = Number(e?.remainMs || 0);
            const secs = ms ? Math.max(1, Math.ceil(ms/1000)) : 30;
            toast(`Edit terkunci. Tunggu ${secs} dtk.`);
          } else toast("Gagal menyimpan ulasan. Cek Rules.");
          console.error(e);
        }
      };

      renderStars(); updateSelectedLabel(); updateCharInfo();
      setEditorOpen(false);
      _reviewFormCache = { appId, reload: loadMyExistingReview };
    }

    async function refreshReviewForm(appId){
      if (_reviewFormCache && _reviewFormCache.appId === appId){
        await _reviewFormCache.reload();
      }
    }

        // ====== Reviews list rendering (optimized for smooth scroll) ======
    const REVIEWS_PAGE_SIZE = 30;
    const _reviewUI = {
      visibleCount: new Map(),   // appId -> number
      lastData: new Map(),       // appId -> array
      openReplies: new Map(),    // appId -> Set(reviewUid)
      openEditor: new Map(),     // appId -> Set(reviewUid)
      drafts: new Map(),         // `${appId}:${reviewUid}` -> text
      observer: null
    };

    function _getSet(map, appId){
      let s = map.get(appId);
      if (!s){ s = new Set(); map.set(appId, s); }
      return s;
    }

    function _replyCount(appId, reviewUid){
      const a = appById(appId);
      const root = (a?.replies || currentReplies || {});
      const obj = root?.[reviewUid] || {};
      return Object.keys(obj||{}).filter(k=>{
        const rv = obj[k];
        const txt = String(rv?.text || rv?.comment || "");
        return txt.trim().length > 0;
      }).length;
    }

    function buildRepliesHtml(appId, reviewUid){
      const a = appById(appId);
      const root = (a?.replies || currentReplies || {});
      const obj = root?.[reviewUid] || {};

      const arr = Object.entries(obj).map(([ruid,rv])=>({
        uid: String(rv?.uid || ruid),
        userName: String(rv?.userName || "User"),
        userPhoto: String(rv?.userPhoto || ""),
        text: String(rv?.text || rv?.comment || ""),
        updatedAt: Number(rv?.updatedAt || 0)
      }))
      .filter(x=>x.text.trim().length>0)
      .sort((x,y)=>(x.updatedAt||0)-(y.updatedAt||0)); // oldest -> newest

      if (!arr.length) return "";

      return arr.map(rep=>`
        <div class="replyItem">
          <div class="replyTop">
            <div style="display:flex;gap:8px;align-items:center;min-width:0;flex-wrap:wrap">
              <img class="rAvatar" style="width:26px;height:26px" loading="lazy" decoding="async"
                   src="${rep.userPhoto || "icon/default.png"}" alt="avatar" onerror="this.src='icon/default.png'">
              <div class="replyName" title="${escapeHtml(rep.userName)}">
                ${escapeHtml(rep.userName)}${isAdminUid(rep.uid) ? ' <span class="adminBadge small" title="Admin">ADMIN</span>' : ''}
              </div>
            </div>
            <div class="rTime">${rep.updatedAt ? timeAgo(rep.updatedAt) : ""}</div>
          </div>
          <div class="replyText">${escapeHtml(rep.text)}</div>
        </div>
      `).join("");
    }

    function buildReplyEditorHtml(appId, targetUid){
      const a = appById(appId);
      const root = (a?.replies || currentReplies || {});
      const repliesObj = root?.[targetUid] || {};
      const myReply = (currentUser && repliesObj && repliesObj[currentUser.uid]) ? repliesObj[currentUser.uid] : null;

      const key = `${appId}:${targetUid}`;
      const draft = _reviewUI.drafts.get(key);
      const prefill = (draft != null) ? draft : String(myReply?.text || myReply?.comment || "");

      const hint = isAdminUid(currentUser?.uid)
        ? "Admin: bisa balas semua ulasan."
        : "User: hanya bisa balas ulasan ADMIN.";

      return `
        <textarea class="replyBox" maxlength="300" placeholder="Tulis balasan...">${escapeHtml(prefill)}</textarea>
        <div class="row">
          <button class="btn replyCancelBtn" data-ruid="${targetUid}" type="button">Batal</button>
          <button class="btn primary replySendBtn" data-ruid="${targetUid}" type="button">Kirim</button>
        </div>
        <div class="hint" style="margin-top:6px">${hint}</div>
      `;
    }

    function createReviewsSentinel(){
      const wrap = document.createElement("div");
      wrap.className = "reviewsSentinelWrap";
      wrap.innerHTML = `
        <div id="reviewsSentinel" class="reviewsSentinel hint">
          <span class="sentinelText">Muat lebih banyak...</span>
          <button id="reviewsLoadMoreBtn" class="btn small" type="button" style="margin-left:8px">Muat</button>
        </div>
      `;
      return wrap;
    }

    function createReviewItemNode(appId, r){
      const a = appById(appId);
      const root = (a?.replies || currentReplies || {});
      const repliesObj = root?.[r.uid] || {};
      const replyCount = _replyCount(appId, r.uid);

      const canReply = canReplyToReview(r.uid);
      const my = myVote(r.uid);
      const likeActive = my === 1;
      const dislikeActive = my === -1;

      const openReplies = _getSet(_reviewUI.openReplies, appId).has(r.uid);
      const openEditor = _getSet(_reviewUI.openEditor, appId).has(r.uid);

      const myReply = (currentUser && repliesObj && repliesObj[currentUser.uid]) ? repliesObj[currentUser.uid] : null;
      const replyLabel = myReply ? "Edit balasan" : "Balas";

      const div = document.createElement("div");
      div.className = `reviewItem${r.isAdmin ? " pinned":""}`;
      div.innerHTML = `
        <img class="rAvatar" loading="lazy" decoding="async"
             src="${r.userPhoto || "icon/default.png"}" alt="avatar" onerror="this.src='icon/default.png'">
        <div class="rMain">
          <div class="rTop">
            <div style="display:flex;gap:8px;align-items:center;min-width:0;flex-wrap:wrap">
              <div class="rName" title="${escapeHtml(r.userName)}">
                ${escapeHtml(r.userName)}${r.isAdmin ? ' <span class="adminBadge small" title="Admin">ADMIN</span>' : ''}
              </div>
              <div>${starsDisplay(r.stars)}</div>
            </div>
            <div class="rTime">${r.updatedAt ? timeAgo(r.updatedAt) : ""}</div>
          </div>

          ${r.comment ? `<div class="rComment">${escapeHtml(r.comment)}</div>` : `<div class="hint" style="margin-top:6px">(Tanpa komentar)</div>`}

          <div class="voteRow">
            <button class="voteBtn ${likeActive ? "active":""}" data-v="1" data-ruid="${r.uid}" type="button" aria-label="Like">
              ${iconThumbUp()} <span>${r.like}</span>
            </button>
            <button class="voteBtn ${dislikeActive ? "active":""}" data-v="-1" data-ruid="${r.uid}" type="button" aria-label="Dislike">
              ${iconThumbDown()} <span>${r.dislike}</span>
            </button>
          </div>

          <div class="replySection">
            ${(replyCount || canReply) ? `
              <div class="replyActions">
                ${replyCount ? `<button class="replyBtn repliesToggleBtn" data-ruid="${r.uid}" type="button">
                  ${openReplies ? "Sembunyikan balasan" : ("Lihat balasan (" + replyCount + ")")}
                </button>` : ``}
                ${canReply ? `<button class="replyBtn replyToggleBtn" data-ruid="${r.uid}" type="button">${replyLabel}</button>` : ``}
              </div>
            ` : ``}

            <div class="replyList ${openReplies ? "" : "hidden"}" data-ruid="${r.uid}">
              ${openReplies ? buildRepliesHtml(appId, r.uid) : ""}
            </div>

            <div class="replyEditor ${openEditor ? "" : "hidden"}" data-ruid="${r.uid}">
              ${openEditor ? buildReplyEditorHtml(appId, r.uid) : ""}
            </div>
          </div>
        </div>
      `;

      // bind draft sync only for opened editor (few nodes only)
      if (openEditor){
        const ta = div.querySelector("textarea.replyBox");
        if (ta){
          const key = `${appId}:${r.uid}`;
          ta.addEventListener("input", ()=>_reviewUI.drafts.set(key, String(ta.value||"")), {passive:true});
        }
      }
      return div;
    }

    function setupReviewsObserver(appId){
      const list = document.getElementById("reviewsList");
      if (!list) return;

      const data = _reviewUI.lastData.get(appId) || [];
      const visible = _reviewUI.visibleCount.get(appId) || 0;
      const sentinelWrap = list.querySelector(".reviewsSentinelWrap");
      if (!sentinelWrap) return;

      // hide/disable load-more when done
      const sentinel = sentinelWrap.querySelector("#reviewsSentinel");
      const btn = sentinelWrap.querySelector("#reviewsLoadMoreBtn");
      if (visible >= data.length){
        sentinelWrap.remove();
        try{ _reviewUI.observer?.disconnect(); }catch{}
        return;
      }

      // button fallback always works
      if (btn){
        btn.onclick = ()=>loadMoreReviews(appId);
      }

      if (!("IntersectionObserver" in window)){
        // no IO support: rely on button
        return;
      }

      try{ _reviewUI.observer?.disconnect(); }catch{}
      _reviewUI.observer = new IntersectionObserver((entries)=>{
        const ent = entries[0];
        if (!ent || !ent.isIntersecting) return;
        loadMoreReviews(appId);
      }, {root:null, rootMargin:"700px 0px", threshold:0.01});

      _reviewUI.observer.observe(sentinel);
    }

    function loadMoreReviews(appId){
      const list = document.getElementById("reviewsList");
      if (!list) return;

      const data = _reviewUI.lastData.get(appId) || [];
      let visible = _reviewUI.visibleCount.get(appId) || 0;
      if (visible >= data.length) return;

      const next = Math.min(data.length, visible + REVIEWS_PAGE_SIZE);
      _reviewUI.visibleCount.set(appId, next);

      const sentinelWrap = list.querySelector(".reviewsSentinelWrap");
      const frag = document.createDocumentFragment();
      data.slice(visible, next).forEach(r=>frag.appendChild(createReviewItemNode(appId, r)));

      if (sentinelWrap){
        list.insertBefore(frag, sentinelWrap);
      } else {
        list.appendChild(frag);
      }

      // remove sentinel when done
      if (next >= data.length){
        sentinelWrap?.remove();
        try{ _reviewUI.observer?.disconnect(); }catch{}
      } else {
        // keep observer alive
        setupReviewsObserver(appId);
      }
    }

    function bindReviewsListHandlers(){
      const list = document.getElementById("reviewsList");
      if (!list || list.dataset.bound === "1") return;
      list.dataset.bound = "1";

      list.addEventListener("click", async (e)=>{
        const appId = String(list.dataset.appId || currentAppId || "");
        if (!appId) return;

        // votes
        const voteBtn = e.target.closest(".voteBtn");
        if (voteBtn){
          const v = Number(voteBtn.dataset.v || 0);
          const ruid = String(voteBtn.dataset.ruid || "");
          if (!v || !ruid) return;
          try{
            await setVote(appId, ruid, v);
          } catch (err){
            console.error(err);
            toast("Gagal vote. Cek Rules.");
          }
          return;
        }

        // toggle replies list
        const repliesToggle = e.target.closest(".repliesToggleBtn");
        if (repliesToggle){
          const targetUid = String(repliesToggle.dataset.ruid || "");
          const item = repliesToggle.closest(".reviewItem");
          const box = item?.querySelector(`.replyList[data-ruid="${targetUid}"]`);
          if (!targetUid || !box) return;

          const set = _getSet(_reviewUI.openReplies, appId);
          if (set.has(targetUid)){
            set.delete(targetUid);
            box.classList.add("hidden");
            box.innerHTML = "";
            repliesToggle.textContent = `Lihat balasan (${_replyCount(appId, targetUid)})`;
          } else {
            set.add(targetUid);
            box.innerHTML = buildRepliesHtml(appId, targetUid);
            box.classList.remove("hidden");
            repliesToggle.textContent = "Sembunyikan balasan";
          }
          return;
        }

        // toggle reply editor
        const toggleBtn = e.target.closest(".replyToggleBtn");
        if (toggleBtn){
          const targetUid = String(toggleBtn.dataset.ruid || "");
          if (!targetUid) return;
          if (!currentUser){
            toast("Login dulu untuk membalas.");
            return;
          }
          if (!canReplyToReview(targetUid)){
            toast("Tidak punya akses membalas ulasan ini.");
            return;
          }

          const item = toggleBtn.closest(".reviewItem");
          const editor = item?.querySelector(`.replyEditor[data-ruid="${targetUid}"]`);
          if (!editor) return;

          const set = _getSet(_reviewUI.openEditor, appId);
          if (!editor.classList.contains("hidden")){
            set.delete(targetUid);
            editor.classList.add("hidden");
            editor.innerHTML = "";
            return;
          }

          set.add(targetUid);
          editor.innerHTML = buildReplyEditorHtml(appId, targetUid);
          editor.classList.remove("hidden");

          const ta = editor.querySelector("textarea.replyBox");
          if (ta){
            const key = `${appId}:${targetUid}`;
            ta.addEventListener("input", ()=>_reviewUI.drafts.set(key, String(ta.value||"")), {passive:true});
            try{ ta.focus({preventScroll:true}); }catch{ ta.focus(); }
          }
          return;
        }

        // cancel
        const cancelBtn = e.target.closest(".replyCancelBtn");
        if (cancelBtn){
          const targetUid = String(cancelBtn.dataset.ruid || "");
          const item = cancelBtn.closest(".reviewItem");
          const editor = item?.querySelector(`.replyEditor[data-ruid="${targetUid}"]`);
          if (!editor) return;

          _getSet(_reviewUI.openEditor, appId).delete(targetUid);
          editor.classList.add("hidden");
          editor.innerHTML = "";
          _reviewUI.drafts.delete(`${appId}:${targetUid}`);
          return;
        }

        // send
        const sendBtn = e.target.closest(".replySendBtn");
        if (sendBtn){
          const targetUid = String(sendBtn.dataset.ruid || "");
          const item = sendBtn.closest(".reviewItem");
          const editor = item?.querySelector(`.replyEditor[data-ruid="${targetUid}"]`);
          const box = editor?.querySelector("textarea.replyBox");
          if (!editor || !box) return;

          const text = String(box.value || "").trim();
          if (!text){
            toast("Balasan tidak boleh kosong.");
            return;
          }
          if (text.length > 300){
            toast("Balasan terlalu panjang (max 300).");
            return;
          }

          sendBtn.disabled = true;
          try{
            await submitReply(appId, targetUid, text);
            toast("Balasan terkirim.");

            _getSet(_reviewUI.openEditor, appId).delete(targetUid);
            _reviewUI.drafts.delete(`${appId}:${targetUid}`);
            editor.classList.add("hidden");
            editor.innerHTML = "";

            // auto open replies to show the new message
            const repliesBox = item?.querySelector(`.replyList[data-ruid="${targetUid}"]`);
            const repliesToggle = item?.querySelector(`.repliesToggleBtn[data-ruid="${targetUid}"]`);
            if (repliesBox){
              _getSet(_reviewUI.openReplies, appId).add(targetUid);
              repliesBox.innerHTML = buildRepliesHtml(appId, targetUid);
              repliesBox.classList.remove("hidden");
              if (repliesToggle) repliesToggle.textContent = "Sembunyikan balasan";
            }
          } catch (err){
            console.error(err);
            toast(err?.code === "REPLY_NOT_ALLOWED" ? "Tidak diizinkan membalas ulasan ini." : "Gagal kirim balasan.");
          } finally {
            sendBtn.disabled = false;
          }
          return;
        }
      }, {passive:false});
    }

    function renderReviewsList(appId, reviewsOverride=null){
      const a = appById(appId);
      if (!a) return;

      const list = document.getElementById("reviewsList");
      if (!list) return;

      bindReviewsListHandlers();
      list.dataset.appId = String(appId || "");

      const reviewsObj = reviewsOverride ?? a.reviews ?? {};
      const entries = Object.entries(reviewsObj)
        .map(([uid,v])=>({
          uid,
          isAdmin: isAdminUid(uid),
          stars: Number(v?.stars || 0),
          comment: String(v?.comment || ""),
          userName: String(v?.userName || "User"),
          userPhoto: String(v?.userPhoto || ""),
          updatedAt: Number(v?.updatedAt || 0),
          like: voteCounts?.[uid]?.like || 0,
          dislike: voteCounts?.[uid]?.dislike || 0,
          score: voteCounts?.[uid]?.score || 0
        }))
        .filter(r=>r.stars>=1 && r.stars<=5);

      // filtering + sorting
      let filtered = entries;
      if (reviewFilterStar){
        filtered = entries.filter(r=>r.stars === reviewFilterStar)
          .sort((x,y)=>(y.updatedAt||0)-(x.updatedAt||0)); // newest for star filter
      } else {
        // default: popular by likes (score, then likes, then time)
        filtered = entries.sort((x,y)=>{
          if (y.score !== x.score) return y.score - x.score;
          if (y.like !== x.like) return y.like - x.like;
          return (y.updatedAt||0) - (x.updatedAt||0);
        });
      }

      // auto pin: ulasan admin selalu di atas
      const pinned = filtered.filter(r=>r.isAdmin).sort((x,y)=>(y.updatedAt||0)-(x.updatedAt||0));
      const normal = filtered.filter(r=>!r.isAdmin);
      filtered = pinned.concat(normal);

      _reviewUI.lastData.set(appId, filtered);

      list.replaceChildren();

      if (filtered.length === 0){
        list.innerHTML = `<div class="hint">${reviewFilterStar ? "Belum ada ulasan untuk filter ini." : "Belum ada ulasan. Jadilah yang pertama!"}</div>`;
        return;
      }

      // keep previous visibleCount (don’t jump the user back up)
      const prevVisible = _reviewUI.visibleCount.get(appId) || 0;
      const initCount = Math.max(Math.min(prevVisible || 40, filtered.length), Math.min(40, filtered.length));
      _reviewUI.visibleCount.set(appId, initCount);

      const frag = document.createDocumentFragment();
      filtered.slice(0, initCount).forEach(r=>frag.appendChild(createReviewItemNode(appId, r)));

      // sentinel (load more) only if needed
      if (initCount < filtered.length){
        frag.appendChild(createReviewsSentinel());
      }

      list.appendChild(frag);
      setupReviewsObserver(appId);
    }

    // ====== Realtime load ======
    const appsRef = ref(db, "apps");
    onValue(appsRef, (snapshot)=>{
      allApps = normalizeApps(snapshot.val());
      render();

      if (currentAppId && !unsubscribeReviews){
        attachReviewsListener(currentAppId);
      }
    }, (err)=>{
      contentEl.innerHTML = `<div class="state">Gagal load data. Cek Rules / koneksi internet.<br><br><b>${escapeHtml(safeText(err?.message,""))}</b></div>`;
      console.error(err);
    });

    // init UI
    setActiveTabs();
    setActiveNav();
    updateHeaderVisibility();
