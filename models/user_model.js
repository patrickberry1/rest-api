const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const config = require('../config');


let db = new sqlite3.Database('./db/my_database.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        return console.error(err.message);
    }
});

const user = function(firstName, lastName, email, password){
    this.firstname = firstName;
    this.lastname = lastName;
    this.email = email;
    this.password = password;

    this.verifyPassword = function() {
        var regularExpression = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/;
        if (regularExpression.test(this.password)) {
            return true;
        } else {
            return false;
        }
    }

    this.hashPassword = function() {
        const pwToHash = this.password;
        const hash = crypto.createHash('sha256', config.crypto_secret);
        hash.update(pwToHash);
        const digest = hash.digest('hex');
        return digest;
    }

    this.passwordHash = this.hashPassword();
};

module.exports = user;