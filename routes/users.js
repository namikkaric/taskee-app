const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const passport = require('passport');
const { ensureAuth, ensureGuest } = require('../middleware/auth');
const User = require('../models/User');

// @desc    Login page
// @route   GET /users/login
router.get('/login', ensureGuest, (req, res) => {
    res.render('login', {
        layout: 'login'
    })
});

// Register page
router.get('/register', ensureGuest, (req, res) => {
    res.render('register', {
        layout: 'register',
        success: req.session.success,
        errors: req.session.errors
    }); 
    req.session.errors = null;
})

// Register handle
router.post('/register',
    [
        check('name')
            .not()
            .isEmpty()
            .withMessage('Name is required'),
        check('email', 'Email is required')
            .isEmail().withMessage('Invalid Email')
            .custom((value, {req}) => {
                return new Promise((resolve, reject) => {
                    User.findOne({email: req.body.email}, function(err, user) {
                        if(err) {
                            reject(new Error('Server error'))
                        }
                        if(Boolean(user)) {
                            reject(new Error('Email already exists'))
                        }
                        resolve(true)
                    })
                })
            }),
        check('password', 'Password is requried')
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
            .custom((val, { req, loc, path }) => {
                if (val !== req.body.password2) {
                    throw new Error("Passwords don't match");
                } else {
                    return val;
                }
            }),
    ], (req, res) => {
        var name = req.body.name;
        var email = req.body.email;
        var password = req.body.password;
        var errors = validationResult(req).array();
        if (errors.length > 0) {
            req.session.errors = errors;
            req.session.success = false;
            res.redirect('/users/register');
        } else {
            req.session.success = true;
            User.findOne({ email: email})
            .then(user => {
                if(user) {
                    req.session.errors = errors;
                    req.session.success = false;
                    res.redirect('/users/register');
                } else {
                    const newUser = new User({
                        name: name,
                        email: email,
                        password: password
                    });

                    // Hash password
                    bcrypt.genSalt(10, (err, salt) => {
                        bcrypt.hash(newUser.password, salt, (err, hash) => {
                            if(err) throw err;
                            // Set password to hashed
                            newUser.password = hash;
                            // Save the user
                            newUser.save()
                            .then(user => {
                                req.flash('success_msg', 'You are now registered and can log in');
                                res.redirect('/users/login')
                            })
                            .catch(err => console.log(err))
                        })
                    })
                }
            })
        }
    });

// Login Handle
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/users/login',
        failureFlash: true,
    })(req, res, next);
})

// Logout handle
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'You are logged out')
    res.redirect('/users/login')
})


module.exports = router;