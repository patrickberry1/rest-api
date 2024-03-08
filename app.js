const express = require('express');
const path = require('node:path');
const routes = require('./routes/user_routes');
const sqlite3 = require('sqlite3').verbose();
const config = require('./config');

const app = express();
app.use(express.json());
app.use(express.urlencoded());
app.use(routes);

const PORT = config.PORT;
app.listen(PORT, () => {
   console.log("app Listening on PORT:", PORT);
});

//db setup
let db = new sqlite3.Database('./db/my_database.db', sqlite3.OPEN_READWRITE, (err) => {
   if (err) {
     return console.error(err.message);
   }
   console.log('Connected SQlite database file.');
   let sql = `CREATE TABLE IF NOT EXISTS Users (
               Email varchar(255),
               FirstName varchar(255),
               LastName varchar(255),
               Password varchar(255)
            );`;
   db.exec(sql);
   console.log('Users table exists.');
});


app.get("/status", (req, res) => {
   res.status(200); 
   res.send( {
      status: 'Running...'
   });
});

app.get('/', (req, res) => {
   res.status(200);
   res.send({
      message: 'Home. All Good :)'
   });
});