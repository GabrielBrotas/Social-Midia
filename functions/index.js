// libraries
const app = require('express')();
const functions = require('firebase-functions');
const {db} = require('./util/admin')

// routes
const {getAllScreams, postOneScream, getScream, commentOnScream, likeScream, unlikeScream, deleteScream} = require('./handlers/screams');
const {signup, login, uploadImage, addUserDetails, getAuthenticatedUser} = require('./handlers/users')

// helpers
const FirebaseAuth = require('./util/fbAuth')


// * Scream routes...
    // acessar o database e pegar as screams
    app.get('/screams', getAllScreams)
    // criar uma nova scream
    app.post('/scream', FirebaseAuth, postOneScream)
    app.get('/scream/:screamId', getScream);

    app.delete('/scream/:screamId', FirebaseAuth, deleteScream)
    app.get('/scream/:screamId/like', FirebaseAuth, likeScream)
    app.get('/scream/:screamId/unlike', FirebaseAuth, unlikeScream)

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

// onCreate vai ativar um evento que nesse caso quando um novo like for criado no nosso database vai chamar essa função
exports.createNotificationOnLike = functions.firestore.document('likes/{id}').onCreate( (snapshot) => {

        db.doc(`/screams/${snapshot.data().screamId}`).get()
            .then( doc => {
                if(doc.exists){
                    // criar um objeto com os dados da notificação para salvar e mandar para o recipient 
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'like',
                        read: false,
                        screamId: doc.id
                    });
                }
            })
            // nao precisa retornar nada pois não faz parte da api
            .then( () => {
                return
            })
            .catch( err => {
                console.error(err);
                return;
            })
})

// caso o usuario removar o like vai tirar a notificação
exports.deleteNotificationOnUnlike = functions
    .region('us-central1')
    .firestore.document('likes/{id}')
    .onDelete( (snapshot) => {
        db.doc(`/notifications/${snapshot.id}`)
            .delete()
            .then( () => {
                return
            })
            .catch( err =>{
                console.error(err)
                return
            })
})


exports.createNotificationOnComment = functions
    .region('us-central1')
    .firestore.document('comments/{id}')
    .onCreate( (snapshot) => {
        db.doc(`/screams/${snapshot.data().screamId}`)
            .get()
            .then( doc => {
                if(doc.exists){
                    // criar um objeto com os dados da notificação para salvar e mandar para o recipient 
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'comment',
                        read: false,
                        screamId: doc.id
                    });
                }
            })
            // nao precisa retornar nada pois não faz parte da api
            .then( () => {
                return
            })
            .catch( err => {
                console.error(err);
                return;
            })
})