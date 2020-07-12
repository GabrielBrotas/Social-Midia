const admin = require('firebase-admin')

// acesso ao admin do firebase do app
admin.initializeApp({
    databaseURL: "https://social-midia-4629c.firebaseio.com"
});

  // database do firebase
const db = admin.firestore()

module.exports = {admin, db}