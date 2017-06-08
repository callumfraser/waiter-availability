var express = require('express');
var bodyParser = require('body-parser');
var express_handlebars = require('express-handlebars');
var app = express();
var session = require('express-session');
var message;
var signedUp = false;
var regMsg;
var daysTakenMsg = "";
var fullname;
var port = process.env.PORT || 3002;
var mongoose = require('mongoose');
var Days = require('./lib/Days');
var daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var orderOfDays = {Sunday: 1, Monday: 2, Tuesday: 3, Wednesday: 4, Thursday: 5, Friday: 6, Saturday: 7};
var flash = require('connect-flash');
var User = require('./lib/User');
// console.log(user);
var sortDays = function(a, b){
  return orderOfDays[a] - orderOfDays[b]
};

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
    var fullName = req.body.fullname;
    var password = req.body.password;
    var confirmPassword = req.body.confPass;
    var register = req.body.register;
    var cancel = req.body.cancel

    var newUser = new User();
    newUser.username = username.toLowerCase();
    newUser.password = password;
    newUser.fullname = fullName;
if (register){
if (confirmPassword == password){
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
  } else {
  regMsg = "Passwords did not match, please re-enter.";
  res.redirect('/register')
}
} else if (cancel){
  res.redirect('/')
}
})

app.get('/waiters/:username', function(req, res) {
    var daysCheck = [];
    var daysConfirmed = [];
    var submitDays = req.body.submitDays;
    var waiterMsg = "Not signed up for any days yet.";
    var username = req.params.username;
    if (username == req.session.user) {
        Days.find({}, function(err, result) {
            if (err) {
                console.log(err)
            }
            result.forEach(function(dayCheck) {
              console.log(dayCheck.day);
                if (dayCheck.names.length < 3) {
                    daysCheck.push(dayCheck.day);
                }
            })

        Days.find({
            names: fullname
        }, function(err, result) {
            if (err) {
                console.log(err)
            } else if (result) {
                if (result.length > 0) {
                    signedUp = true;
                    waiterMsg = "You are signed up to work these days:";
                    result.forEach(function(dayCheck) {
                        daysConfirmed.push(dayCheck.day);
                        if (daysCheck.indexOf(dayCheck.day) == -1) {
                            daysCheck.push(dayCheck.day)
                        }
                    })
                }
            }
            if (daysCheck.length < 7){
              daysTakenMsg = "Other days are already full for this week.";
            } else {
              daysTakenMsg = "";
            }
            var daysCheckOrdered = daysCheck.sort(sortDays);
            var daysConfirmedOrdered = daysConfirmed.sort(sortDays);
            console.log(daysCheckOrdered);
            res.render('waiters', {
                fullname: fullname,
                signedUpFor: waiterMsg,
                daysConfirmed : daysConfirmedOrdered,
                daysCheck : daysCheckOrdered,
                daysTakenMsg
            })
          })
        })
    } else {
        res.render('failedLogin')
    }
})

app.post('/waiters/:username', function(req, res) {

    var username = req.session.user;
    var URLname = req.params.username;
    var dayArray;
    var logOut = req.body.logOut;
    var submitDays = req.body.submitDays;
    if (submitDays) {
        if (username !== URLname) {
            message = "Days were not submitted as you were not logged in."
            res.redirect('/');
        } else {
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
                    Days.findOne({
                        day: dayW
                    }, function(err, result) {
                        if (err) {
                            console.log(err)
                        } else if (result) {
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
                        }
                    });
                })
            }
            res.redirect('/waiters/' + username);

            // setTimeout(function() {
            // }, 800)
        }
    } else if (logOut) {
        signedUp = false;
        fullname = "";
        req.session.user = undefined;
        res.redirect('/')
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
        // setTimeout(function() {
            res.render('days', {
                NamesDays
            })
          })
        // }, 800)
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
        // setTimeout(function() {
            res.redirect('/days');
        // }, 500)
    } else if (logOut) {
        req.session.user = undefined;
        res.redirect('/');

    }
})





app.listen(port, function() {
    console.log("App listening on port")
});
