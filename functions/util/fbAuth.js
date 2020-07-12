const {admin, db} = require('./admin')

// Middleware para verificar o token do usuario ao fazer um requisicao
module.exports = (req, res, next) => {
    let idToken;
    // se tiver autorização...
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
        // pegar o token
        idToken = req.headers.authorization.split('Bearer ')[1];
    } else {
        console.error('no token found')
        return res.status(403).json({ error: 'Unauthorized'})  
    }
    admin.auth().verifyIdToken(idToken)
        .then( decodedToken => {
            // dentro do decodedToken vai ter eos dados do user, vamos adicionar os dados para o request router ter acesso
            req.user = decodedToken;
            // o user handle nao fica do decoded token entao vamos fazer uma requisicao ao database
            return db.collection('users')
                .where('userId', '==', req.user.uid)
                .limit(1)
                .get();
        })
        .then( data => {
            // adicinar ao request do user o handle que vai ser o primeiro item do array
            req.user.handle = data.docs[0].data().handle
            return next();
        })
        .catch( err => {
            console.error('Error while verifying token ', err)
            return res.status(403).json(err)
        })
}