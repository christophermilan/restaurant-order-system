const express = require('express')
const objectID = require('mongodb').ObjectID
let router = express.Router();
router.use(express.static("public"));

router.get("/:orderID", getOrder)
router.post("/", express.json(), receiveOrder)

//Query's order collection using userID to get the specific order
function getOrder(req, res) {
    let oid;
	try{
		oid = objectID(req.params.orderID)
	}catch{
		res.status(404).send("Unknown ID");
		return;
	}
    req.app.locals.db.collection("orders").findOne({_id: oid}, function(err, result){
        if(err){
            res.status(500).send("Error retrieving from database.");
            return;
        }
        res.status(200).render('pages/order', {order: result, log: req.session.loggedin, name: req.session.username, id: req.session._id})
    });
}

// Adds the user's order to the database
function receiveOrder(req, res) {
    req.body.userID = req.session._id
    req.app.locals.db.collection("orders").insertOne(req.body, function(err, result){
        if(err){
            res.status(500).send("Error saving to database.");
            return;
        }
        res.status(200).send()
    });
}


module.exports = router;