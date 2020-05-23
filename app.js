/* MODULES */
const express = require('express');
const bodyParser = require("body-parser");
const crawler = require(__dirname + "/thecrawler.js");

const port = 3000;
const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', "ejs");

/* serve up html/ejs with CSS styles */
app.use('/instagram-project', express.static('public'));
app.use('/instagram-project/insights', express.static('public'));

/* GLOBAL VARIABLES */
let username = "";

app.listen(port, function () {
    console.log('server is listening on port ' + port);
});

app.get('/instagram-project', function (req, res) {
    res.sendFile(__dirname + '/log_in.html');
});

app.get('/instagram-project/insights', function (req, res) {
    const final_users = crawler.get_final_users();
    console.log(final_users);

    res.render('insights', {
        username_ejs: username,
        final_users_ejs: final_users
    });
});

app.post('/instagram-project/insights', function (req, res) {
    /* get these using body-parser */
    username = req.body.username;
    const password = req.body.password;

    crawler.scrape(username, password);

    res.redirect('/instagram-project/insights');

});
