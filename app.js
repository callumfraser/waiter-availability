var express = require('express');
var bodyParser = require('body-parser');
var express_handlebars = require('express-handlebars');
var app = express();
var session = require('express-session');
var message;
var signedUp = false;
var userMessage;
var daysChosen = [];
var regMsg;
var fullname;
var port = process.env.PORT || 3002;
var mongoose = require('mongoose');
var Days = require('./lib/Days');
var daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var flash = require('connect-flash');
var User = require('./lib/User');
// console.log(user);

var format = require('util').format;


const mongoURL = process.env.MONGO_DB_URL || "mongodb://localhost/WaiterApp"
mongoose.connect(mongoURL);

app.use(flash());

app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(express.static('./public'));

app.use(session({
    secret: "callum123",
    resave: false,
    saveUnititialized: true
}))
app.use(bodyParser.json());

app.engine('handlebars', express_handlebars({
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

app.post('/', function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var logIn = req.body.logIn;

    if (logIn) {
        Days.find({}, function(err, result) {
            if (err) {
                console.log(err)
            } else if (result.length == 0) {
                daysOfWeek.forEach(function(day) {
                    var newDays = new Days
                    newDays.day = day;
                    newDays.names = [];

                    newDays.save(function(err, saved) {
                        if (err) {
                            console.log(err)
                        } else {
                            console.log("Day saved")
                        }
                    })
                })
            } else {
                console.log("days already exist")
            }
        });
        User.findOne({
            username: username.toLowerCase(),
            password: password
        }, function(err, result) {
            if (err) {
                console.log(err)
            }
            if (!result) {
                res.render("landing", {
                    message: "Incorrect username / password combination"
                })
            } else {
                fullname = result.fullname;
                message = "";
                if (username == "admin") {
                    req.session.user = "admin";
                    res.redirect('/days');
                } else {
                    req.session.user = username.toLowerCase();
                    console.log(username);
                    res.redirect('/waiters/' + username);
                }
            }

        })
    }
})

app.get('/', function(req, res) {
    res.render('landing', {
        message: message
    })
});


app.get('/register', function(req, res) {
    res.render('register', {
        regMsg: regMsg
    });
});

app.post('/register', function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var fullName = req.body.fullname;

    var newUser = new User();
    newUser.username = username.toLowerCase();
    newUser.password = password;
    newUser.fullname = fullName;

    newUser.save(function(err, savedUser) {
        if (err) {
            console.log(err);
            // return res.status(500).send();
            regMsg = "Could not register new user. Username is already taken, please choose another one."
            res.redirect('/register');
        } else {
            // return res.status(200).send();
            console.log('saved');
            message = "Successfully added new user";
            res.redirect('/');
            return;
        }
    });
})

app.get('/waiters/:username', function(req, res) {

    var daysConfirmed = [];
    var submitDays = req.body.submitDays;
    var waiterMsg = "Not signed up for any days yet.";
    var username = req.params.username;
    if (username == req.session.user) {
        Days.find({
            names: fullname
        }, function(err, result) {
            if (err) {
                console.log(err)
            } else if (result) {
                if (result.length > 0) {
                    signedUp = true;
                    waiterMsg = "You are signed up to work these days:"
                }
                for (var k = 0; k < result.length; k++) {
                    daysConfirmed.push(result[k].day);
                }
                if (daysConfirmed.length < daysChosen.length) {
                    var daysTaken = daysChosen.filter(function(val) {
                        return daysConfirmed.indexOf(val) == -1;
                    });
                    userMessage = "Your other chosen days (" + daysTaken + ") are already full."
                }
            }
            res.render('waiters', {
                fullname: fullname,
                signedUpFor: waiterMsg,
                daysConfirmed,
                daysFull: userMessage
            })
        })
    } else {
        res.render('failedLogin')
    }
})

app.post('/waiters/:username', function(req, res) {

    var username = req.session.user;
    var URLname = req.params.username;
    console.log(username);
    console.log(URLname);


    var dayArray;
    var logOut = req.body.logOut;
    var submitDays = req.body.submitDays;
    if (submitDays) {
        userMessage = "";
        daysChosen = [];
        if (username !== URLname) {
            console.log(req.session.user);
            console.log(req.params.username);
            message = "Days were not submitted as you were not logged in."
            res.redirect('/');
        } else {
            console.log("god help me")
            var wDays = req.body.weekDays;
            if (wDays == undefined) {
                res.redirect('/waiters/' + username);
            }

            if (signedUp == true) {
                daysOfWeek.forEach(function(dayOfWeek) {
                    Days.update({
                            day: dayOfWeek
                        }, {
                            $pull: {
                                "names": fullname
                            },
                        }, {
                            safe: true,
                            upsert: true
                        },
                        function(err, success) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log("success!")
                            }
                        });
                })
            }
            if (wDays !== undefined) {
                if (wDays.constructor === Array) {
                    dayArray = wDays
                } else {
                    dayArray = [wDays]
                }

                dayArray.forEach(function(dayW) {
                    daysChosen.push(dayW);
                    Days.findOne({
                        day: dayW
                    }, function(err, result) {
                        if (err) {
                            console.log(err)
                        } else if (result) {
                            if (result.names.length < 3) {
                                var signedUpCheck = true;
                                for (var y = 0; y < 3; y++) {
                                    if (result.names[y] == fullname) {
                                        signedUpCheck = false;
                                    }
                                }
                                if (signedUpCheck == true) {
                                    Days.update({
                                            day: dayW
                                        }, {

                                            $push: {
                                                "names": fullname
                                            },
                                        }, {
                                            safe: true,
                                            upsert: true
                                        },
                                        function(err, success) {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                console.log("successFULLLLL!")
                                            }
                                        })
                                };
                            }
                        }
                    });
                })
            }

            setTimeout(function() {
                res.redirect('/waiters/' + username);
            }, 800)
        }
    } else if (logOut) {
        daysChosen = [];
        signedUp = false;
        fullname = "";
        req.session.user = undefined;
        res.redirect('/')
        userMessage = "";
    }

})



app.get('/days', function(req, res) {
    if (req.session.user === "admin") {
        var NamesDays = [{
                day: "Sunday",
                names: [],
                sufficientStatus: ""
            },
            {
                day: "Monday",
                names: [],
                sufficientStatus: ""
            },
            {
                day: "Tuesday",
                names: [],
                sufficientStatus: ""
            },
            {
                day: "Wednesday",
                names: [],
                sufficientStatus: ""
            },
            {
                day: "Thursday",
                names: [],
                sufficientStatus: ""
            },
            {
                day: "Friday",
                names: [],
                sufficientStatus: ""
            },
            {
                day: "Saturday",
                names: [],
                sufficientStatus: ""
            },
        ];
        Days.find({}, function(err, results) {
            if (err) {
                console.log(err)
            } else {
                results.forEach(function(schedule) {
                    var weekNames = schedule.names
                    console.log(weekNames.length);
                    for (var k = 0; k < 7; k++) {
                        if (schedule.day == daysOfWeek[k]) {
                            if (weekNames.length == 3) {
                                NamesDays[k].sufficientStatus = "sufficient"
                            } else if ((0 < weekNames.length) && (weekNames.length < 3)) {
                                NamesDays[k].sufficientStatus = "insufficient"
                            } else if (weekNames.length == 0) {
                                NamesDays[k].sufficientStatus = "none"
                            }
                            weekNames.forEach(function(indivName) {
                                NamesDays[k].names.push(indivName)
                            });
                        }
                    }
                })
            }
        })
        setTimeout(function() {
            res.render('days', {
                NamesDays
            })
        }, 800)
    } else {
        res.render('failedLogin')
    }
});

app.post('/days', function(req, res) {
    var logOut = req.body.logOut;
    var clearButton = req.body.clearButton;
    if (clearButton) {
        Days.remove({}, function(err, result) {
            if (err) {
                console.log(err)
            }
        })
        setTimeout(function() {
            res.redirect('/days');
        }, 500)
    } else if (logOut) {
        req.session.user = undefined;
        res.redirect('/');

    }
})





app.listen(port, function() {
    console.log("App listening on port")
});
