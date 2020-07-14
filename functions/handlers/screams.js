const {db} = require('../util/admin')


exports.getAllScreams = (req, res) => {
    // db.collection(<nome da collection>) para acessá-la
    db.collection('screams')
        // ordenar
        .orderBy('createdAt', 'desc')
        // .get() para pegar todos os dados da collection
        .get()
        .then( data => {
            // array para armazenar os dados
            let screams = []
            data.forEach( doc => {
                // para cada documento dentro dos dados colocar deentro do array criado
                screams.push({
                    sreamId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt,
                    commentCount: doc.data().commentCount,
                    likeCount: doc.data().likeCount,
                    userImage: doc.data().userImage,
                });
            })
            // retornar em um json todos os dados da collection 'screams'
            return res.json(screams);
        })
        .catch( err => console.error(err))
}


exports.postOneScream = (req, res) =>{ 
    // remover todos os espaços em branco para evitar mandar uma scream vazia
    if(req.body.body.trim() === ""){
        return res.status(400).json({body: "Body must not be empty"})
    }

    const newScream = {
        body: req.body.body,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    };

    // pegar a collection 'screams'
    db.collection('screams')
        // adicionar o objeto criado
        .add(newScream)
        .then( (doc) => {
            const resScream = newScream;
            // adicionar o Id do documento criado no objeto
            resScream.screamId = doc.id;
            res.json(resScream)
        })
        .catch( err => {
            res.status(500).json({error: 'something went wrong' + err})
            console.error(err)
        })
}

// pegar uma scream
exports.getScream = (req, res) => {
    // dados da sacream
    let screamData = {}
    
    // db.doc pega um caminho especifico dentro da collection, nesse caso queeremos a scream passada pelo id
    db.doc(`/screams/${req.params.screamId}`).get()
        .then( doc => {
            // se nao exister retornar um erro 404
            if(!doc.exists){
                return res.status(404).json({error: "scream not found"})
            }
            // armazenar os dados dentro do objeto criado
            screamData = doc.data();
            // adicionar o id da scream ao objeto
            screamData.screamId = doc.id;
            // pegar os comentarios deessa scream
            return db.collection('comments')
                .orderBy('createdAt', 'desc')
                // pegar os comentarios onde o id é igual ao passado pelo parametro
                .where('screamId', '==', req.params.screamId)
                .get()
        })
        .then( data => {
            // adicionar os comentarios dessa scream dentro do objeto 'screamData'
            screamData.comments = [];
            data.forEach(doc => {
                screamData.comments.push(doc.data())
            });
            return res.json(screamData)
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({error: err.code})
        })
}

// comment on a scream, os comentarios vao ficar salvos em outra collection para tornar o app mais eficiente, caso seja um grande app com mais de 1k de comments para requisitar um post demoraria bastante e causaria mais por conta do trafego pelo request.
exports.commentOnScream = (req, res) => {
    // verificar se o comentario é nulo
    if(req.body.body.trim() === "") return res.status(400).json({comment: "Must not be empty"})

    // objeto para o comentario
    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        screamId: req.params.screamId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    }

    // pegar a scream
    db.doc(`/screams/${req.params.screamId}`).get()
        .then( doc => {
            if(!doc.exists){
                return res.status(404).json({error: 'Scream not found'})
            }
            // atualizar a quantidade de comentarios no db
            return doc.ref.update({commentCount: doc.data().commentCount + 1})
        })
        .then(() => {
            // na collection('comments) adicionar um novo comentario com o objeto que criamos que tem os dados da scream
            return db.collection('comments').add(newComment)
        })
        .then( () => {
            res.json(newComment)
        })
        .catch( err => {
            console.log(err)
            res.status(500).json({error: "Something went wrong"})
        })
}

// Like a scream, checar se o usuario já deu like e pegar a quantidadee, caso o post exista
exports.likeScream = (req, res) => {
    // pegar a collection 'likes' e verificar se existe um like desse usuario para essa scream
    const likeDocument = db.collection('likes')
        // onde o usuario que deu like é igual ao usuario que tentou da like
        .where('userHandle', '==', req.user.handle)
        // e a screamId é igual a passada pelo parametrio
        .where('screamId', '==', req.params.screamId)
        .limit(1);

    // vai pegar o documento do id passado
    const screamDocument = db.doc(`/screams/${req.params.screamId}`);

    // para adicionar os dados da scream
    let screamData = {};

    screamDocument.get()
        // doc vai ter todas as informações da scream passada
        .then( doc => {
            // caso a scream exista
            if(doc.exists){
                // adicionar os dados da scream
                screamData = doc.data();
                // colocar nos dados o id do documento que esta dando like
                screamData.screamId = doc.id;
                // e retonar o documento que verificou se o usuario ja deu like nessa scream
                return likeDocument.get()
            } else {
                return res.status(404).json({error: 'Scream not found'})
            }
        })
        .then( data => {
            // se esses dados estiverem vazio, ou seja, se o usuario nao deu like na scream
            if(data.empty){
                // adicionar na collection 'likes' um novo like com o id do post e o nome do user
                return db.collection('likes').add({
                    screamId: req.params.screamId,
                    userHandle: req.user.handle
                })
                .then( () => {
                    // aumentar o numero de likes do post no objeto criado
                    screamData.likeCount++
                    // atualizar no banco de dados real do firebase com o numero de likes
                    return screamDocument.update({likeCount: screamData.likeCount});
                })
                .then( () => {
                    return res.json(screamData)
                })
            } else {
                return res.status(400).json({error: "scream already liked"})
            }
        })
        .catch( err => {
            console.error(err)
            res.status(500).json({error: err.code})
        })

}

exports.unlikeScream = (req, res) => {
    // verificar se o usuario tem um like no db para a scream passada
    const likeDocument = db.collection('likes')
        .where('userHandle', '==', req.user.handle)
        .where('screamId', '==', req.params.screamId)
        .limit(1);
    
    const screamDocument = db.doc(`/screams/${req.params.screamId}`);

    let screamData = {};

    screamDocument.get()
        .then( doc => {
            if(doc.exists){
                // pegar os dados da screeam
                screamData = doc.data();
                // e o id
                screamData.screamId = doc.id;
                return likeDocument.get()
            } else {
                return res.status(404).json({error: 'Scream not found'})
            }
        })
        .then( data => {
            if(data.empty){
                return res.status(400).json({error: "scream not liked"})
            } else {
                return db.doc(`likes/${data.docs[0].id}`).delete()
                    .then( () => {
                        // nos objeto da scream subtrair a qtd de likes
                        screamData.likeCount--;
                        // atualizar os dados do db
                        return screamDocument.update({likeCount: screamData.likeCount})
                    })
                    .then( () => {
                        res.json(screamData)
                    })
            }
        })
        .catch( err => {
            console.error(err)
            res.status(500).json({error: err.code})
        })

}

// Delete a scream
exports.deleteScream = (req, res) => {
    // pegar a scream passada pelo id
    const document = db.doc(`/screams/${req.params.screamId}`);

    document.get()
        .then( doc => {
            // se nao existir retornar erro 404...
            if(!doc.exists){
                return res.status(404).json({erro: "Scream not found"})
            }
            // se nao for o dono da scream retornar 403...
            if(doc.data().userHandle !== req.user.handle) {
                return res.status(403).json({error: "Unauthorized"})
            } else {
                // deletar o documento
                return document.delete();
            }
        })
        .then( () => {
            // retornar mensagem
            res.json({message: "Scream deleted successfully"})
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({error: err.code})
        })
}
