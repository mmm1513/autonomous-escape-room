const { db, admin } = require('./admin');

module.exports = (req, res, next) => {
  let idToken;
  const authorization = req.headers.authorization;
  if(authorization && authorization.startsWith('Bearer ')){
    idToken = authorization.split('Bearer ')[1];
  } else {
    console.error('No token found');
    return res.status(403).json({error: 'Unauthorized'});
  }

  admin.auth().verifyIdToken(idToken).then(decodedToken => {
    req.currentUser = decodedToken;
    return db.collection('users').where('userId', '==', req.currentUser.uid).limit(1).get();
  }).then(data => {
    req.currentUser.username = data.docs[0].data().username;
    return next();
  }).catch(err => {
    console.error({error: err.code});
    return res.status(403).json(err);
  });
}