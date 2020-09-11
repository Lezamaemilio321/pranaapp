const mongoose = require('mongoose');
const User = require('../models/User');

module.exports = {
    checkAuth: function (request) {
        if (request.isAuthenticated()) {
            return true;
        } else {
            return false;
        }
    },
    truncate: function (str, len) {
        if (str.length > len && str.length > 0) {
            let new_str = str + '';
            new_str = str.substr(0, len);
            new_str = str.substr(0, new_str.lastIndexOf(' '));
            new_str = new_str.length > 0 ? new_str : str.substr(0, len);
            return new_str + '...'
        }

        return str;
    },
    checkEqual: function (value1, value2) {

        if (value1 === value2) {
            return true;
        } else {
            return false;
        }
    },
    isIn: function (item, array) {
        if (array.includes(item)) {
            return true;
        } else {
            return false;
        }
    }
}