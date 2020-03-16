const { db } = require('../util/admin');
const firebase = require('firebase');
const firebaseConfig = require('../util/config')

firebase.initializeApp(firebaseConfig);

exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };
  firebase.auth().signInWithEmailAndPassword(user.email, user.password).then(data => {
    return data.user.getIdToken();
  }).then(token => {
    return res.status(200).json({ token });
  }).catch(err => {
    console.error(err);
    if(err.code === 'auth/wrong-password') {
      return res.status(403).json({auth: 'credentials are not valid'})
    }
    return res.status(500).json({error: err.code});
  });
}

exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    username: req.body.username
  };

  db.doc(`/users/${newUser.username}`).get().then(doc => {
    if(doc.exists) {
      return res.status(400).json({
        username: `username: '${newUser.username}' is already taken`});
      } else {
        return firebase.auth().createUserWithEmailAndPassword(
          newUser.email, 
          newUser.password
        );
      }
  }).then(data => {
    userId = data.user.uid;
    return data.user.getIdToken();
  }).then(idToken => {
    token = idToken;
    const userCredentials = {
      username: newUser.username,
      email: newUser.email,
      createAt: new Date().toISOString(),
      userId
    };
    return db.doc(`/users/${newUser.username}`).set(userCredentials);
  }).then(() => {
    return res.status(201).json({ token });
  }).catch(err => {
    console.error(err);
    if (err.code === 'auth/email-already-in-use') {
      return res.status(400).json({email: 'Email already in use'});
    } else {
      return res.status(500).json({error: err.code});
    }
  })
}