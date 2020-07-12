const {db} = require('../util/admin')
const firebase = require('firebase')

const config = require('../util/config')
firebase.initializeApp(config)

const {validateSignupData, validateLoginData} = require('../util/validators')

exports.signup = async (req, res) => {

    const {email, password, confirmPassword, handle} = req.body
    const newUser = {email, password, confirmPassword, handle}

    const {valid, erros} = validateSignupData(newUser)

    if(!valid) return res.status(400).json(erros)

    
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
        handle, email,
        createdAt: new Date().toISOString(),
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