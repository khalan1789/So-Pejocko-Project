
const Sauce = require('../models/sauce');
const fs = require('fs');

//ajout de la protection xss pour contrôler les entrées utilisateurs dans les champs
const xss = require("xss")

//création d'une sauce
exports.createSauce = (req, res, next) => {
    const sauceObject = JSON.parse(req.body.sauce);
    delete sauceObject._id;
    const sauce = new Sauce({
      userId :  xss(sauceObject.userId),
      name : xss(sauceObject.name),
      manufacturer : xss(sauceObject.manufacturer),
      description :  xss(sauceObject.description),
      mainPepper :  xss(sauceObject.mainPepper),
      heat : sauceObject.heat,
      likes : "0",
      dislikes : "0",
      usersLiked : [],
      usersDislikes : [],
      imageUrl : `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
    });
    sauce.save()
      .then(res.status(201).json({ message : "Sauce créée avec succès !"}))
      .catch(error => res.status(400).json({ error }))
};

//récupération de la sauce sélectionnée
exports.getOneSauce = (req, res, next) => {
    Sauce.findOne({_id : req.params.id})
      .then(sauce => res.status(200).json(sauce))
      .catch(error => res.status(400).json({error}))
};

//modification d'une sauce
exports.modifySauce = (req, res, next) => {
    const sauceObject = req.file ?
    {
      ...JSON.parse(req.body.sauce),
      imageUrl : `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
    } : { ...req.body};
    Sauce.updateOne({_id : req.params.id}, {...sauceObject, _id : req.params.id})
      .then(sauces => res.status(200).json({message : "sauce modifiée"}))
      .catch(error => res.status(400).json({error}))
};

//suppression de la sauce
exports.deleteSauce = (req, res, next) => {
    Sauce.findOne({_id : req.params.id})
      .then(sauce => {
        const filename = sauce.imageUrl.split('/images/')[1];
        fs.unlink(`images/${filename}`, () => {
          Sauce.deleteOne({_id : req.params.id})
          .then(() => res.status(200).json({message : "sauce supprimée !"}))
          .catch(error => res.status(400).json({error}));
        })
      })
      .catch(error => res.status(500).json({ error }));    
};

//récupération de toutes les sauces
exports.getAllSauce = (req, res, next) => {
    Sauce.find()
      .then(sauces => res.status(200).json(sauces))
      .catch(error => res.status(400).json({error}))
};

 // système de like
 exports.voteSauce = (req, res, next) => {
    const vote = req.body.like;
    switch(vote){
          //l'utilisateur aime : on ajoute son id au tableau et on incrémente les likes
          case 1 :
              Sauce.updateOne({_id : req.params.id}, {$inc : {likes : +1 },
              $push : { usersLiked : req.body.userId}
            })
                .then(() => res.status(201).json({message : "J'aime ajouté"}))
                .catch(error => res.status(500).json({error}))       
          break;

          //l'utilisateur n'aime pas : on ajoute son id au tableau et on incrémente les likes
          case -1 :
            Sauce.updateOne({_id : req.params.id}, {
              $push : { usersDisliked : req.body.userId}, $inc : {dislikes : +1 }
            })
                .then(() => res.status(201).json({message : "je n'aime pas ajouté"}))
                .catch(error => res.status(500).json({ error }))
          break;

          //l'utilisateur annule son choix : on retire l'utilisateur du tableau et on désincrémente les likes ou dislikes suivant le tableau dans lequel il se trouvait
          case 0 :  
            Sauce.findOne({_id : req.params.id})
                .then(sauce => {
                    if (sauce.usersLiked.includes(req.body.userId)){
                      Sauce.updateOne({_id : req.params.id}, {
                        $pull : { usersLiked : req.body.userId}, $inc : {likes : -1 }
                      })
                        .then(() => res.status(201).json({message : "j'aime a été retiré !"}))
                        .catch(error => res.status(500).json({error}))
                    }
                    else{
                      Sauce.updateOne({_id : req.params.id}, {
                        $pull : { usersDisliked : req.body.userId}, $inc : {dislikes : -1 }
                      })
                        .then(() => res.status(201).json({message : "je n'aime pas été retiré !"}))
                        .catch(error => res.status(500).json({ error }))
                    }

                }) 
                .catch(error => res.status(500).json({ error}))
          break;  
            
          default : console.log(req.body)
      }
    
}
