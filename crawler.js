const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require("body-parser");

const port = 3000;
const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', "ejs");

app.use('/instagram-project', express.static('public'));
app.use('/instagram-project/insights', express.static('public'));

/* GLOBAL VARIABLES */
let final_users = [];
let username = '';
let password = '';
let completed = false;

app.listen(port, function () {
    console.log('server is listening on port ' + port);
});

app.get('/instagram-project', function (req, res) {
    res.sendFile(__dirname + '/log_in.html');
});

app.get('/instagram-project/insights', function (req, res) {
    res.render('insights', {
        username_ejs: username,
        final_users_ejs: final_users,
        completed_ejs: completed
    });
});

app.post('/instagram-project/insights', async function (req, res) {
    /* get these using body-parser */
    username = req.body.username;
    password = req.body.password;

    scrape();

    res.redirect('/instagram-project/insights');
    
});

async function scrape() {
    /* launch a new page in headless chrome with puppeteer */
    const browser = await puppeteer.launch({
        args: ['--no-sandbox',],
        //headless: false,
    });
    const page = await browser.newPage();
    await page.setViewport({
        width: 1366,
        height: 768
    });

    /* go to site */
    await page.goto("https://instagram.com");
    await page.waitFor(2000);

    /* log in with credentials */
    console.log("attempting log-in...");
    await page.type("input[name='username']", username);
    await page.type("input[name='password']", password);
    await page.click("button[type='submit']");
    await page.waitFor(5000);

    /* security page - click "not now" button */
    try { await page.click("#react-root > section > main > div > div > div > div > button"); } 
    catch (err) { console.log("security page not detected. moving on..."); }
    await page.waitFor(3000);

    /* notifcations page - click "not now" button */
    try { await page.click("button.aOOlW.HoLwm"); } 
    catch (err) { console.log("notifcations page not detected. moving on..."); }
    await page.waitFor(1000);   

    /* log in successful */
    console.log("logged in successfully.");

    /* go into user personal page */
    await page.click("a[href='/" + username + "/']");
    await page.waitFor(3000);

    /* get number of followers & following */
    let follower_count = await getCount(page, '2');
    let following_count = await getCount(page, '3');


    follower_count = Number(follower_count.replace(/,/g, ''));
    following_count = Number(following_count.replace(/,/g, ''));
    console.log("follower count: " + follower_count);
    console.log("following count: " + following_count);

    /* FOLLOWERS - set up */
    console.log('collecting followers...');
    await page.click('a[href="/' + username + '/followers/"]');
    await page.waitFor(3000);

    /* FOLLOWERS - scroll & get usernames */
    await scrollThroughUsers(page, follower_count);
    let followers = await getUsernames(page);
    console.log("collected all followers.");

    /* FOLLOWERS - exit out of scroll box */
    await page.click("svg[aria-label='Close'");
    await page.waitFor(2000);

    /* FOLLOWING - set up */
    console.log('collecting following...');
    await page.click('a[href="/' + username + '/following/"]');
    await page.waitFor(3000);

    /* FOLLOWING - scroll & get usernames */
    await scrollThroughUsers(page, following_count);
    let following = await getUsernames(page);
    console.log("collected all following.");

    /* FOLLOWING - exit out of scroll box */
    await page.click("svg[aria-label='Close'");
    await page.waitFor(2000);

    /* Close Browser */
    await page.waitFor(5000);
    await browser.close();

    /* Find who's not following you back */
    console.log('gathering results...');
    let not_following_back = [];
    for (let user of following) {
        if (!followers.includes(user)) {
            not_following_back.push(user);
        }
    }
    final_users = not_following_back;
    console.log(final_users);
    completed = true;
}

async function scrollThroughUsers(page, count) {
    await page.evaluate(async function (count) {
        await new Promise(function (resolve, reject) {
            /* scrolls through list of users until it hits the max */
            let scroll_box = setInterval(function () {
                let elem = document.querySelector('body > div.RnEpo.Yx5HN > div > div.isgrP');
                elem.scrollTop = elem.scrollHeight;
                /* stops scrolling if maxnum has been reached */
                if (document.querySelectorAll('body > div.RnEpo.Yx5HN > div > div.isgrP > ul > div > li').length >= count) {
                    console.log("scrolling stopped...");
                    clearInterval(scroll_box);
                    resolve();
                }
            }, 300);
        });
    }, count);
}

async function getUsernames(page) {
    return await page.evaluate(async function () {
        let promise1 = new Promise(function (resolve, reject) {
            let user_list = []; // empty list of users
            let full_html_list = document.querySelectorAll('body > div.RnEpo.Yx5HN > div > div.isgrP > ul > div > li');
            for (let i = 0; i < full_html_list.length; i++) {
                user_list.push(full_html_list[i].querySelector('div > div.t2ksc > div.enpQJ > div.d7ByH > a').textContent);
            }
            resolve(user_list);
        });

        let return_value = promise1.then(function (value) {
            return value;
        });

        return Promise.resolve(return_value);
    });
}

async function getCount(page, i){
    return await page.evaluate(async function (i) {
        let following_promise = new Promise(function (resolve, reject) {
            let text = document.querySelector('#react-root > section > main > div > header > section > ul > li:nth-child(' + i + ') > a > span').textContent;
            resolve(text);
        });

        let return_val = following_promise.then(function (value) {
            return value;
        });
        return Promise.resolve(return_val);
    }, i);
}