// libraries
const app = require('express')();
const functions = require('firebase-functions');

// routes
const {getAllScreams, postOneScream, getScream, commentOnScream} = require('./handlers/screams');
const {signup, login, uploadImage, addUserDetails, getAuthenticatedUser} = require('./handlers/users')

// helpers
const FirebaseAuth = require('./util/fbAuth')


// * Scream routes...
    // acessar o database e pegar as screams
    app.get('/screams', getAllScreams)
    // criar uma nova scream
    app.post('/scream', FirebaseAuth, postOneScream)
    app.get('/scream/:screamId', getScream);

    //todo, delete scream
    //todo, like a scream
    //todo, unlike a scream
    app.post('/scream/:screamId/comment', FirebaseAuth, commentOnScream)
    
// * Users routes
    app.post('/signup', signup)
    app.post('/login', login)
    app.post('/user/image', FirebaseAuth, uploadImage)
    app.post('/user', FirebaseAuth, addUserDetails)
    app.get('/user', FirebaseAuth, getAuthenticatedUser)

    

// https://seusite.com/api/...
// transformar as rotas app em https request no formato do firebase
exports.api = functions.https.onRequest(app)