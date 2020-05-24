const puppeteer = require("puppeteer");

/* Global Variables */
const final_users = [];
let page;
let browser;
let follower_count;
let following_count;
let followers;
let following;

/*** MAIN DRIVER ***/
exports.scrape = async function (username, password) {
    await launch();
    await log_in(username, password);
    await personal_page(username);
    await get_data();
    await get_followers(username);
    await get_following(username);
    await final();
}

/*** GET METHODS ***/
exports.get_final_users = function(){
    return final_users;
    // return [
    //     'maxpreps', 'catholicsvscorona',
    //     'barackobama', 'cbssports',
    //     'cnn', 'netflixisajoke',
    //     'barstoolsports', 'brianimanuel',
    //     'techinsider', 'detroitlionsnfl',
    //     'zoelizabethc.art', 'tank.sinatra',
    //     'twerk_for_sloths', 'whitepeoplehumor',
    //     'gracekayser', 'theonion',
    //     'claudia.hayward', 'techcrunch',
    //     'dankquillius', 'yourdadsatonmyface',
    //     'hoereacts', 'grapejuiceboys',
    //     '5thyear', 'marisackello',
    //     'shanerankin_', 'ndbarstool',
    //     'keahyukchang'
    // ];
}

exports.get_status = function(){
    /* statuses: completed, log-in failed, gathering */
}

/*** FUNCTIONS ***/

/* launch a new page in headless chrome with puppeteer */
async function launch() {
    browser = await puppeteer.launch({
        args: ["--no-sandbox", ],
        headless: false,
    });

    page = await browser.newPage();
    await page.setViewport({
        width: 1366,
        height: 768
    });
}

/* log in to instagram account */
async function log_in(username, password) {
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
    try {
        await page.click("#react-root > section > main > div > div > div > div > button");
    } catch (err) {
        console.log("security page not detected. moving on...");
    }
    await page.waitFor(1500);

    /* notifcations page - click "not now" button */
    try {
        await page.click("button.aOOlW.HoLwm");
    } catch (err) {
        console.log("notifcations page not detected. moving on...");
    }
    await page.waitFor(1500);

    /* log in successful */
    console.log("logged in successfully.");
}

/* go to user's personal page */
async function personal_page(username) {
    await page.click("a[href='/" + username + "/']");
    await page.waitFor(3000);
}

/* get meta data for user */
async function get_data(){
    /* get number of followers & following */
    follower_count = await getCount('2');
    following_count = await getCount('3');

    follower_count = Number(follower_count.replace(/,/g, ''));
    following_count = Number(following_count.replace(/,/g, ''));
    console.log("follower count: " + follower_count);
    console.log("following count: " + following_count);
}

/* get followers */
async function get_followers(username){
    /* set up */
    console.log('collecting followers...');
    await page.click('a[href="/' + username + '/followers/"]');
    await page.waitFor(3000);

    /* scroll & get usernames */
    await scrollThroughUsers(follower_count);
    followers = await getUsernames();
    console.log("collected " + followers.length + " followers.");

    /* exit out of scroll box */
    await page.click("svg[aria-label='Close'");
    await page.waitFor(2000);
}

/* get following */
async function get_following(username){
    /* set up */
    console.log('collecting following...');
    await page.click('a[href="/' + username + '/following/"]');
    await page.waitFor(3000);

    /* scroll & get usernames */
    await scrollThroughUsers(following_count);
    following = await getUsernames();
    console.log("collected " + following.length + " following.");

    /* exit out of scroll box */
    await page.click("svg[aria-label='Close'");
    await page.waitFor(2000);
}

/* get final results */
async function final(){
    /* Close Browser */
    await browser.close();

    /* Find who's not following you back */
    console.log('gathering results...');
    for (let user of following) {
        if (!followers.includes(user)) {
            final_users.push(user);
        }
    }
    console.log("Finished collecting final users: " + final_users);
}

/*** UTILITY FUNCTIONS ***/

/* scrolls through users */
async function scrollThroughUsers(count) {
    await page.evaluate(async function (count) {
        await new Promise(function (resolve, reject) {
            let start_time = new Date();
            /* scrolls through list of users until it hits the max */
            let scroll_box = setInterval(function () {
                let elapsed_time = new Date() - start_time;
                let elem = document.querySelector('body > div.RnEpo.Yx5HN > div > div.isgrP');
                elem.scrollTop = elem.scrollHeight;

                /* stops scrolling if 3 minutes is passed */
                if (elapsed_time > (3*60*1000)){
                    console.log("scrolling stopped after " + elapsed_time + " milliseconds");
                    clearInterval(scroll_box);
                    resolve();
                }

                /* stops scrolling if maxnum has been reached */
                if (document.querySelectorAll('body > div.RnEpo.Yx5HN > div > div.isgrP > ul > div > li').length >= count) {
                    console.log("scrolling completed.");
                    clearInterval(scroll_box);
                    resolve();
                }
            }, 500);
        });
    }, count);
}

/* gets list of users */
async function getUsernames() {
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

/* gets following & follower count */
async function getCount(i) {
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