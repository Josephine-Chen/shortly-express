var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var session = require('express-session');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

//Middleware
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: {secure: true},
}));
//End middleware

//Index
app.get('/',
function(req, res) {
  res.render('index');
});

app.get('/create',
function(req, res) {
  res.render('index');
});

//Login
app.get('/login',
function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  var username = req.body.username;

  new User({username: username}).fetch().then(function(user) {
    if (!user) {
      console.log('username not found');
      res.redirect('/login');
    } else {
      user.comparePassword(req.body.password, function(match) {
        if (match) {
          console.log('you are signed in');
          util.createSession(req, res, user);
        } else {
          console.log('password does not match');
          res.redirect('/');
        }
      });
    }
  });
});

app.get('/logout', function(req, res) {
  console.log('logging out');
  req.session.destroy(function() {
    res.redirect('/login');
  });
});

//Signup
app.get('/signup',
function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  var username = req.body.username;
  console.log('tried to signup');
  new User({username: username}).fetch().then(function(found) {
    if (found) {
      console.log('username already exists');
      res.redirect('/login');
    } else {
      console.log('signed up successfully');
      //Encrypt password
      bcrypt.hash(req.body.password, null, null, function(err, hash) {
        if (err) {
          console.log('hash error', err);
          return;
        } else {
          //Store to database
          Users.create({
            username: username,
            password: hash,
            sessionId: req.sessionId,
          })
          .then(function() {
            res.status(200).send();
          });
        }
      });
      res.redirect('/');
    }
  });
});

//Links
app.get('/links',
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links',
function(req, res) {
  var uri = req.body.url;
  console.log('debug.........util.isValidUrl', uri);

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
