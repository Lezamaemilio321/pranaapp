const mongoose = require('mongoose');

const FinishSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true
    },
    image: {
        type: String,
        default: null,
    }
});

module.exports = mongoose.model('Finish', FinishSchema);