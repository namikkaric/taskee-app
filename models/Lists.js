const mongoose = require('mongoose')

const ListsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    body: {
        type: Array,
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    createdAt : {
        type: Date,
        default: Date.now,
    }
})

module.exports = mongoose.model('Lists', ListsSchema)