const { db } = require('../util/admin');

exports.getGroups = (req, res) => {
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
}

exports.postGroups = (req, res) => {
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
}

exports.getMyGroup = (req, res) => {
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
}