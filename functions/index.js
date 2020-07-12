// libraries
const app = require('express')();
const functions = require('firebase-functions');

// routes
const {getAllScreams, postOneScream} = require('./handlers/screams');
const {signup, login, uploadImage} = require('./handlers/users')

// helpers
const FirebaseAuth = require('./util/fbAuth')


// * Scream routes...
    // acessar o database e pegar as screams
    app.get('/screams', getAllScreams)
    // criar uma nova scream
    app.post('/scream', FirebaseAuth, postOneScream)

// * Users routes
    app.post('/signup', signup)
    app.post('/login', login)

    app.post('/user/image', FirebaseAuth,uploadImage)

// https://seusite.com/api/...
// transformar as rotas app em https request no formato do firebase
exports.api = functions.https.onRequest(app)