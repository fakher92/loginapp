var express = require('express');
var path = require('path');
const fs = require('fs');
const https = require('https');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongo = require('mongodb');
var mongoose = require('mongoose');
const MongoStore = require('connect-mongo')(session);
require('dotenv').config({ path: 'variables.env' });

// mongoose.connect('mongodb://localhost/loginapp');
// var db = mongoose.connection;
//==================================================//
var routes = require('./routes/index');
var users = require('./routes/users');

// Init App
var app = express();

// connect to our database and handle any bad connections
let mongooseOptions = {};

if (
  process.env.DATABASE_USERNAME &&
  process.env.DATABASE_PASSWORD &&
  process.env.DATABASE_USERNAME.trim() !== '' &&
  process.env.DATABASE_PASSWORD.trim() !== ''
) {
  mongooseOptions = {
    auth: {
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD
    }
  };
}

mongoose.Promise = global.Promise;
mongoose
  .connect(
    `mongodb://${process.env.DATABASE_HOST || localhost}:${process.env
      .DATABASE_PORT || 27017}/${process.env.DATABASE_NAME ||
      'express-mongo-boilerplate'}`,
    mongooseOptions
  )
  .catch(error => {
    console.error(`🙅 🚫 🙅 🚫 🙅 🚫 🙅 🚫 → ${error.message}`);
    process.exit(1);
  });

//===================================================//

// View Engine
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({ defaultLayout: 'layout' }));
app.set('view engine', 'handlebars');

// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Set Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'notaverysecuresecret',
    key: process.env.SESSION_KEY || 'notaverysecurekey',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
  })
);

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(
  expressValidator({
    errorFormatter: function(param, msg, value) {
      var namespace = param.split('.'),
        root = namespace.shift(),
        formParam = root;

      while (namespace.length) {
        formParam += '[' + namespace.shift() + ']';
      }
      return {
        param: formParam,
        msg: msg,
        value: value
      };
    }
  })
);

// Connect Flash
app.use(flash());

// Global Vars
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

app.use('/', routes);
app.use('/users', users);

// Set Port
// var port = process.env.PORT || 7777;

// app.listen(port, function() {
//   console.log('Server started on port ' + port);
// });

// define SSL/TLS options
let tlsEnabled = false;
let tlsOptions = {};

if (
  process.env.SSL === 'on' &&
  process.env.SSL_CERT != undefined &&
  process.env.SSL_KEY != undefined &&
  process.env.SSL_CERT != '' &&
  process.env.SSL_KEY != ''
) {
  tlsEnabled = true;

  try {
    tlsOptions = {
      key: fs.readFileSync(process.env.SSL_KEY),
      cert: fs.readFileSync(process.env.SSL_CERT)
    };

    if (process.env.SSL_CHAIN != undefined && process.env.SSL_CHAIN != '') {
      tlsOptions.ca = fs.readFileSync(process.env.SSL_CHAIN);
    }

    if (process.env.SSL_DHPARAM != undefined && process.env.SSL_DHPARAM != '') {
      tlsOptions.dhparam = fs.readFileSync(process.env.SSL_DHPARAM);
    }
  } catch (e) {
    console.error(`\n!!! ${e.message}\n`);
    console.error('=> SSL could not be enabled. Using fallback.\n');
    tlsEnabled = false;
  }
}

// start the app
app.set('port', process.env.PORT || 7777);

if (tlsEnabled === true) {
  const server = https
    .createServer(tlsOptions, app)
    .listen(app.get('port'), () => {
      console.log(`Express running with TLS → PORT ${server.address().port}`);
    });
} else {
  const server = app.listen(app.get('port'), () => {
    console.log(`Express running → PORT ${server.address().port}`);
  });
}
