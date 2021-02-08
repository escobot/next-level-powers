'use strict';

require('dotenv').config()
const express = require('express');
const app = express();
const request = require('request');
const cheerio = require('cheerio');
const CronJob = require('cron').CronJob;
const Twit = require('twit');

const config = {
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
}

let T = new Twit(config);

let subreddits = ['GodTierSuperpowers'];
let redditPosts = [];
let postedTweets = [];

app.use(express.static('public'));

let listener = app.listen(process.env.PORT, function () {
    console.log('NextLevelPowers is running on port ' + listener.address().port);

    // fetch reddit posts every 15 minutes
    (new CronJob('*/5 * * * *', function () {
        request('https://old.reddit.com/r/' + subreddits[0], function (err, res, body) {
            if (err) {
                console.log('Error at fetching reddit: ', err);
            } else {
                let $ = cheerio.load(body);
                $('p.title a.title').each(function () {
                    const post = $(this)[0].children[0];
                    // make sure the post is not on the "to tweet" list and has not been tweeted.
                    if (!redditPosts.some(e => e.status === post.data) && !postedTweets.some(e => e.substr(e.length - 8) === post.data.substr(post.data.length - 8))) {
                        console.log('Fetched reddit post: ' + post.data);
                        let url = post.parent.attribs['href'];
                        redditPosts.push({ 'status': post.data });
                        postedTweets.push(post.data.substr(post.data.length - 8));
                    }
                });
            }
        });
    })).start();

    // tweet every hour
    (new CronJob('*/10 * * * *', function () {
        if (redditPosts.length > 0) {
            const redditPost = redditPosts.pop();
            let tweet = redditPost.status + ' #NextLevel #GodTierSuperpowers';
            
            // make sure tweet is less than 280 characters
            if (tweet.length > 280) {
                const toRemove = tweet.length - 280 + 5;
                tweet = redditPost.status.substring(0,redditPost.status.length-toRemove) + '...';
            }

            T.post('statuses/update', { status: tweet }, function (err, data, response) {
                if (err) {
                    console.log('Error at statuses/update', err);
                }
                else {
                    console.log('Tweeted', `https://twitter.com/${data.user.screen_name}/status/${data.id_str}`);
                }
            });
        } else {
            console.log('Reddit posts not fetched yet.');         
        }
    })).start();
});