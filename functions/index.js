const functions = require('firebase-functions');

const app = require('express')();

const authAutenticator = require('./util/authAutenticator')

const { getGroups, postGroups, getMyGroup } = require('./handlers/groups');
const { login, signup } = require('./handlers/users');
const { getSchedule, reserveRoom, cancelReservation, createReservationDoc, deleteReservation } = require('./handlers/reservation')
// groups routes:
app.get('/groups', getGroups);
app.post('/groups', authAutenticator, postGroups);
app.get('/groups/me', authAutenticator, getMyGroup);

// users routes:
app.post('/login', login);
app.post('/signup', signup);

// room reservations
app.get('/reservations',getSchedule)
app.patch('/reserve_room',authAutenticator,reserveRoom)
app.patch('/cancel_reservation',authAutenticator,cancelReservation)

// room reservations: admin only
app.post("/reservations",authAutenticator,createReservationDoc)
app.delete("/reservations",authAutenticator,deleteReservation)

exports.api = functions.region('europe-west1').https.onRequest(app)
