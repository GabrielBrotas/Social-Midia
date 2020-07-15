// * libraries
const app = require('express')();
const functions = require('firebase-functions');
const {db} = require('./util/admin')
require('dotenv/config')

// * routes
const {
    getAllScreams,
    postOneScream,
    getScream,
    commentOnScream, 
    likeScream, 
    unlikeScream, 
    deleteScream
} = require('./handlers/screams');

const {
    signup, 
    login, 
    uploadImage, 
    addUserDetails, 
    getAuthenticatedUser, 
    getUserDetails, 
    markNotificationsRead
} = require('./handlers/users')

// * helpers
const FirebaseAuth = require('./util/fbAuth')


// * Scream routes...
    // acessar o database e pegar todas as screams
    app.get('/screams', getAllScreams)
    // criar uma nova scream
    app.post('/scream', FirebaseAuth, postOneScream)
    // pegar uma unica scream
    app.get('/scream/:screamId', getScream);
    // deletar scream
    app.delete('/scream/:screamId', FirebaseAuth, deleteScream)
    // dar like
    app.get('/scream/:screamId/like', FirebaseAuth, likeScream)
    // dar dislke
    app.get('/scream/:screamId/unlike', FirebaseAuth, unlikeScream)
    // comentar em uma scream
    app.post('/scream/:screamId/comment', FirebaseAuth, commentOnScream)
    
// * Users routes
    // registrar
    app.post('/signup', signup)
    // logar
    app.post('/login', login)
    // atualizar imagem do perfil
    app.post('/user/image', FirebaseAuth, uploadImage)
    // editar descrição do user
    app.post('/user', FirebaseAuth, addUserDetails)
    // descrição do usuario atual (logado)
    app.get('/user', FirebaseAuth, getAuthenticatedUser)
    // pegar descrição/dados de outro usuario
    app.get('/user/:handle', getUserDetails)
    // marcar notificações como lida
    app.post('/notifications', FirebaseAuth, markNotificationsRead)

// https://seusite.com/api/...
// transformar as rotas app em https request no formato do firebase
exports.api = functions.https.onRequest(app)

// onCreate vai ativar um evento que nesse caso quando um novo like for criado no nosso database vai chamar essa função
exports.createNotificationOnLike = functions.firestore.document('likes/{id}').onCreate( (snapshot) => {
    // snapshot vai mandar os dados do document criado
    // pegar a scream que foi dado like (o id dela tem nos dados do like)
    return db.doc(`/screams/${snapshot.data().screamId}`).get()
        .then( doc => {
            // se essa scream existe e não for o proprio usuario que deu like na propria scream...
            if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
                // criar um objeto dentro de 'notifications' com os dados da notificação para salvar e mandar para o recipient(dono da scream) 
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
    .firestore.document('likes/{id}')
    .onDelete( (snapshot) => {
        // pegar o id da notificação que foi retirado o like e deletar essa notificação
        return db.doc(`/notifications/${snapshot.id}`)
            .delete()
            .catch( err =>{
                console.error(err)
                return
            })
})

// Quando criar um novo comentario
exports.createNotificationOnComment = functions
    .firestore.document('comments/{id}')
    .onCreate( (snapshot) => {
        // vai pegar o id atraves do snapshot da scream que foi direcionada o comentario
        return db.doc(`/screams/${snapshot.data().screamId}`)
            .get()
            .then( doc => {
                // se nao foi o proprio usuario que comentou na propria scream
                if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
                    // criar um objeto com os dados da notificação para salvar e mandar para o recipient(dono da scream)
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

// Quando o usuario mudar a imagem dele...
exports.onUserImageChange = functions.firestore.document('/users/{userId}')
    .onUpdate( change => {
        // change tem dois valores 'change.before.data()' e 'change.after.data()'
        // se o usuario mudou a imagem, ou seja, a de antes é diferente da atual
        if(change.before.data().imageUrl !== change.after.data().imageUrl){
            // criar um batch(armazenar os commits)
            const batch = db.batch();
            // para todas as screams que pertence ao usuario...
            return db.collection('screams')
                .where('userHandle', '==', change.before.data().handle)
                .get()
                .then( data => {
                    data.forEach( doc => {
                        // para todas as screms atualizar a imagem do usuario para a atual
                        const scream = db.doc(`/screams/${doc.id}`);
                        batch.update(scream, {userImage: change.after.data().imageUrl})
                    })
                    // commit nas atualizações
                    return batch.commit()
                })
        } else {
            return true
        }
})

// Quando deletar uma scream
exports.onScreamDelete = functions.firestore.document("/screams/{screamId}")
    .onDelete( (snapshot, context) => {
        // no context vamos pegar os dados passados pelo parametro na url
        const screamId = context.params.screamId;
        // armazenar os commit
        const batch = db.batch();

        // pegar todos os comentarios que são da scream
        return db.collection('comments').where('screamId', '==', screamId).get()
            .then( data => {
                // para cada comentario dessa scream
                data.forEach(doc => {
                    // deletar ela
                    batch.delete(db.doc(`/comments/${doc.id}`))
                    // armazenar os delete no batch
                })
                // pegar os likes dessa scream
                return db.collection('likes').where('screamId', '==', screamId).get()
            })
            .then( data => {
                // para cada like da scream deletar
                data.forEach(doc => {
                    // armazenar no batch
                    batch.delete(db.doc(`/likes/${doc.id}`))
                })
                // pegar as notificações da scream
                return db.collection('notifications').where('screamId', '==', screamId).get()
            })
            .then( data => {
                // para cada notificação, deletar.
                data.forEach(doc => {
                    batch.delete(db.doc(`/notifications/${doc.id}`))
                })
                // commit em tudo
                return batch.commit()
            })
            .catch( err => {console.error(err)})
})