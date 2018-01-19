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
            "q": "Which Senator was caught removing a pair of 'invisible' glasses?",
            "a": [
                {"option": "Dick Durbin",      "correct": false},
                {"option": "Chuck Grassley",     "correct": false},
                {"option": "Orrin Hatch",      "correct": true},
                {"option": "Dianne Feinstein",     "correct": false} // no comma here
            ],
            "correct": "<p><strong>Correct. You must have 20/20 vision.</strong> Here's Orrin Hatch removing a pair of glasses he's not wearing. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/09/day-355/' target='_blank'>Day 362</a> / <a href='https://twitter.com/LevineJonathan/status/953310521775788032' target='_blank'>Twitter</a>)</p>",
            "incorrect": "<p><strong>Might be time to check your eyes.</strong> Watch Orrin Hatch remove a pair of glasses he's not wearing. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/09/day-355/' target='_blank'>Day 362</a> / <a href='https://twitter.com/LevineJonathan/status/953310521775788032' target='_blank'>Twitter</a>)</p>" // no comma here
        },
        { // Question 2 - Multiple Choice, Multiple True Answers, Select Any
            "q": "The FBI is currently investigating whether a Russian banker gave money to which organization in order to help Trump win the election?",
            "a": [
                {"option": "Facebook", "correct": false},
                {"option": "NRA",   "correct": true},
                {"option": "CPAC",  "correct": false},
                {"option": "Fox", "correct": false} // no comma here
            ],
            "correct": "<p><strong>Bullseye.</strong> The FBI is investigating whether a Russian banker illegally funneled money to the NRA in order to help Trump win the presidency. Alexander Torshin is the deputy governor of Russia's central bank and has a close relationship with Putin. Torshin spoke with Trump Jr. during an NRA gala in May 2016, when Trump won the NRA's presidential endorsement. The NRA spent $30 million to support Trump in the 2016 election – three times what they devoted to Mitt Romney in 2012. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/18/day-364/' target='_blank'>Day 364</a> / <a href='http://www.mcclatchydc.com/news/nation-world/national/article195231139.html' target='_blank'>McClatchy DC</a>)</p>",
            "incorrect": "<p><strong>A little off target.</strong> The FBI is investigating whether a Russian banker illegally funneled money to the NRA in order to help Trump win the presidency. Alexander Torshin is the deputy governor of Russia's central bank and has a close relationship with Putin. Torshin spoke with Trump Jr. during an NRA gala in May 2016, when Trump won the NRA's presidential endorsement. The NRA spent $30 million to support Trump in the 2016 election – three times what they devoted to Mitt Romney in 2012. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/18/day-364/' target='_blank'>Day 364</a> / <a href='http://www.mcclatchydc.com/news/nation-world/national/article195231139.html' target='_blank'>McClatchy DC</a>)</p>" // no comma here
        },
        { // Question 3 - Multiple Choice, Multiple True Answers, Select All
            "q": "Sarah Huckabee Sanders claimed Trump can't be racist because ______?",
            "a": [
                {"option": "He's rich",           "correct": false},
                {"option": "She said so",                  "correct": false},
                {"option": "He likes cable news",  "correct": false},
                {"option": "He was on The Apprentice",          "correct": true} // no comma here
            ],
            "correct": "<p><strong>Well done!</strong> Sarah Huckabee Sanders claimed Trump can't be racist because he was on \"The Apprentice.\" Sanders said claims that Trump is racist were \"outrageous,\" adding, \"Frankly, if the critics of the president were who he said he was, why did NBC give him a show for a decade on TV?\"  (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/16/day-362/' target='_blank'>Day 362</a> / <a href='https://www.bloomberg.com/news/articles/2018-01-16/sanders-defends-trump-as-not-racist-citing-apprentice-tv-role' target='_blank'>Bloomberg</a>)</p>",
            "incorrect": "<p><strong>You're fired.</strong> Sarah Huckabee Sanders claimed Trump can't be racist because he was on \"The Apprentice.\" Sanders said claims that Trump is racist were \"outrageous,\" adding, \"Frankly, if the critics of the president were who he said he was, why did NBC give him a show for a decade on TV?\"  (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/16/day-362/' target='_blank'>Day 362</a> / <a href='https://www.bloomberg.com/news/articles/2018-01-16/sanders-defends-trump-as-not-racist-citing-apprentice-tv-role' target='_blank'>Bloomberg</a>)</p>" // no comma here
        },
        { // Question 4
            "q": "Steve Bannon didn't respond to House Intelligence Committee questions because______.",
            "a": [
                {"option": "He hasn't testified ",    "correct": true},
                {"option": "He struck a deal with Robert Mueller",     "correct": false},
                {"option": "He did not recall",      "correct": false},
                {"option": "The White House directed him not to",   "correct": true} // no comma here
            ],
            "select_any": true,
            "correct": "<p><strong>You better believe it.</strong> Bannon didn't respond to House Intelligence Committee questions because the White House directed him not to. During Bannon's testimony, his attorney relayed questions in real time to the White House asking if his client could answer the questions. Bannon was instructed not to discuss his work on the transition or in the White House. White House officials believed they had an agreement with the committee to limit questions to the presidential campaign. Adam Schiff, the top Democrat on the committee, called the \"gag order\" an \"audacious\" move by the White House. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/17/day-363/' target='_blank'>Day 363</a> / <a href='https://www.cnn.com/2018/01/16/politics/steve-bannon-executive-privilege/index.html' target='_blank'>CNN</a>)</p>",
            "incorrect": "<p><strong>Fake news.</strong> Bannon didn't respond to House Intelligence Committee questions because the White House directed him not to. During Bannon's testimony, his attorney relayed questions in real time to the White House asking if his client could answer the questions. Bannon was instructed not to discuss his work on the transition or in the White House. White House officials believed they had an agreement with the committee to limit questions to the presidential campaign. Adam Schiff, the top Democrat on the committee, called the \"gag order\" an \"audacious\" move by the White House. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/17/day-363/' target='_blank'>Day 363</a> / <a href='https://www.cnn.com/2018/01/16/politics/steve-bannon-executive-privilege/index.html' target='_blank'>CNN</a>)</p>" // no comma here
        },
        { // Question 5
            "q": "Who may have taped confidential West Wing conversations?'",
            "a": [
                {"option": "Chris Christie",    "correct": false},
                {"option": "Hannity",     "correct": false},
                {"option": "Omarosa Manigault-Newman",      "correct": true},
                {"option": "President Trump",   "correct": false} // no comma here
            ],
            "correct": "<p><strong>You must be an Apprentice fan.</strong> Omarosa Manigault-Newman may have taped confidential West Wing conversations. The former White House staffer believes she may become a fixture in Robert Mueller's investigation into possible connections between the Trump campaign and Russia's election meddling. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/19/day-365/' target='_blank'>Day 365</a> / <a href='http://www.nydailynews.com/news/politics/omarosa-taped-confidential-white-house-discussions-article-1.3765147' target='_blank'>NY Daily News</a>)</p>",
            "incorrect": "<p><strong>Ouch.</strong> Omarosa Manigault-Newman may have taped confidential West Wing conversations. The former White House staffer believes she may become a fixture in Robert Mueller's investigation into possible connections between the Trump campaign and Russia's election meddling. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/19/day-365/' target='_blank'>Day 365</a> / <a href='http://www.nydailynews.com/news/politics/omarosa-taped-confidential-white-house-discussions-article-1.3765147' target='_blank'>NY Daily News</a>)</p>" // no comma here
        } // no comma here
    ]
};