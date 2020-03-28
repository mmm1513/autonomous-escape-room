const { db } = require('../util/admin');

let getGroup = (groupName) =>{
    return db.doc(`/groups/${groupName}`).get()
}

let getUserGroup = async (userId) =>{
    let query = await db.collection('groups').where('users', 'array-contains', userId).limit(1).get()
    if (query.empty)
        return null
    return query.docs[0]
    
}

let isAdminGroup = (group) =>{
    return group.groupName == "admins"
}

module.exports.getUserGroupAuth = async (username) =>
{
    let userGroupRef = await getUserGroup(username)
    let userGroup = userGroupRef == undefined? {"groupName": null} : userGroupRef.data()
    let adminFlag = isAdminGroup(userGroup)
    return [ userGroup, adminFlag]
}
