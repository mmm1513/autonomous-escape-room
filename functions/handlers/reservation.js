const { db } = require('../util/admin');
const {getUserGroupAuth} = require('../util/userGroup')

function resrevationDocPath(reservationId)
{
    return `/reservations/${reservationId}`
}

async function getReservation(reservationId) {
    let reservationDoc = await db.doc(resrevationDocPath(reservationId)).get()
    if (!reservationDoc.exists)
    {
        return null
    }
    else
        return reservationDoc
}

exports.getSchedule = (req,res) => {
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
  }
  

exports.reserveRoom = async (req,res) => {
    let reservationDoc = await getReservation(req.body.reservationId)
    
    if (reservationDoc == null) {
      return res.status(404).json({"error":`Reservation ID: ${req.body.reservationId} not found`});
    }
    
    let userGroup,adminFlag;
    [userGroup,adminFlag] = await getUserGroupAuth(req.currentUser.username)
    let current_state = reservationDoc.data()
    
    if (current_state["reserved_for"] && !adminFlag)
    {
        if (current_state["reserved_for"] != userGroup["groupName"]) {
           return res.status(401).json({"error": `Reservation ID: ${req.body.reservationId} already reserved`})    
        }
        else {
            return res.status(200).json({"msg": `Reservation ID: ${req.body.reservationId} already reserved for the user's group`})    
        }
    }
    
    if (adminFlag)
    {
        let reqGroupNameDoc = await getGroup(req.body.groupName)
        if (!reqGroupNameDoc.exists){
            return res.status(404).json({"error":`Group: ${reqGroupNameDoc.data()["groupName"]} not found`});
        }
        userGroup = reqGroupNameDoc.data()
    }
    let updatedReservation = null
    try {
        updatedReservation = await db.doc(resrevationDocPath(req.body.reservationId)).update({"reserved_for": userGroup["groupName"]})    
    } catch (error) {
        console.error(error)
    }
    if ( updatedReservation  == null)
        return res.status(500).json({"error": "unable to update file"})
    res.status(200).json({"msg": "OK"})
}

exports.createReservationDoc = async (req, res) => {
    let userGroup,adminFlag;
    [userGroup,adminFlag] = await getUserGroupAuth(req.currentUser.username)
    if (!adminFlag)
    {
        res.status(403).json({"error": "unauthorized request"})
    }
    try
    {
        let new_res = await db.collection('reservations').add({
            "at": new Date(req.body.date)
        })
        res.status(200).json({"new_res":new_res.id})
    }
    catch(e)
    {
        console.error(e)
        res.status(500).json({"error":"couldn't create the reservation"})
    }
    
}

exports.cancelReservation = async (req,res) => {
    let userGroup,adminFlag;
    [userGroup,adminFlag] = await getUserGroupAuth(req.currentUser.username)
    let resrevationRef = db.doc(resrevationDocPath(req.body.reservationId))
    let reservation = (await resrevationRef.get()).data()
    let authFlag = adminFlag || (reservation["reserved_for"] == userGroup["groupName"])
    console.log(adminFlag,reservation["reserved_for"],userGroup["groupName"])
    if (authFlag)
    {
        resrevationRef.update({"reserved_for":""})
        res.sendStatus(200)
    }
    else
    {
        res.status(403).json({"error": "unauthorized request"})
    }
    
}

exports.deleteReservation = async (req, res) => 
{
    [userGroup,adminFlag] = await getUserGroupAuth(req.currentUser.username)
    if(!adminFlag)
    {
        return res.status(403).json({"error":"unauthorized request"})
    }
    db.doc(resrevationDocPath(req.body.reservationId)).delete().then(res.sendStatus(204)).catch(err => {
        console.error(err)
        res.status(500).json({"error": `cannot delete reservation ${req.body.reserveId}`})
      })
}