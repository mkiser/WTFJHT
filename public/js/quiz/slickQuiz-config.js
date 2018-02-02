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
            "q": "Who told Trump that the emails involving Trump Jr. and the Trump Tower meeting \"will never get out\"?",
            "a": [
                {"option": "Sean Spicer",      "correct": false},
                {"option": "Sarah Huckabee Sanders",     "correct": false},
                {"option": "Hope Hicks",      "correct": true},
                {"option": "Devin Nunes",     "correct": false} // no comma here
            ],
            "correct": "<p><strong>I HOPE you're correct.</strong> Hope Hicks allegedly told Trump that the emails involving Trump Jr. and the Trump Tower meeting \"will never get out\" because only a few people have access to them. (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/01/day-378/' target='_blank'>Day 378</a> / <a href='https://www.nytimes.com/2018/02/01/us/politics/republicans-secret-memo-nunes.html' target='_blank'>New York Times</a>)</p>",
            "incorrect": "<p><strong>I HOPE you pay attention next week.</strong> Hope Hicks allegedly told Trump that the emails involving Trump Jr. and the Trump Tower meeting 'will never get out' because only a few people have access to them. (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/01/day-378/' target='_blank'>Day 378</a> / <a href='https://www.nytimes.com/2018/02/01/us/politics/republicans-secret-memo-nunes.html' target='_blank'>New York Times</a>)</p>" // no comma here
        },
        { // Question 2 - Multiple Choice, Multiple True Answers, Select Any
            "q": "Trump asked __________ if he was 'on my team?'",
            "a": [
                {"option": "James Comey", "correct": false},
                {"option": "Rod Rosenstein",   "correct": true},
                {"option": "Jeff Sessions",  "correct": false},
                {"option": "Steve Bannon", "correct": false} // no comma here
            ],
            "correct": "<p><strong>YUP.</strong> Trump asked Rod Rosenstein if he was \"on my team\" during a December meeting at the White House. \"Of course, we're all on your team, Mr. President,\" Rosenstein said, who wanted Trump to push back on the Nunes memo. Trump, however, wanted to know where Robert Mueller's Russia investigation was going. It's Trump's fourth loyalty request from a Justice Department official. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/31/day-377/' target='_blank'>Day 377</a> / <a href='https://www.cnn.com/2018/01/31/politics/donald-trump-rod-rosenstein-december-meeting/index.html' target='_blank'>CNN</a>)</p>",
            "incorrect": "<p><strong>NOPE.</strong> Trump asked Rod Rosenstein if he was \"on my team\" during a December meeting at the White House. \"Of course, we're all on your team, Mr. President,\" Rosenstein said, who wanted Trump to push back on the Nunes memo. Trump, however, wanted to know where Robert Mueller's Russia investigation was going. It's Trump's fourth loyalty request from a Justice Department official. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/31/day-377/' target='_blank'>Day 377</a> / <a href='https://www.cnn.com/2018/01/31/politics/donald-trump-rod-rosenstein-december-meeting/index.html' target='_blank'>CNN</a>)</p>" // no comma here
        },
        { // Question 3 - Multiple Choice, Multiple True Answers, Select All
            "q": "Sarah Huckabee Sanders claimed that \"poll after poll\" says that nobody cares about ____________?",
            "a": [
                {"option": "Trump's poll numbers",           "correct": false},
                {"option": "The Patriots being in the Super Bowl again",                  "correct": false},
                {"option": "Turtles",  "correct": false},
                {"option": "The Trump-Russia investigation",          "correct": true} // no comma here
            ],
            "correct": "<p><strong>Totally correct.</strong> Sarah Huckabee Sanders claimed that \"poll after poll\" says that nobody cares about the Trump-Russia investigation. She did not cite a specific poll. However, poll, after poll, after poll, after poll, after poll, after poll, after poll suggest Americans do care about the issue. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/29/day-375/' target='_blank'>Day 375</a> / <a href='https://www.washingtonpost.com/news/the-fix/wp/2018/01/29/polls-show-no-one-cares-about-the-russia-investigation-white-house-press-secretary-said-thats-not-true/' target='_blank'>Washington Post</a>)</p>",
            "incorrect": "<p><strong>Really?</strong> Sarah Huckabee Sanders claimed that \"poll after poll\" says that nobody cares about the Trump-Russia investigation. She did not cite a specific poll. However, poll, after poll, after poll, after poll, after poll, after poll, after poll suggest Americans do care about the issue. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/29/day-375/' target='_blank'>Day 375</a> / <a href='https://www.washingtonpost.com/news/the-fix/wp/2018/01/29/polls-show-no-one-cares-about-the-russia-investigation-white-house-press-secretary-said-thats-not-true/' target='_blank'>Washington Post</a>)</p>" // no comma here
        },
        { // Question 4
            "q": "Trump will not impose new sanctions on Russia because ____________.",
            "a": [
                {"option": "The threat is already \"serving as a deterrent\"",    "correct": true},
                {"option": "It would be \"extraordinarily reckless\"",     "correct": false},
                {"option": "The FBI had \"grave concerns\"",      "correct": false},
                {"option": "It would be \"treasonous\"",   "correct": false} // no comma here
            ],
            "select_any": true,
            "correct": "<p><strong>Apparently so.</strong> Trump will not impose new sanctions on Russia because the threat is already \"serving as a deterrent,\" a State Department official said. A bipartisan bill overwhelmingly passed in July imposes penalties on companies doing \"significant\" business with Russian defense and intelligence entities. State Department spokeswoman Heather Nauert said: \"We estimate that foreign governments have abandoned planned or announced purchases of several billion dollars in Russian defense acquisitions.\"  (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/30/day-376/' target='_blank'>Day 376</a> / <a href='https://www.politico.com/story/2018/01/29/russia-sanctions-white-house-congress-376813' target='_blank'>Politico</a>)</p>",
            "incorrect": "<p><strong>Fake news.</strong> Trump will not impose new sanctions on Russia because the threat is already \"serving as a deterrent,\" a State Department official said. A bipartisan bill overwhelmingly passed in July imposes penalties on companies doing \"significant\" business with Russian defense and intelligence entities. State Department spokeswoman Heather Nauert said: \"We estimate that foreign governments have abandoned planned or announced purchases of several billion dollars in Russian defense acquisitions.\"  (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/30/day-376/' target='_blank'>Day 376</a> / <a href='https://www.politico.com/story/2018/01/29/russia-sanctions-white-house-congress-376813' target='_blank'>Politico</a>)</p>" // no comma here
        },
        { // Question 5
            "q": "What was Trump's average 2017 job approval rating?",
            "a": [
                {"option": "34%",    "correct": false},
                {"option": "36%",     "correct": false},
                {"option": "38%",      "correct": true},
                {"option": "40%",   "correct": false} // no comma here
            ],
            "correct": "<p><strong>You must like math – CORRECT.</strong> Trump's 2017 job approval rating averaged 38% throughout the U.S., ranging from a high of 61% in West Virginia to a low of 26% in Vermont. Trump averaged 50% or higher approval in 12 states in total. By comparison, Obama had an approval rate of 50% or greater in 41 states in his first year in office. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/30/day-376/' target='_blank'>Day 366</a> / <a href='http://news.gallup.com/poll/226454/trump-approval-highest-west-virginia-lowest-vermont.aspx' target='_blank'>Gallup</a>)</p>",
            "incorrect": "<p><strong>That was a good guess, but no.</strong>Trump's 2017 job approval rating averaged 38% throughout the U.S., ranging from a high of 61% in West Virginia to a low of 26% in Vermont. Trump averaged 50% or higher approval in 12 states in total. By comparison, Obama had an approval rate of 50% or greater in 41 states in his first year in office. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/30/day-376/' target='_blank'>Day 366</a> / <a href='http://news.gallup.com/poll/226454/trump-approval-highest-west-virginia-lowest-vermont.aspx' target='_blank'>Gallup</a>)</p>" // no comma here
        } // no comma here
    ]
};