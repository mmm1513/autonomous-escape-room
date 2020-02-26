const app = require('express')();
const firebase = require('firebase');
const admin = require('firebase-admin');
const functions = require('firebase-functions');

admin.initializeApp();
const db = admin.firestore()

const firebaseConfig = {
  apiKey: "AIzaSyAapRMeD_keF8tS7EdHfTn9nVJ7LJwPxd4",
  authDomain: "autonomous-escape-room.firebaseapp.com",
  databaseURL: "https://autonomous-escape-room.firebaseio.com",
  projectId: "autonomous-escape-room",
  storageBucket: "autonomous-escape-room.appspot.com",
  messagingSenderId: "939463671226",
  appId: "1:939463671226:web:91bf9e6b284a1b48c17183",
  measurementId: "G-8G70T9MSHZ"
};

firebase.initializeApp(firebaseConfig);


app.get('/groups', (req, res) => {
  db.collection('groups').get().then((data) => {
    let groups = [];
    data.forEach((doc) => {
      groups.push({
        groupName: doc.data().groupName,
        roomStartTime: doc.data().roomStartTime,
        roomFinishTime: doc.data().roomFinishTime,
        score: doc.data().score,
        invitedUsersId: doc.data().invitedUsersId,
        users: doc.data().users
      });
    });
    return res.json(groups);
  }).catch((err) => console.error(err));
})

app.post('/groups', (req, res) => {
  const newGroup = {
    groupName: req.body.groupName,
    users: req.body.users,
    createAt: new Date().toISOString()
  };
  db.doc(`/groups/${newGroup.groupName}`).get().then(doc => {
    if(doc.exists) {
      return res.status(400).json({
        groupName: `groupName: '${newGroup.groupName}' is already taken`});
    } else {
      return db.doc(`/groups/${newGroup.groupName}`).set(newGroup);
    }
  }).then(() => {
    res.status(201).json(newGroup);
  }).catch(err => {
    console.error(err);
      return res.status(500).json({error: err.code});
  })
});

app.post('/signup', (req, res) => {
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
});

exports.api = functions.region('europe-west1').https.onRequest(app)
