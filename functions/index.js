const functions = require('firebase-functions');

const app = require('express')();

const authAutenticator = require('./util/authAutenticator')

const { getGroups, postGroups, getMyGroup } = require('./handlers/groups');
const { login, signup } = require('./handlers/users');

// groups routes:
app.get('/groups', getGroups);
app.post('/groups', authAutenticator, postGroups);
app.get('/groups/me', authAutenticator, getMyGroup);

// users routes:
app.post('/login', login);
app.post('/signup', signup);

exports.api = functions.region('europe-west1').https.onRequest(app)
