const admin = require('firebase-admin')

// acesso ao admin do firebase do app
admin.initializeApp({
  databaseURL: "https://social-midia-4629c.firebaseio.com", // nome do database
  storageBucket: "social-midia-4629c.appspot.com" // nome do bucket onde vai ficar salvo as fotos
});

  // database do firebase
const db = admin.firestore()

module.exports = {admin, db}