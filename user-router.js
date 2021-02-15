const express = require('express')
const objectID = require('mongodb').ObjectID
let router = express.Router();

router.get('/', sendUsers);
router.get('/:userID', sendUser)
router.post('/:userID', updateUser)

//Query's database for users that are not private
function sendUsers(req, res){
    if (req.query.name === undefined) {
        req.app.locals.db.collection("users").find({privacy: false}).toArray(function(err, result){
            if(err){
                res.status(500).send("500 Error reading database.");
                return;
            }
            if(!result){
                res.status(404).send("404 Error Unknown ID");
                return;
            }
            res.render("pages/users", {users: result, log: req.session.loggedin, name: req.session.username, id: req.session._id});
        });
    }else {
        req.app.locals.db.collection("users").find({username: {$regex: req.query.name, $options: "$i"}, privacy: false}).toArray(function(err, result){
            if(err){
                res.status(500).send("500 Error reading database.");
                return;
            }
            if(!result){
                res.status(404).send("404 Error: Unknown ID");
                return;
            }
            res.render("pages/users", {users: result, log: req.session.loggedin, name: req.session.username, id: req.session._id});
        });
    }
}
// Uses user ID, to query the order collection and grab the order ID
function sendUser(req, res) {
    let oid;
	try{
		oid = objectID(req.params.userID)
	}catch{
		res.status(404).send("404 Error: Unknown ID");
		return;
    }
    
    req.app.locals.userID = oid;
    let user;
	req.app.locals.db.collection("users").findOne({"_id": oid}, function(err, result){
		if(err){
			res.status(500).send("500 Error reading database.");
			return;
		}
		if(!result){
			res.status(404).send("404 Error: Unknown ID");
			return;
        }
        
        if (result.privacy == true && req.session.loggedin == false) {
            res.status(403).send("403 Error: You are not allowed to view this user");
			return;    
        }

        user = result
        req.app.locals.db.collection("orders").find({"userID": oid}).toArray(function(err, result){
            if(err){
                res.status(500).send("Error reading database.");
                return;
            }
            if(!result){
                res.status(404).send("404 Error: Unknown ID");
                return;
            }
            let orders = [];

            for (let i = 0; i < result.length; i++) {
                orders.push(result[i]._id)
            }

            var userOwnProfile = false
            if (req.session._id == req.params.userID) {
                userOwnProfile = true
            }
            res.status(200).render("pages/user", {user, orders, id: req.params.userID, userOwnProfile, log: req.session.loggedin, name: req.session.username, id: req.session._id});
        });
	});
}

//Sets user privacy on/off
function updateUser(req, res) {
	let privacy = req.body.privacy

    if (privacy == 'on') req.app.locals.db.collection("users").updateOne({username: req.session.username}, {$set : {privacy: true}})
    else req.app.locals.db.collection("users").updateOne({username: req.session.username}, {$set : {privacy: false}})
    res.redirect('/users/' + req.session._id)
}

module.exports = router;