import express from 'express';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.post('/create', (req, res) => {
    res.render('createPost.ejs');
});

var title = [];
var content = [];
app.post('/submit', (req, res) => {
    if(req.body.mode == 'Delete' && req.body.index != null){
        title.splice(req.body.index, 1);
        content.splice(req.body.index, 1);
    }
    else if(req.body.mode == 'Submit' && req.body.index != null){
        title[req.body.index] = req.body.title;
        content[req.body.index] = req.body.content;
    }
    else{
        title.push(req.body.title);
        content.push(req.body.content);
    }
    res.render('index.ejs', { title: title, content: content });
});

app.post('/edit', (req, res) => {
    res.render('editPost.ejs', { title: title, content: content, index: req.body.index });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${port}`);
});