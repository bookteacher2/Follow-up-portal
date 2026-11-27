/* 24X CEO Follow-up: Firebase adapter.
   Gives the portal the same small API it used inside Claude (claude.use("db" | "user" | "assets" | "downloads" | "mcp"))
   on top of Firebase Authentication + Cloud Firestore (free Spark plan). Files are stored in Firestore in chunks. */
(function () {
  "use strict";
  const C = window.PORTAL_CONFIG || {};
  const lc = s => String(s || "").trim().toLowerCase();
  const owners = (C.ownerEmails || []).map(lc);
  const MAX_BYTES = Math.round((C.maxFileMB || 5) * 1024 * 1024);
  const PART = 900000; // characters of base64 per Firestore document (limit is 1 MiB)

  if (!window.firebase || !C.firebase || /PASTE/.test(C.firebase.apiKey || "PASTE")) {
    document.addEventListener("DOMContentLoaded", () => fatal("The portal is not connected to Firebase yet. Open config.js and paste the firebaseConfig values (see README)."));
    window.claude = { use: () => new Promise(() => {}) };
    return;
  }
  firebase.initializeApp(C.firebase);
  const auth = firebase.auth();
  const fs = firebase.firestore();
  try { fs.settings({ ignoreUndefinedProperties: true, merge: true }); } catch (e) {}
  if (C.emulator) { auth.useEmulator("http://" + C.emulator + ":9099"); fs.useEmulator(C.emulator, 8080); }

  // ---------- sign-in gate ----------
  const css = `
  #fbgate{position:fixed;inset:0;z-index:9999;background:#f4f6f5;display:grid;place-items:center;padding:16px;font-family:Inter,"IBM Plex Sans Thai",system-ui,sans-serif;color:#14201b}
  #fbgate[hidden]{display:none}
  #fbgate .card{width:100%;max-width:380px;background:#fff;border:1px solid #e1e7e4;border-radius:18px;padding:28px 24px;box-shadow:0 4px 18px rgba(16,24,20,.07)}
  #fbgate .logo{width:42px;height:42px;border-radius:11px;background:#0b6b55;color:#fff;display:grid;place-items:center;font-weight:800;margin-bottom:14px}
  #fbgate h1{font-size:19px;margin:0 0 4px}
  #fbgate p{color:#6b7772;font-size:13px;margin:0 0 16px;line-height:1.5}
  #fbgate label{display:block;font-size:12px;font-weight:700;color:#46534d;margin:10px 0 5px}
  #fbgate input{width:100%;box-sizing:border-box;border:1px solid #d5ddd9;border-radius:10px;padding:10px 12px;font:inherit;font-size:15px}
  #fbgate input:focus{outline:2px solid #0b6b55;outline-offset:1px}
  #fbgate button{width:100%;margin-top:14px;border-radius:10px;padding:11px;font:inherit;font-weight:700;font-size:14px;cursor:pointer;border:1px solid #0b6b55;background:#0b6b55;color:#fff}
  #fbgate button.alt{background:#fff;color:#14201b;border-color:#d5ddd9}
  #fbgate button:disabled{opacity:.6;cursor:wait}
  #fbgate .or{display:flex;align-items:center;gap:10px;color:#9aa5a0;font-size:12px;margin:16px 0 0}
  #fbgate .or:before,#fbgate .or:after{content:"";flex:1;height:1px;background:#e1e7e4}
  #fbgate .err{color:#c0392b;font-size:12.5px;min-height:18px;margin-top:10px}
  #fbgate .ok{color:#1f7a55}
  #fbgate .lnk{background:none;border:0;color:#0b6b55;width:auto;padding:0;margin:10px 0 0;font-weight:600;font-size:12.5px}
  #fbuser{position:fixed;right:12px;bottom:12px;z-index:50;background:#fff;border:1px solid #e1e7e4;border-radius:999px;padding:5px 6px 5px 12px;font:12px Inter,system-ui,sans-serif;color:#46534d;display:flex;gap:8px;align-items:center;box-shadow:0 2px 10px rgba(0,0,0,.08)}
  #fbuser button{border:1px solid #e1e7e4;background:#f4f6f5;border-radius:999px;padding:4px 10px;font:inherit;font-weight:600;cursor:pointer;color:#14201b}
  @media print{#fbuser{display:none}}`;
  function el(html) { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  (function () { const st = document.createElement("style"); st.textContent = css; (document.head || document.documentElement).appendChild(st); })();
  let gate;
  function buildGate() {
    if (gate) return gate;
    gate = el(`<div id="fbgate" hidden><form class="card" id="fbform" autocomplete="on">
      <div class="logo">24X</div><h1>CEO Follow-up</h1>
      <p>Sign in to see and update CEO-assigned tasks. Ask the CEO Office if you need access.</p>
      ${C.microsoft && C.microsoft.enabled ? `<button type="button" id="fbms">Sign in with Microsoft (24SLG)</button><div class="or">or</div>` : ""}
      <label for="fbemail">Work email</label><input id="fbemail" type="email" autocomplete="username" required>
      <label for="fbpw">Password</label><input id="fbpw" type="password" autocomplete="current-password" required>
      <button type="submit" id="fbgo"${C.microsoft && C.microsoft.enabled ? ' class="alt"' : ""}>Sign in</button>
      <button type="button" class="lnk" id="fbforgot">Forgot password?</button>
      <div class="err" id="fberr" role="alert"></div></form></div>`);
    document.body.appendChild(gate);
    const err = gate.querySelector("#fberr");
    const msg = e => ({ "auth/invalid-credential": "Email or password is not correct.", "auth/wrong-password": "Email or password is not correct.", "auth/user-not-found": "Email or password is not correct.", "auth/too-many-requests": "Too many tries. Wait a few minutes, or use Forgot password.", "auth/user-disabled": "This account is switched off. Ask the CEO Office.", "auth/popup-closed-by-user": "Sign-in window was closed.", "auth/network-request-failed": "No connection. Check the internet and try again." })[e && e.code] || "Could not sign in. Try again.";
    gate.querySelector("#fbform").onsubmit = async ev => {
      ev.preventDefault(); const b = gate.querySelector("#fbgo"); b.disabled = true; err.className = "err"; err.textContent = "";
      try { await auth.signInWithEmailAndPassword(lc(gate.querySelector("#fbemail").value), gate.querySelector("#fbpw").value); }
      catch (e) { err.textContent = msg(e); }
      b.disabled = false;
    };
    gate.querySelector("#fbforgot").onclick = async () => {
      const em = lc(gate.querySelector("#fbemail").value); err.className = "err";
      if (!em) { err.textContent = "Type your work email first, then press Forgot password."; return; }
      try { await auth.sendPasswordResetEmail(em); } catch (e) {}
      err.className = "err ok"; err.textContent = "If this email has an account, a reset link is on its way. Check the inbox and junk folder.";
    };
    const ms = gate.querySelector("#fbms");
    if (ms) ms.onclick = async () => {
      const p = new firebase.auth.OAuthProvider("microsoft.com");
      p.setCustomParameters(Object.assign({ prompt: "select_account" }, C.microsoft.tenant ? { tenant: C.microsoft.tenant } : {}));
      try { await auth.signInWithPopup(p); } catch (e) { err.textContent = msg(e); }
    };
    return gate;
  }
  function showGate(text) { buildGate(); gate.hidden = false; const e = gate.querySelector("#fberr"); e.className = "err"; e.textContent = text || ""; }
  function fatal(text) { buildGate(); gate.hidden = false; gate.querySelector("#fbform").innerHTML = `<div class="logo">24X</div><h1>CEO Follow-up</h1><p>${text}</p>`; }

  // ---------- auth state ----------
  let me = null, resolveReady; const ready = new Promise(r => (resolveReady = r));
  const domReady = new Promise(r => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", r, { once: true }) : r());
  auth.onAuthStateChanged(async u => {
    await domReady;
    if (me && (!u || u.uid !== me.uid)) { location.reload(); return; }
    if (!u) { showGate(); return; }
    const email = lc(u.email);
    try { await fs.doc("config/roles").get(); }
    catch (e) {
      await auth.signOut();
      showGate(e && e.code === "permission-denied" ? `${email} is not on the access list yet. Ask the CEO Office to add it.` : "Could not reach the database. Check the internet and try again.");
      return;
    }
    let name = u.displayName || "";
    try {
      const s = await fs.doc("users/" + u.uid).get();
      if (s.exists && s.data().name) name = s.data().name;
      if (!name) name = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      await fs.doc("users/" + u.uid).set({ name, email, lastSeen: new Date().toISOString() }, { merge: true });
    } catch (e) {}
    me = { uid: u.uid, email, name, photo: u.photoURL || "" };
    if (gate) gate.hidden = true;
    const bar = el(`<div id="fbuser"><span>${email.replace(/</g, "&lt;")}</span><button type="button">Sign out</button></div>`);
    bar.querySelector("button").onclick = () => auth.signOut().then(() => location.reload());
    document.body.appendChild(bar);
    resolveReady(me);
  });

  // ---------- user ----------
  const initials = n => { const t = String(n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
    return "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="#0b6b55"/><text x="32" y="41" font-family="Arial" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">${t.replace(/[<&]/g, "")}</text></svg>`); };
  const profCache = {};
  const userApi = {
    me: async () => ({ id: me.uid, name: me.name, email: me.email, avatarUrl: me.photo || initials(me.name) }),
    isOwner: async () => owners.includes(me.email),
    can: async () => true,
    profiles: async ids => {
      const out = {};
      await Promise.all([...new Set(ids)].filter(Boolean).map(async id => {
        if (profCache[id]) { out[id] = profCache[id]; return; }
        try { const s = await fs.doc("users/" + id).get(); if (s.exists) out[id] = profCache[id] = { id, name: s.data().name || s.data().email || "" }; } catch (e) {}
      }));
      return out;
    },
    search: async q => {
      q = lc(q); if (q.length < 2) return [];
      const s = await fs.collection("users").get();
      return s.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.email && (lc(p.name).includes(q) || lc(p.email).includes(q)))
        .slice(0, 8).map(p => ({ id: p.id, name: `${p.name} (${p.email})`, isMe: p.id === me.uid }));
    }
  };

  // ---------- files: stored in Firestore as base64 parts ----------
  const toB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = rej; r.readAsDataURL(blob); });
  async function shrinkImage(blob) {
    if (!/^image\/(jpeg|png|webp)$/.test(blob.type) || blob.size < 800 * 1024) return blob;
    try {
      const bmp = await createImageBitmap(blob); const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      const out = await new Promise(r => c.toBlob(r, "image/jpeg", 0.82));
      return out && out.size < blob.size ? out : blob;
    } catch (e) { return blob; }
  }
  async function putBlob(id, blob, name) {
    const b64 = await toB64(blob); const n = Math.max(1, Math.ceil(b64.length / PART));
    for (let i = 0; i < n; i++) {
      const ref = fs.doc(`blobs/${id}/p/${String(i).padStart(4, "0")}`);
      const ex = await ref.get(); if (ex.exists) continue; // left by an earlier, interrupted upload: keep it
      await ref.set({ d: b64.slice(i * PART, (i + 1) * PART) });
    }
    await fs.doc("blobs/" + id).set({ type: blob.type || "application/octet-stream", size: blob.size, parts: n, name: name || "", by: me ? me.uid : "", at: new Date().toISOString() });
  }
  const blobCache = {};
  async function getBlob(id) {
    if (blobCache[id]) return blobCache[id];
    blobCache[id] = (async () => {
      const m = await fs.doc("blobs/" + id).get(); if (!m.exists) throw new Error("file not found");
      const parts = await fs.collection(`blobs/${id}/p`).get();
      const b64 = parts.docs.sort((a, b) => a.id.localeCompare(b.id)).map(d => d.data().d).join("");
      const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return new Blob([u8], { type: m.data().type });
    })();
    blobCache[id].catch(() => delete blobCache[id]);
    return blobCache[id];
  }
  const assetsApi = {
    upload: async (blob, opts) => {
      let b = blob; if (opts && opts.type && !b.type) b = new Blob([b], { type: opts.type });
      b = await shrinkImage(b);
      if (b.size > MAX_BYTES) { const e = new Error("too large"); e.code = "too_large"; throw e; }
      const id = fs.collection("blobs").doc().id;
      await putBlob(id, b, blob.name);
      return { id, url: "fbblob:" + id, contentType: b.type, sizeBytes: b.size };
    }
  };
  window.__fbPutBlob = putBlob; // used by the admin import page

  // fetch("fbblob:<id>") returns the stored file
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input && input.url;
    if (url && url.startsWith("fbblob:")) return new Response(await getBlob(url.slice(7)));
    return origFetch(input, init);
  };
  // <img src="fbblob:…"> and <a href="fbblob:…"> are swapped for local object URLs
  const objUrls = {};
  function fix(node) {
    if (!node || node.nodeType !== 1) return;
    const list = node.matches && node.matches('[src^="fbblob:"],[href^="fbblob:"]') ? [node] : [];
    node.querySelectorAll && node.querySelectorAll('[src^="fbblob:"],[href^="fbblob:"]').forEach(x => list.push(x));
    list.forEach(x => {
      const attr = x.hasAttribute("src") && x.getAttribute("src").startsWith("fbblob:") ? "src" : "href";
      const id = x.getAttribute(attr).slice(7);
      if (objUrls[id]) { x.setAttribute(attr, objUrls[id]); return; }
      getBlob(id).then(b => { objUrls[id] = objUrls[id] || URL.createObjectURL(b); if (x.getAttribute(attr) === "fbblob:" + id) x.setAttribute(attr, objUrls[id]); }).catch(() => {});
    });
  }
  new MutationObserver(ms => ms.forEach(m => { if (m.type === "attributes") fix(m.target); else m.addedNodes.forEach(fix); }))
    .observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["src", "href"] });

  // ---------- downloads ----------
  const downloadsApi = {
    save: async ({ filename, data }) => {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename || "download";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
  };

  // ---------- the portal's entry point ----------
  window.claude = {
    use: async name => {
      await ready;
      if (name === "db") return fs;
      if (name === "user") return userApi;
      if (name === "assets") return assetsApi;
      if (name === "downloads") return downloadsApi;
      return null; // "mcp" (Outlook search) is not available outside Claude
    }
  };
  window.fbPortal = { auth, fs, ready, owners, isOwnerEmail: e => owners.includes(lc(e)), getBlob, putBlob };
})();
