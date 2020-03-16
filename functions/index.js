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


const AuthAutenticator = (req, res, next) => {
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


app.get('/tugy', AuthAutenticator, (req, res) => {
  return res.status(200);
})


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

app.post('/groups', AuthAutenticator, (req, res) => {
  const newGroup = {
    groupName: req.body.groupName,
    users: req.body.users.concat(req.currentUser.username),
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
  });
});


app.get('/groups/me', AuthAutenticator, (req, res) => {
  return db.collection('groups').where('users', 'array-contains', req.currentUser.username).limit(1).get().then(data => {
    const groupData = data.docs[0].data()
    return res.status(200).json({
      groupName: groupData.groupName,
      createAt: groupData.createAt,
      roomStartTime: groupData.roomStartTime,
      roomFinishTime: groupData.roomFinishTime,
      score: groupData.score,
      invitedUsersId: groupData.invitedUsersId,
      users: groupData.users
  });
  }).catch(err => {
    console.error({error: err.code});
    return res.status(400).json(err);
  });
});


app.post('/login', (req, res) => {
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

app.get('/reservations',(req,res) => {
  if (Object.keys(req.body).length > 0)
    res.status(500).json({error: "not implemented yet"})
  else  {
    db.collection("reservations").where('at','>=',new Date()).limit(10).get().then(
      docs => {
        docs.forEach(doc => {
          let resp = doc.data()
          resp["reserveId"] = doc.id
          res.write(JSON.stringify(resp) + "\n")
        })
        res.end()
      })
  }
})

app.put('/reservations',(req,res)=>{
  db.doc(`/reservations/${req.body.reserveId}`).get().then(
    doc =>{
      if (!doc.exists)
      {
        res.status(404).json({"error":`Reservation ID: ${req.body.reserveId} not found`})
      }
      let current_state = doc.data()
      if (current_state["reserved_for"])
      {
        res.status(403).json({"error": `Reservation ID: ${req.body.reserveId} already reserved`})
      }
      db.doc(`/groups/${req.body.groupName}`).get().then(
        doc => {
          if (doc.exists)
            db.doc(`/reservations/${req.body.reserveId}`).update({"reserved_for": req.body.groupName}).then(doc =>res.sendStatus(200)).catch(err => {
              console.error(err)
              res.status(500).json({"error": "unable to update file"})
            })
          else
              res.status(404).json({"error": `Group ${req.body.groupName} not found`})
        }).catch(err =>{
          console.error(err)
          res.status(500).json({"error": `Error looking for Group ${req.body.groupName}`})
        })}).catch(err => console.error(err))
})

app.delete('/reservation',(req,res) =>{
  db.doc(`/reservations/${req.body.reserveId}`).delete().then(res.sendStatus(204)).catch(err => {
    console.error(err)
    res.status(500).json({"error": `cannot delete reservation ${req.body.reserveId}`})
  })
})

exports.api = functions.region('europe-west1').https.onRequest(app)
