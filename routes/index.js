const express = require('express');
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const passport = require('passport');
const { ensureAuth, ensureGuest } = require('../middleware/auth');
const router = express.Router();
const Lists = require('../models/Lists');
const User = require('../models/User');

// @desc    Home page
// @route   GET /
router.get('/', ensureGuest, (req, res) => {
    res.render('home', {
        layout: 'home'
    });
}) 

// @desc    Dashboard
// @route   GET /dashboard
router.get('/dashboard', ensureAuth, async (req, res) => {
    try {
        res.render('dashboard', { 
            email: req.user.email, name: req.user.name,
        });
    } catch (err) {
        console.error(err)
        res.render('error/500')
    }
})

// @desc    List settings
// @route   GET /dashboard/lists
router.get('/dashboard/lists/', ensureAuth, async (req, res) => {
    try {
        const lists = await Lists.find({ user: req.user.id }).lean()
        res.render('listSettings', { 
            email: req.user.email, name: req.user.name,
            lists 
        });
    } catch (err) {
        console.error(err)
        res.render('error/500')
    }
})

// @desc    Delete list
// @route   DELETE /dashboard/lists/:id
router.delete('/dashboard/lists/:id', ensureAuth, async (req, res) => {
    try {
        await Lists.remove({ _id: req.params.id })
        res.redirect('/dashboard/lists')
    } catch (err) {
        console.error(err)
        return res.render('error/500', {
            email: req.user.email, name: req.user.name
        })
    }
})

// @desc    Account settings
// @route   GET /dashboard/account
router.get('/dashboard/account/', ensureAuth, async (req, res) => {
    try {
        const user = await User.findOne({ user: req.user.email }).lean()
        res.render('accountSettings', { 
            email: req.user.email, name: req.user.name,
            user,
            success: req.session.success,
            errors: req.session.errors
        });
        req.session.errors = null;
    } catch (err) {
        console.error(err)
        res.render('error/500')
    }
})

// @desc    Handle password change
// @route   PUT /dashboard/account/password
router.put('/dashboard/account/password', 
[
    check('password', 'Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
        .custom((val, { req, loc, path }) => {
            if (val !== req.body.password2) {
                throw new Error("Passwords don't match");
            } else {
                return val;
            }
        }),
    check('oldPassword', 'Password is required')
        .custom((val, { req, loc, path }) => {
            return new Promise((resolve, reject) => {
                val = req.body.oldPassword;
                bcrypt.compare(val, req.user.password, (err, isMatch) => {
                    if(err) console.error(err)
                    if(!isMatch) {
                        reject(new Error("Current password you entered isn't correct. Try entering again."));
                    }
                    else if(val === req.body.password && (val !== null && req.body.password !== null)) {
                        reject(new Error("New password cannot be the same as your old password. Try choosing another one."));
                    }
                    else {
                        resolve(true)
                    }
                })
            })
        }),
],  async (req, res) => {

    var password = req.body.password;
    var errors = validationResult(req).array();
    if (errors.length > 0) {
        req.session.errors = errors;
        req.session.success = false;
        res.redirect('/dashboard/account');
    } else {
        req.session.success = true;

    User.findOne({email: req.user.email})
    .then((u) => {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(req.body.password, salt, (err, hash) => {
                if(err) throw err;
                // Set password to hashed
                u.password = hash;
                // Save the user
                u.save()
                .then(user => {
                    req.flash('success_msg', 'Your password has been changed successfully!');
                    res.redirect('/dashboard/account')
                })
                .catch(err => console.log(err))
            })
    })
})}
})

// @desc    Handle email change
// @route   PUT /dashboard/account/email
router.put('/dashboard/account/email', 
[
    check('oldPassword', 'Password is required')
        .custom((val, { req, loc, path }) => {
            return new Promise((resolve, reject) => {
                val = req.body.oldPassword;
                bcrypt.compare(val, req.user.password, (err, isMatch) => {
                    if(err) console.error(err)
                    if(!isMatch) {
                        reject(new Error("Current password you entered isn't correct. Try entering again."));
                    }
                    else {
                        resolve(true)
                    }
                })
            })
        }),
    check('email', 'Email is required')
    .isEmail().withMessage('Invalid Email')
    .custom((value, {req}) => {
        return new Promise((resolve, reject) => {
            User.findOne({email: req.body.email}, function(err, user) {
                if(err) {
                    reject(new Error('Server error'))
                }
                if(req.user.email === req.body.email) {
                    reject(new Error('New email cannot be the same as your old email. Try choosing another one.'))
                }
                else if(value !== req.body.email2) {
                    reject(new Error("Emails don't match"))
                }
                else if(Boolean(user)) {
                    reject(new Error('Email already exists'))
                }
                else {
                    resolve(true)
                }
            })
        })
    }),
],  async (req, res) => {

    var password = req.body.password;
    var errors = validationResult(req).array();
    if (errors.length > 0) {
        req.session.errors = errors;
        req.session.success = false;
        res.redirect('/dashboard/account');
    } else {
        req.session.success = true;

    User.findOne({email: req.user.email})
    .then((u) => {

                u.email = req.body.email;
                u.save()
                .then(user => {
                    req.flash('success_msg', 'Your email has been changed successfully!');
                    res.redirect('/dashboard/account')
                })
                .catch(err => console.log(err))
})}
})
module.exports = router;