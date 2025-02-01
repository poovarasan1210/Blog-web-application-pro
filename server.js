import express from 'express';
import bodyParser from 'body-parser';
import env from 'dotenv';
import pkg from 'pg';
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
const { Client } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;
const saltRounds = 10;
env.config();

app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
    })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(passport.initialize());
app.use(passport.session());

const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true,
    }
});
// const db = new Client({
//     user: process.env.DB_USER,
//     host: process.env.DB_HOST,
//     database: process.env.DB_NAME,
//     password: process.env.DB_PASSWORD,
//     port: process.env.DB_PORT,
//     ssl: false  // Explicitly disable SSL
// });
db.connect();

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS blogs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author VARCHAR(255) NOT NULL,
        date VARCHAR(50) NOT NULL
    )
`;

db.query(createTableQuery)
    .then(() => console.log("Table 'blogs' is ready"))
    .catch(err => console.error("Error creating table", err));

const createUserTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(50) NOT NULL,
        password VARCHAR(200) NOT NULL
    )
`;

db.query(createUserTableQuery)
    .then(() => console.log("Table 'users' is ready"))
    .catch(err => console.error("Error creating table", err));

var blogs = [];

app.get("/", (req, res) => {
    res.redirect("/home");
});

app.get('/home', async (req, res) => {
    try{
        if (req.isAuthenticated()) {
            const result = await db.query("select * from blogs order by id asc");
            blogs = result.rows;

            res.render('index.ejs', {
                bgs: blogs
            });
        } else {
            res.redirect("/login");
        }
    }
    catch(err){
        console.log(err);
    }
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/logout", (req, res) => {
    req.logout(function (err) {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
});

app.post('/create', async (req, res) => {
    try {
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace("T", " ");
        await db.query("INSERT INTO blogs (title, content, author, date) VALUES ($1, $2, $3, $4)", [req.body.title, req.body.content, req.body.author, formattedDate]);
        res.redirect("/");
    } catch (err) {
        console.log(err);
    }
});

app.post('/submit', async (req, res) => {
    if(req.body.mode == 'Delete'){
        try {
            await db.query("DELETE FROM blogs WHERE id = $1", [req.body.id]);
            res.redirect("/");
        } catch (err) {
            console.log(err);
        }
    }
    else if(req.body.mode == 'Submit'){
        console.log(req.body);
        try {
            await db.query("UPDATE blogs SET title = ($1) WHERE id = $2", [req.body.title, req.body.id]);
            await db.query("UPDATE blogs SET content = ($1) WHERE id = $2", [req.body.content, req.body.id]);
            await db.query("UPDATE blogs SET author = ($1) WHERE id = $2", [req.body.author, req.body.id]);
            const currentDate = new Date();
            const formattedDate = currentDate.toISOString().slice(0, 19).replace("T", " ");
            await db.query("UPDATE blogs SET date = ($1) WHERE id = $2", [formattedDate, req.body.id]);
            res.redirect("/");
        } catch (err) {
            console.log(err);
        }
    }
    else{
        res.render('createPost.ejs');
    }
});

app.post('/edit', (req, res) => {
    res.render('editPost.ejs', { title: req.body.title, content: req.body.content, author: req.body.author, id: req.body.id });
});

app.post(
    "/login",
    passport.authenticate("local", {
      successRedirect: "/home",
      failureRedirect: "/register",
      failureFlash: true,
    })
);

app.get("/register", (req, res) => {
    res.render("register.ejs");
});
  
app.post("/register", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;
  
    try {
      const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
  
      if (checkResult.rows.length > 0) {
        req.redirect("/login");
      } else {
        bcrypt.hash(password, saltRounds, async (err, hash) => {
          if (err) {
            console.error("Error hashing password:", err);
          } else {
            const result = await db.query(
              "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
              [email, hash]
            );
            const user = result.rows[0];
            req.login(user, (err) => {
              console.log("success");
              res.redirect("/home");
            });
          }
        });
      }
    } catch (err) {
      console.log(err);
    }
});
  
passport.use(
    new Strategy(async function verify(username, password, cb) {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
          username,
        ]);
        if (result.rows.length > 0) {
          const user = result.rows[0];
          const storedHashedPassword = user.password;
          bcrypt.compare(password, storedHashedPassword, (err, valid) => {
            if (err) {
              //Error with password check
              console.error("Error comparing passwords:", err);
              return cb(err);
            } else {
              if (valid) {
                //Passed password check
                return cb(null, user);
              } else {
                //Did not pass password check
                return cb(null, false);
              }
            }
          });
        } else {
          return cb("User not found");
        }
      } catch (err) {
        console.log(err);
      }
    })
);
  
passport.serializeUser((user, cb) => {
    cb(null, user);
});
passport.deserializeUser((user, cb) => {
    cb(null, user);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
