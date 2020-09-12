// Load config
require('dotenv').config({ path: `${__dirname}/config/config.env` });


// Modules
const express = require('express');
const passport = require('passport');
const exphbs = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')(session);
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser')
const flash = require('connect-flash');


const User = require('./models/User');


const connectDB = require('./config/db');



const app = express();




// Serve favicon
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))



// Load databse
connectDB();


// Flash messages
app.use(flash());



// Passport config
require('./config/passport')(passport);


// Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


// Handlebars Helpers
const { checkAuth, truncate, checkEqual, isIn } = require('./helpers/hbs');


// Handlebars
app.engine('hbs', exphbs({
    helpers: {
        checkAuth,
        truncate,
        checkEqual,
        isIn
    },
    defaultLayout: 'main',
    extname: '.hbs'
}));

app.set('view engine', '.hbs');



// Static folder
app.use(express.static(path.join(__dirname, 'public')));


// Sessions
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
}));



// Passport middleware
app.use(passport.initialize());
app.use(passport.session());




// Set global variables
app.use((req, res, next) => {
    res.locals.request = req || null;
    res.locals.user = req.user || null;

    (async () => {
        try {

            const user = await User.findById(req.user._id).lean();

            res.locals.cartLength = user.cartItems.length;

        } catch {
            res.locals.cartLength = '0';
        }

        next();
    })();

});


// Routes
app.use('/', require('./routes/index'));
app.use('/articulos', require('./routes/articulos'));
app.use('/articulos/admin', require('./routes/admin'));
app.use('/auth', require('./routes/auth'));



//404 handler
app.use(function(req,res){
    res.status(404);
    res.render('error/404');
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} on port ${PORT}`));