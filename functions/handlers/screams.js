const {db} = require('../util/admin')


exports.getAllScreams = (req, res) => {
    db.collection('screams')
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
}


exports.postOneScream = (req, res) =>{ 
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

    db.collection('screams')
        .add(newScream)
        .then( (doc) => {
            const resScream = newScream;
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
    // ir nas screams e pegar pelo id passado
    db.doc(`/screams/${req.params.screamId}`).get()
        .then( doc => {
            // se nao exister retornar um erro 404
            if(!doc.exists){
                return res.status(404).json({error: "scream not found"})
            }
            screamData = doc.data();
            
            screamData.screamId = doc.id;
 
            // pegar os comentarios deessa scream
            return db.collection('comments')
                .orderBy('createdAt', 'desc')
                .where('screamId', '==', req.params.screamId)
                .get()
        })
        .then( data => {
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
    if(req.body.body.trim() === "") return res.status(400).json({error: "Must not be empty"})

    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        screamId: req.params.screamId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    }

    db.doc(`/screams/${req.params.screamId}`).get()
        .then( doc => {
            if(!doc.exists){
                return res.status(404).json({error: 'Scream not found'})
            }
            return doc.ref.update({commentCount: doc.data().commentCount + 1})
        })
        .then(() => {
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
    // pegar o documento que vai ser dado like
    const likeDocument = db.collection('likes')
        .where('userHandle', '==', req.user.handle)
        .where('screamId', '==', req.params.screamId)
        .limit(1);
    
    // vai pegar o documento do id passado
    const screamDocument = db.doc(`/screams/${req.params.screamId}`);

    let screamData = {};

    screamDocument.get()
        // doc vai ter todas as informações da scream passada
        .then( doc => {
            if(doc.exists){
                // dados da scream
                screamData = doc.data();
                // colocar nos dados o id do documento que esta dando like
                screamData.screamId = doc.id;
                return likeDocument.get()
            } else {
                return res.status(404).json({error: 'Scream not found'})
            }
        })
        .then( data => {
            // se esses dados estiverem vazio
            if(data.empty){
                // adicionar na collection 'likes' um novo like com o id do post e o nome do user
                return db.collection('likes').add({
                    screamId: req.params.screamId,
                    userHandle: req.user.handle
                })
                .then( () => {
                    // aumentar o numero de likes do post
                    screamData.likeCount++
                    // atualizar o banco de dados real do firebase com o numero de likes
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
    const likeDocument = db.collection('likes')
        .where('userHandle', '==', req.user.handle)
        .where('screamId', '==', req.params.screamId)
        .limit(1);
    
    const screamDocument = db.doc(`/screams/${req.params.screamId}`);

    let screamData = {};

    screamDocument.get()
        .then( doc => {
            if(doc.exists){
                screamData = doc.data();
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
                        screamData.likeCount--;
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
    const document = db.doc(`/screams/${req.params.screamId}`);

    document.get()
        .then( doc => {
            if(!doc.exists){
                return res.status(404).json({erro: "Scream not found"})
            }
            if(doc.data().userHandle !== req.user.handle) {
                return res.status(403).json({error: "Unauthorized"})
            } else {
                return document.delete();
            }
        })
        .then( () => {
            res.json({message: "Scream deleted successfully"})
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({error: err.code})
        })
}
