// libraries
const app = require('express')();
const functions = require('firebase-functions');
const {db} = require('./util/admin')

// routes
const {getAllScreams, postOneScream, getScream, commentOnScream, likeScream, unlikeScream, deleteScream} = require('./handlers/screams');
const {signup, login, uploadImage, addUserDetails, getAuthenticatedUser, getUserDetails, markNotificationsRead} = require('./handlers/users')

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
    app.get('/user/:handle', getUserDetails)
    app.post('/notifications', FirebaseAuth, markNotificationsRead)

    

// https://seusite.com/api/...
// transformar as rotas app em https request no formato do firebase
exports.api = functions.https.onRequest(app)

// onCreate vai ativar um evento que nesse caso quando um novo like for criado no nosso database vai chamar essa função
exports.createNotificationOnLike = functions.firestore.document('likes/{id}').onCreate( (snapshot) => {

    return db.doc(`/screams/${snapshot.data().screamId}`).get()
        .then( doc => {
            if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
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
        .catch( err => {
            console.error(err);
        })
})

// caso o usuario removar o like vai tirar a notificação
exports.deleteNotificationOnUnlike = functions
    .region('us-central1')
    .firestore.document('likes/{id}')
    .onDelete( (snapshot) => {
        return db.doc(`/notifications/${snapshot.id}`)
            .delete()
            .catch( err =>{
                console.error(err)
                return
            })
})


exports.createNotificationOnComment = functions
    .region('us-central1')
    .firestore.document('comments/{id}')
    .onCreate( (snapshot) => {
        return db.doc(`/screams/${snapshot.data().screamId}`)
            .get()
            .then( doc => {
                if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
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
            .catch( err => {
                console.error(err);
                return;
            })
})

exports.onUserImageChange = functions.firestore.document('/users/{userId}')
    .onUpdate( change => {
        // change tem dois valores 'change.before.data()' e 'change.after.data()' e
        if(change.before.data().imageUrl !== change.after.data().imageUrl){
            const batch = db.batch();
            return db.collection('screams')
                .where('userHandle', '==', change.before.data().handle)
                .get()
                .then( data => {
                    data.forEach( doc => {
                        const scream = db.doc(`/screams/${doc.id}`);
                        batch.update(scream, {userImage: change.after.data().imageUrl})
                    })
                    return batch.commit()
                })
        } else {
            return true
        }
    })


exports.onScreamDelete = functions.firestore.document("/screams/{screamId}")
    .onDelete( (snapshot, context) => {
        const screamId = context.params.screamId;
        const batch = db.batch();
        return db.collection('comments').where('screamId', '==', screamId).get()
            .then( data => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/comments/${doc.id}`))
                })
                return db.collection('likes').where('screamId', '==', screamId).get()
            })
            .then( data => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/likes/${doc.id}`))
                })
                return db.collection('notifications').where('screamId', '==', screamId).get()
            })
            .then( data => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/notifications/${doc.id}`))
                })
                return batch.commit()
            })
            .catch( err => {console.error(err)})
    })