const express = require('express');
const { check, validationResult } = require('express-validator');
const { ensureAuth } = require('../middleware/auth');
const router = express.Router();
const Lists = require('../models/Lists');

// @desc    Show add page
// @route   GET /lists/add
router.get('/add', ensureAuth, (req, res) => {
    res.render('lists/add', {
        email: req.user.email, name: req.user.name,
        success: req.session.success,
        errors: req.session.errors
    })
    req.session.errors = null;
})

// @desc    Process add form
// @route   POST /lists/add
router.post('/',
[
    check('title', 'Title is required')
    .custom((val, { req }) => {
        return new Promise((resolve, reject) => {
            val = req.body.title;
            if(val.length < 1) {
                reject();
            }
            else {
                resolve(true)
            }
        })
    }),
    check('body', 'List cannot be empty')
    .custom((value, { req }) => {
        return new Promise((resolve, reject) => {
            value = req.body.body;
            if(value == undefined) {
                reject();
            }
            else {
                resolve(true)
            }
        })
    }),
],  ensureAuth, async (req, res) => {
    var errors = validationResult(req).array();

    if (errors.length > 0) {
        req.session.errors = errors;
        req.session.success = false;
        res.redirect('/lists/add');
    } else {
        req.session.success = true;
        req.body.user = req.user.id
        await Lists.create(req.body)
        res.redirect('/lists')
    }
})

// @desc    Show all lists
// @route   GET /lists/
router.get('/', ensureAuth, async (req, res) => {
    try {
        const lists = await Lists.find({ user: req.user.id })
            .populate('user')
            .sort({ createdAt: 'asc' })
            .lean()
        res.render('lists/index', {
            email: req.user.email, name: req.user.name,
            lists,
        })
    } catch (err) {
        console.error(err)
        res.render('error/500', {
            email: req.user.email, name: req.user.name
        })
    }
})

// @desc    Show edit page
// @route   GET /lists/edit/:id
router.get('/edit/:id', ensureAuth, async (req, res) => {
    const list = await Lists.findOne({
        _id: req.params.id
    }).lean()

    if(!list) {
        return res.render('error/404', {
            email: req.user.email, name: req.user.name
        })
    }

    if(list.user != req.user.id) {
        res.redirect('/lists')
    } else {
        res.render('lists/edit', {
            list,
            email: req.user.email, name: req.user.name,
            success: req.session.success,
            errors: req.session.errors
        })
        req.session.errors = null;
    }
})

// @desc    Update list
// @route   PUT /lists/:id
router.put('/:id',
[
    check('title', 'Title is required')
    .custom((val, { req }) => {
        return new Promise((resolve, reject) => {
            val = req.body.title;
            if(val.length < 1) {
                reject();
            }
            else {
                resolve(true)
            }
        })
    }),
    check('body', 'List cannot be empty')
    .custom((value, { req }) => {
        return new Promise((resolve, reject) => {
            value = req.body.body;
            if(value == undefined) {
                reject();
            }
            else {
                resolve(true)
            }
        })
    }),
],  ensureAuth, async (req, res) => {

    var errors = validationResult(req).array();

    if (errors.length > 0) {
        req.session.errors = errors;
        req.session.success = false;
        res.redirect('/lists/edit/' + req.params.id);
    } else {

        let list = await Lists.findById(req.params.id).lean()

        if(!list) {
            return res.render('error/404', {
                email: req.user.email, name: req.user.name
            })
        }

        if(list.user != req.user.id) {
            res.redirect('/lists')
        } else {
            list = await Lists.findOneAndUpdate({ _id: req.params.id }, req.body, {
                new: true,
                runValidators: true
            })
            res.redirect('/lists')
        }
    }
})

// @desc    Delete list
// @route   DELETE /lists/:id
router.delete('/:id', ensureAuth, async (req, res) => {
    try {
        await Lists.remove({ _id: req.params.id })
        res.redirect('/lists')
    } catch (err) {
        console.error(err)
        return res.render('error/500', {
            email: req.user.email, name: req.user.name
        })
    }
})


module.exports = router;