import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});
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

var blogs = [];

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

app.get('/', async (req, res) => {
    try{
        const result = await db.query("select * from blogs order by id asc");
        blogs = result.rows;

        res.render('index.ejs', {
            bgs: blogs
        });
    }
    catch(err){
        console.log(err);
    }
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
