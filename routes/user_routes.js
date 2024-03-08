const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const user_model = require('../models/user_model');
const config = require('../config');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

let db = new sqlite3.Database('./db/my_database.db', sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    return console.error(err.message);
  }
});

//test route
// router.get('/test', (req ,res) => {
//   let user1 = new user_model("me", "you", "a@b.c", "#Ppw123");
//   let result = user1.verifyPassword();
//   console.log();
//   res.send({
//     message: user1.password   
//   });
// });

/* 
------ User routes -------
*/

/* Get User By Email
Inputs:
  Body: Email
  Header: JWT Token
*/
router.get('/getuser', (req, res) => {
  const email = req.body.Email;
  const token = req.headers.token;

  if (!token || !email){
    res.status(400).send({
      message: "Email and token required to get user details... Log in to acquire token."
    });
  } else {
    let decoded = jwt.decode(token);

    if (decoded != email) {
      res.status(400).send("Invalid token...");
    } else {
      let selectQuery = `SELECT Email, FirstName, LastName FROM Users WHERE Email = '${email}' LIMIT 1`
      db.all(selectQuery, (err, rows) => {
        if (err) {
          res.status(500).send({
            message: `Getting error: ${err.message}`
          });
        } else {
          res.status(200).send({
            message: "OK",
            body: rows
          });
        }
      });
    }
  }
});

/* Get All Users From DB
Inputs:
  none
*/
router.get('/users', (req, res) => {
  let sql = `SELECT FirstName, LastName FROM Users;`;
  db.all(sql, (err, rows) => {
    res.status(200);
    res.json({
      message: "success",
      data: rows
    }).send();
  });

});

/* Add User To DB
Inputs:
  Body: First Name, Last Name, Email, Password
*/
router.post('/adduser', (req, res) => {

  //get user details to add from message body
  let userToAdd = new user_model(req.body.FirstName, req.body.LastName, req.body.Email, req.body.Password);

  //db query
  let selectQuery = `SELECT * FROM Users WHERE Email = '${userToAdd.email}';`;

  //execute query
  db.all(selectQuery, (err, rows) => {

    //check if user with given email already exists
    let count = rows.length;

    //ensuring validity
    if (userToAdd.verifyPassword()) {
      if (count === 0) {

        //insert user into db
        let insertQuery = `INSERT INTO Users (Email, FirstName, LastName, Password) VALUES 
        ( '${userToAdd.email}', '${userToAdd.firstname}', '${userToAdd.lastname}', '${userToAdd.passwordHash}');`;
        db.exec(insertQuery, (err) => {

          //return error message if fail
          if (err) {
            res.status(500).send({
              message: "Getting error: " + err.message
            });
          } else { //Otherwise inform user of success
            res.status(201).send({
              message: `Inserted user ${userToAdd.firstname} ${userToAdd.lastname} into db!`
            });
          }
        });
      //Messages if details to be entered are not valid
      } else {
        res.status(400).send({
          message: `Email ${userToAdd.email} already exists in database.`
        });
      }
    } else {
      res.status(400).send({
        message: "Password must be 6-16 characters long and must contain at least one upper case character, one lower case character, one special character and one number."
      });
    }
  });
  
});

/* Edit User In DB
Inputs:
  Body: First Name, Last Name, Email, Password
*/
router.put('/edituser', (req, res) => {
  const email = req.body.Email;
  const token = req.headers.token;

  if (!token || !email){
    res.status(400).send({
      message: "Email and token required to edit user details... Log in to acquire token."
    });
  } else {
    let decoded = jwt.decode(token);
    if (decoded != email) {
      res.status(400).send("Invalid token...");
    } 
    else {
      db.all(`SELECT * FROM Users WHERE Email = '${email}';`, (err, rows) => {
        if (err) {
          res.status(500).send({
            message: "Getting error " + err.message
          });
        }else if (rows.length === 0){
          res.status(400).send({
            message: `No user with email ${email} exists in db.`
          });
        } else {
          //Set details to change
          const hash = crypto.createHash('sha256', config.crypto_secret);
          hash.update(req.body.Password);
          const digest = hash.digest('hex');
          let userToEdit = new user_model(req.body.FirstName || rows[0].FirstName,
                                          req.body.LastName || rows[0].LastName,
                                          req.body.Email,
                                          digest || rows[0].password);
          db.exec(`UPDATE Users SET FirstName = '${userToEdit.firstname}', 
              LastName = '${userToEdit.lastname}', Password = '${userToEdit.password}' 
              WHERE Email = '${userToEdit.email}';`, (err2) => {
            if (err2) {
              res.status(500).send({
                message: "Getting error " + err2.message
              });
            } else {
              res.status(200).send({
                message: `Updated user.`
              });
            }
          });
        }
      });

    }
  }
});

/* Delete User From DB
Inputs:
  Body: Email
  Headers: JWT Token
*/
router.delete('/deleteuser', (req, res) => {
  const email = req.body.Email;
  const token = req.headers.token;

  if (!token || !email){
    res.status(400).send({
      message: "Email and token required to delete user... Log in to acquire token."
    });
  } else {
    let decoded = jwt.decode(token);
    
    if (decoded != email) {
      res.status(400).send({
        message: "Invalid token."
      });
    } else {
      db.exec(`DELETE FROM Users WHERE Email = '${email}';`, (err) => {
        if (err) {
          res.status(500).send({
            message: err.message
          });
        } else {
          res.status(200).send({
            message: "Deleted user."
          });
        }
      });
    }
  }
});

/* Log In
Inputs:
  Body: Email, Password
*/
router.post('/login', (req, res) => {
  const email = req.body.Email;
  const password = req.body.Password;

  db.all(`SELECT Password FROM Users WHERE Email = '${email}'`, (err, rows) => {
    const hash = crypto.createHash('sha256', config.crypto_secret);
    hash.update(password);
    const digest = hash.digest('hex');

    if (digest === rows[0].Password) {
      let token = jwt.sign(email, config.jwt_secret_key);
      res.status(200).send({
        message: "Here is your login token: " + token
      });
    } else {
      res.status(400).send({
        message: "Password incorrect."
      });
    }
  });

});

module.exports = router;