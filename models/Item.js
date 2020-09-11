const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    measurments: {
        type: String,
        default: 'Not Available'
    },
    inStock: {
        type: Number,
        default: 1
    },
    finishes: {
        type: Array
    },
    isExtra: {
        type: Boolean
    },
    status: {
        type: String,
        default: 'public',
        enum: ['public', 'private']
    },
    image: {
        type: String,
        default: null,
    }
});

module.exports = mongoose.model('Item', ItemSchema);