const functions = require('firebase-functions');
const admin = require('firebase-admin')
const firebase = require('firebase')
const app = require('express')();

// acesso ao admin do firebase do app
// admin.initializeApp({
    
// });

admin.initializeApp({
  databaseURL: "https://social-midia-4629c.firebaseio.com"
});

firebase.initializeApp({
    apiKey: "AIzaSyCMLySTGbm96zwK1-tLNiDkAsTOFf703Ig",
    authDomain: "social-midia-4629c.firebaseapp.com",
    databaseURL: "https://social-midia-4629c.firebaseio.com",
    projectId: "social-midia-4629c",
    storageBucket: "social-midia-4629c.appspot.com",
    messagingSenderId: "1079262551762",
    appId: "1:1079262551762:web:b12585c257b6546f5c170b",
    measurementId: "G-5MX4W58T0T"
})

const db = admin.firestore()




// acesso ao database
app.get('/screams', (req, res) => {
    db
        .collection('screams')
        .orderBy('createdAt', 'desc')
        .get()
        .then( data => {
            let screams = []
            data.forEach( doc => {
                screams.push({
                    sreamId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt
                });
            })
            // retornar em um json todos os dados da collection 'screams'
            return res.json(screams);
        })
        .catch( err => console.error(err))
})

// criar uma nova collection
app.post('/scream', (req, res) =>{ 

    const newScream = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString()
    };

    db
        .collection('screams')
        .add(newScream)
        .then( (doc) => {
            res.json({ message: `document ${doc.id} created successfully` })
        })
        .catch( err => {
            res.status(500).json({error: 'something went wrong' + err})
            console.error(err)
        })
})

// sign up route
app.post('/signup', (req, res) => {

    const {email, password, confirmPassword, handle} = req.body
    const newUser = {email, password, confirmPassword, handle}

    let token, userId;
    // doc passando o caminho da collection e pegar todos os dados 
    db.doc(`/users/${newUser.handle}`).get()
        .then( doc => {
            // se tiver um usuario com esse 'handle' ou nome
            if(doc.exists){
                // nao vai cadastrar
                return res.status(400).json({ handle: 'this handle is already taken'})
            } else {
                // criar um usuario com o email e senha passado
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password)
            }
        })
        .then( data => {
            userId = data.user.uid
            // pegar o id do usuario criado
            return data.user.getIdToken()
        })
        .then( idToken => {
            // atualizar o token para o do novo usuario criado 
            token = idToken;

            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId
            }
            // set() vai criar um novo usuario, ao inves de get que apeenas pega
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then( () => {
            // retornar o token do usuario
            return res.status(201).json({token})
        })
        .catch( err => {
            console.error(err)
            if (err.code === 'auth/email-already-in-use'){
                return res.status(400).json({ email: 'Email already in use'})
            }
            return res.status(500).json({ error: err.code})
        })

    // feito isso vai criar uma autenticação para o usuario
    
})



// https://seusite.com/api/...

// transformar as rotas app em https request no formato do firebase
exports.api = functions.https.onRequest(app)