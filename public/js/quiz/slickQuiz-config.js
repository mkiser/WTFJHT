// Setup your quiz text and questions here

// NOTE: pay attention to commas, IE struggles with those bad boys

var quizJSON = {
    "info": {
        "name":    "",
        "main":    "<p>Following the news? Think you know WTF happened this week? Take the WTF News quiz to see what you know – or don't know.</p>",
        "results": "<p>How'd that go? Feel good about your results? Think you should have done better?</p>",
        "level1":  "",
        "level2":  "",
        "level3":  "",
        "level4":  "",
        "level5":  "" // no comma here
    },
    "questions": [
        { // Question 1 - Multiple Choice, Single True Answer
            "q": "Who did Trump accuse of being un-American and treasonous?",
            "a": [
                {"option": "Adam Schiff",      "correct": false},
                {"option": "Rob Porter",     "correct": false},
                {"option": "Democrats",      "correct": true},
                {"option": "Nancy Pelosi",     "correct": false} // no comma here
            ],
            "correct": "<p><strong>Those damn Dems.</strong> Trump accused Democrats of being un-American and treasonous because they didn't clap for him during his State of the Union address. \"Can we call that treason?\" Trump asked during a speech at a factory in Ohio. \"Why not? I mean, they certainly didn't seem to love our country very much.\" He added: \"Your paychecks are going way up\" and \"your taxes are going way down.\"  (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/05/day-382/#1-trump-accused-democrats-of-being-u' target='_blank'>Day 382</a> / <a href='https://www.nytimes.com/2018/02/05/us/politics/trump-accuses-democrats-treason-market-rout.html' target='_blank'>New York Times</a>)</p>",
            "incorrect": "<p><strong>Damn the Dems.</strong> Trump accused Democrats of being un-American and treasonous because they didn't clap for him during his State of the Union address. \"Can we call that treason?\" Trump asked during a speech at a factory in Ohio. \"Why not? I mean, they certainly didn't seem to love our country very much.\" He added: \"Your paychecks are going way up\" and \"your taxes are going way down.\"  (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/05/day-382/#1-trump-accused-democrats-of-being-u' target='_blank'>Day 382</a> / <a href='https://www.nytimes.com/2018/02/05/us/politics/trump-accuses-democrats-treason-market-rout.html' target='_blank'>New York Times</a>)</p>" // no comma here
        },
        { // Question 2 - Multiple Choice, Multiple True Answers, Select Any
            "q": "Who said there is \"clear evidence that the Russians meddled\" in the 2016 presidential election?",
            "a": [
                {"option": "James Comey", "correct": false},
                {"option": "Robert Mueller",   "correct": false},
                {"option": "Joe Biden",  "correct": false},
                {"option": "George W. Bush", "correct": true} // no comma here
            ],
            "correct": "<p><strong>W stands for you won.</strong> George W. Bush: \"Clear evidence that the Russians meddled\" in the 2016 presidential election. Intelligence agencies have concluded that Russia meddled in the presidential election, but Trump has consistently disputed allegations that members of his campaign team in any way \"colluded\" with Moscow.  (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/08/day-385/#george-w-bush-clear-evidence-that-th' target='_blank'>Day 385</a> / <a href='https://www.usatoday.com/story/news/2018/02/08/george-w-bush-clear-evidence-russians-meddled-election/318620002/' target='_blank'>USA Today</a>)</p>",
            "incorrect": "<p><strong>Sorry, but you're beating around the Bush.</strong> George W. Bush: \"Clear evidence that the Russians meddled\" in the 2016 presidential election. Intelligence agencies have concluded that Russia meddled in the presidential election, but Trump has consistently disputed allegations that members of his campaign team in any way \"colluded\" with Moscow.  (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/08/day-385/#george-w-bush-clear-evidence-that-th' target='_blank'>Day 385</a> / <a href='https://www.usatoday.com/story/news/2018/02/08/george-w-bush-clear-evidence-russians-meddled-election/318620002/' target='_blank'>USA Today</a>)</p>" // no comma here
        },
        { // Question 3 - Multiple Choice, Multiple True Answers, Select All
            "q": "What percent of Americans believe Russia will try to influence this year's midterm elections?",
            "a": [
                {"option": "54%",           "correct": false},
                {"option": "55%",                  "correct": false},
                {"option": "56%",  "correct": false},
                {"option": "57%",          "correct": true} // no comma here
            ],
            "correct": "<p><strong>100% correct.</strong> 57% of Americans believe Russia will try to influence this year's midterm elections and 55% believe the federal government isn't doing enough to prevent it.  (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/08/day-385/#poll-57-of-americans-believe-russia' target='_blank'>Day 358</a> / <a href='https://www.nbcnews.com/politics/politics-news/poll-most-americans-think-russia-will-interfere-again-2018-elections-n845076' target='_blank'>NBC News</a>)</p>",
            "incorrect": "<p><strong>0% correct</strong> 57% of Americans believe Russia will try to influence this year's midterm elections and 55% believe the federal government isn't doing enough to prevent it.  (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/08/day-385/#poll-57-of-americans-believe-russia' target='_blank'>Day 358</a> / <a href='https://www.nbcnews.com/politics/politics-news/poll-most-americans-think-russia-will-interfere-again-2018-elections-n845076' target='_blank'>NBC News</a>)</p>" // no comma here
        },
        { // Question 4
            "q": "Paul Ryan celebrated a secretary's weekly wag increase on Twitter as a sign of the Republican tax plan's success. How much did her weekly paycheck go up?",
            "a": [
                {"option": "$0.75",     "correct": false},
                {"option": "$1.50",    "correct": true},
                {"option": "$4.50",      "correct": false},
                {"option": "$17.50",   "correct": false} // no comma here
            ],
            "correct": "<p><strong>Cha-ching!</strong> Paul Ryan celebrated a secretary's $1.50 weekly increase on Twitter as a sign of the Republican tax plan's success. He deleted the tweet after lawmakers and social media users criticized him. \"A secretary at a public high school in Lancaster, Pennsylvania, said she was pleasantly surprised her pay went up $1.50 a week … she said [that] will more than cover her Costco membership for the year,\" the tweet read. (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/05/day-382/#6-paul-ryan-celebrated-a-secretarys' target='_blank'>Day 382</a> / <a href='https://www.nytimes.com/2018/02/03/us/politics/paul-ryan-tweet.html' target='_blank'>New York Times</a>)</p>",
            "incorrect": "<p><strong>Fake news.</strong> Paul Ryan celebrated a secretary's $1.50 weekly increase on Twitter as a sign of the Republican tax plan's success. He deleted the tweet after lawmakers and social media users criticized him. \"A secretary at a public high school in Lancaster, Pennsylvania, said she was pleasantly surprised her pay went up $1.50 a week … she said [that] will more than cover her Costco membership for the year,\" the tweet read. (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/05/day-382/#6-paul-ryan-celebrated-a-secretarys' target='_blank'>Day 382</a> / <a href='https://www.nytimes.com/2018/02/03/us/politics/paul-ryan-tweet.html' target='_blank'>New York Times</a>)</p>" // no comma here
        },
        { // Question 5
            "q": "Who said the White House is in \"total cooperation mode?\"",
            "a": [
                {"option": "Steve Bannon",    "correct": false},
                {"option": "Sarah Huckabee Sanders",     "correct": false},
                {"option": "Ty Cobb",      "correct": true},
                {"option": "Jeff Sessions",   "correct": false} // no comma here
            ],
            "correct": "<p><strong>Yep.</strong> Trump's lawyers want him to refuse an interview with Robert Mueller, because they're concerned that he could be charged with lying to investigators. Trump, however, has said that he is \"looking forward\" to speaking with Mueller as part of the investigation into possible collusion between his campaign and Russia's election interference, and whether he obstructed justice. Ty Cobb, the White House lawyer Trump tapped to deal with Mueller's investigation, has said the White House is in \"total cooperation mode.\" (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/06/day-383/#1-trumps-lawyers-want-him-to-refuse' target='_blank'>Day 383</a> / <a href='https://www.nytimes.com/2018/02/05/us/politics/trump-lawyers-special-counsel-interview.html' target='_blank'>New York Times</a>)</p>",
            "incorrect": "<p><strong>I appreciate your effort. You're wrong.</strong> Trump's lawyers want him to refuse an interview with Robert Mueller, because they're concerned that he could be charged with lying to investigators. Trump, however, has said that he is \"looking forward\" to speaking with Mueller as part of the investigation into possible collusion between his campaign and Russia's election interference, and whether he obstructed justice. Ty Cobb, the White House lawyer Trump tapped to deal with Mueller's investigation, has said the White House is in \"total cooperation mode.\" (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/06/day-383/#1-trumps-lawyers-want-him-to-refuse' target='_blank'>Day 383</a> / <a href='https://www.nytimes.com/2018/02/05/us/politics/trump-lawyers-special-counsel-interview.html' target='_blank'>New York Times</a>)</p>" // no comma here
        } // no comma here
    ]
};