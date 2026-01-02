const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json")),
  storageBucket: "aimit-151.appspot.com"
});

const bucket = admin.storage().bucket();
module.exports = {admin,bucket};