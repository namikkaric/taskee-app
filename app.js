const path = require('path');
const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const morgan = require('morgan')
const exphbs = require('express-handlebars')
const methodOverride = require('method-override')
const passport = require('passport')
const flash = require('connect-flash')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const connectDB = require('./config/db')

// Load config
dotenv.config({ path: './config/config.env' })

// Passport config
require('./config/passport')(passport)

connectDB()

const app = express()

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}

// Bodyparser
app.use(express.urlencoded({ extended: false, limit: '50mb', parameterLimit: 50000 }))
app.use(express.json({limit: '50mb'}))

// Method override
app.use(methodOverride(function (req, res) {
    if(req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        let method = req.body._method
        delete req.body._method
        return method
    }
}))

// Handlebars Helpers
const { formatDate, truncate } = require('./helpers/hbs')

// Handlebars
app.engine('.hbs', exphbs({ helpers: {
    formatDate,
    truncate,
}, defaultLayout: 'main', extname: '.hbs'}))
app.set('view engine', '.hbs')

// Sessions
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
}))

// Connect flash
app.use(flash());

// Global vars
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error'); 
    next();
})

// Passport middleware
app.use(passport.initialize())
app.use(passport.session())

// Static folder
app.use(express.static(path.join(__dirname, 'public')))

// Routes
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/lists', require('./routes/lists'));

app.use(function(req,res){
    res.status(404).render('error/404', {
        email: req.user.email, name: req.user.name
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));