const express = require('express');
const app = express();
const mongoo = require("mongodb")
const mongo = mongoo.MongoClient

const session = require('express-session')
// Create the Session database
const MongoDBStore = require('connect-mongodb-session')(session);
const store = new MongoDBStore({
  uri: 'mongodb://localhost:27017/tokens',
  collection: 'sessions'
});
app.use(session({ secret: 'some secret here', store: store }))

app.set("view engine", "pug");
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));

//Set up routers
let userRouter = require("./user-router");
app.use("/users", userRouter);
let orderRouter = require("./orderform-router");
app.use("/orders", orderRouter);
app.get("/orderform", sendOrderForm);

app.get('/', function(req, res) {
    if (req.session.username != undefined) {
        res.status(200).render("pages/index", {log: req.session.loggedin, name: req.session.username, id: req.session._id})
    }else {
        res.status(200).render("pages/index", {log: req.session.loggedin, name: '', id: ''})
    }
})

app.get('/register', function(req, res) {
    if(req.session.loggedin){
		res.redirect("/");
        return;
    }
    res.status(200).render("pages/register", {userExist: false})
})

// Query's to see if the username already exists in the database. If not, it inserts it into the database
app.post('/register', function(req, res) {
	if(req.session.loggedin){
		res.redirect("/");
		return;
	}
	
	let username = req.body.username;
    let password = req.body.password;

	app.locals.db.collection("users").findOne({username}, function(err, result){
        if(err)throw err;
        
		if(result) {
            res.render("pages/register", {userExist: true})
            return;
        }
		
		if(!result){
            req.session.loggedin = true;
            req.session.username = req.body.username;
            req.session.password = req.body.password;

            let user = {}
            user.username = req.session.username;
            user.password = req.session.password;
            user.privacy = false;

			app.locals.db.collection("users").insertOne(user, function(err, result){
                if(err){
                    res.status(500).send("Error saving to database.");
                    return;
                }
                //Redirect to the view page for the new product
                req.session._id = result.insertedId
                res.redirect("http://localhost:3000/users/" + result.insertedId);
            });
		}else{
			res.status(401).send("Not authorized. Invalid username.");
			return;
		}
	});
})

// Logs in by checking the database if the user exists
app.post("/login", function(req, res){
	if(req.session.loggedin){
		res.redirect("/");
		return;
	}
	
	let username = req.body.username;
    let password = req.body.password;

	app.locals.db.collection("users").findOne({username}, function(err, result){
		if(err)throw err;
				
		if(result){
			//Not checking passwords
			req.session.loggedin = true;
            req.session.username = username;
            req.session.password = password;
            req.session._id = result._id;
			res.redirect("/");
		}else{
			res.status(401).send("Not authorized. Invalid username.");
			return;
		}
	});
});

app.get("/logout", function(req, res, next){
    req.session.loggedin = false;
    delete req.session.username;
    delete req.session.password;
    delete req.session._id;
	res.redirect("/");
})

function sendOrderForm(req, res) {
    if (req.session.loggedin === true) {
        res.status(200).render('pages/orderform', {log: req.session.loggedin, name: req.session.username, id: req.session._id})
    } else {
        res.status(401).send("Not authorized.");
    }
}

//Initialize connection to database
mongo.connect("mongodb://localhost:27017", function(err, client) {
	if (err) {
		console.log("Error in connecting to database");
		console.log(err);
		return;
	}
	
	//Set the app.locals.db variale to be the 'a4' database
	app.locals.db = client.db("a4");
	app.locals.db.createCollection("orders")
	//Start listening
	app.listen(3000);
	console.log("Server listening on port 3000");
})