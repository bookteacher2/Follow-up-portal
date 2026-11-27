// ======================================================================
// 24X CEO Follow-up portal: settings
// Fill in the values below. Everything else works without changes.
// ======================================================================
window.PORTAL_CONFIG = {
  // 1) Paste the firebaseConfig block from Firebase console
  //    (Project settings > General > Your apps > SDK setup and configuration > Config).
  firebase: {
    apiKey: "AIzaSyBTze4BVGkA_7K4cBdtKJOQ3SPr1cBLzp4",
    authDomain: "x-followup.firebaseapp.com",
    projectId: "x-followup",
    storageBucket: "x-followup.firebasestorage.app",
    messagingSenderId: "830620933071",
    appId: "1:830620933071:web:9a945fbe84a29cc18ad0ba"
  },

  // 2) Portal owners (CEO Office admins). They can always sign in, change settings,
  //    manage the access list and import data. Use lower-case emails.
  //    Must match the list in firestore.rules.
  ownerEmails: ["nutthanit.t@24slg.com", "ceooffice.24slg@gmail.com"],

  // 3) Optional: sign in with the 24SLG Microsoft account (phase 2, after IT registers the app).
  microsoft: { enabled: false, tenant: "" },   // tenant = Directory (tenant) ID from Azure

  // 4) Optional: SharePoint folder for large documents (shown as a hint on the Files panel).
  sharepointFolder: "",

  // Largest file stored inside the portal (bigger files: share a SharePoint link instead).
  maxFileMB: 5
};
