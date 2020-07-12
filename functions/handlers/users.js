const firebase = require('firebase')

const {admin, db} = require('../util/admin')
const config = require('../util/config')
const {validateSignupData, validateLoginData, reduceUserDetails} = require('../util/validators')


firebase.initializeApp(config)


// Sign up new user
exports.signup = async (req, res) => {

    const {email, password, confirmPassword, handle} = req.body
    const newUser = {email, password, confirmPassword, handle}

    const {valid, erros} = validateSignupData(newUser)

    if(!valid) return res.status(400).json(erros)

    const noImg = "no-img.png"
    
    // doc passando o caminho da collection e pegar o dado dessa collection com o nome do user handle
    const checkIfUserExist = await db.doc(`/users/${newUser.handle}`).get()

    // se existir um usuario...
    if(checkIfUserExist.exists){
        // nao vai cadastrar
        return res.status(400).json({ handle: 'this handle is already taken'})
    } 
    
    try{
        // esperar criar um usuario com o email e senha passado
        const data = await firebase
        .auth()
        .createUserWithEmailAndPassword(newUser.email, newUser.password)

        // pegar o id do usuario
        const userId = data.user.uid

        // pegar o token
        const userToken = data.user.getIdToken()
        
        // criar objeto com as credenciais
        const userCredentials = {
        handle, 
        email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        userId
        }

        // esperar criar um novo usuario, set() vai criar um novo usuario ao inves de get que apenas pega
        await db.doc(`/users/${newUser.handle}`).set(userCredentials)

        // retornar o token
        return res.status(201).json({ userToken} )

    } catch(err){
        console.error(err)
        if (err.code === 'auth/email-already-in-use'){
            return res.status(400).json({ email: 'Email already in use'})
        }
        return res.status(500).json({ error: err.code})
    }
    // feito isso vai criar uma autenticação para o usuario
}

// Log user in
exports.login = (req, res) => {
    const {email, password} = req.body
    const user = {email, password}

    const {valid, erros} = validateLoginData(user)

    if(!valid) return res.status(400).json(erros)

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then( data => {
            return data.user.getIdToken()
        })
        .then(token => {
            return res.json({token})
        })
        .catch(err => {
            console.error(err);
            if(err.code === "auth/wrong-password"){
                return res.status(403).json({general: "Wrong credentials. Please try again."})
            } else return res.status(500).json({error: err.code})
            
        })
}


// Add user details
exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body)

    db.doc(`/users/${req.user.handle}`).update(userDetails)
        .then( () => {
            return res.json({message: "Details added successfully"});
        })
        .catch( err => {
            console.error(err)
            return res.status(500).json({error: err.code})
        })
}

// Get own user details
exports.getAuthenticatedUser = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`).get()
        .then( doc => {
            if(doc.exists){
                userData.credentials = doc.data();
                return db.collection('likes').where('userHandle', '==', req.user.handle).get()
            }
        })
        .then( data => {
            userData.likes = []
            data.forEach(doc => {
                userData.likes.push(doc.data())
            })
            return res.json(userData)
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({error: err.code})
        })
}
// Upload proflie image
exports.uploadImage = (req, res) => {
    const BusBoy = require("busboy");
    const path = require('path')
    const os =require('os')
    const fs = require('fs')

    const busboy = new BusBoy({headers: req.headers})

    let imageFileName;
    let imageToBeUploaded = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if(mimetype !== "image/jpeg" && mimetype.type !== "image/png") return status(400).json({error: 'wrong file type submitted'})

        const imageExtension = filename.split('.')[filename.split('.').length - 1]
        imageFileName = `${Math.round(Math.random()*100000000)}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = {filepath, mimetype}
        file.pipe(fs.createWriteStream(filepath))
    })

    busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToBeUploaded.filepath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimetype
                }
            }
        })
        .then( () => {
            // alt midia visualiza no navegador, caso nao tenha vai baixar a imagem
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;

            return db.doc(`/users/${req.user.handle}`).update({imageUrl})
        })
        .then( () => {
            return res.json({message: "Image uploaded successfully"})
        })
        .catch(err=>{
            console.error(err)
            return res.status(500).json({error: err.code})
        })
    })

    busboy.end(req.rawBody);
    
}