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
            "q": "Who did Trump call \"disgraceful\" on Twitter?",
            "a": [
                {"option": "China",      "correct": false},
                {"option": "Robert Mueller",     "correct": false},
                {"option": "Democrats",      "correct": false},
                {"option": "Jeff Sessions",     "correct": true} // no comma here
            ],
            "correct": "<p><strong>Correct.</strong> Trump attacked Jeff Sessions on Twitter for his \"disgraceful\" handling of an investigation into potential surveillance abuses. \"Why is A.G. Jeff Sessions asking the Inspector General to investigate potentially massive FISA abuse. Will take forever, has no prosecutorial power and already late with reports on Comey etc,\" Trump tweeted. \"Isn't the I.G. an Obama guy? Why not use Justice Department lawyers? DISGRACEFUL!\" Yesterday, Sessions announced that the Justice Department is looking at whether the FBI properly handled FISA applications to monitor members of Trump's transition team. (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/28/day-405/#5-trump-attacked-jeff-sessions-on-tw' target='_blank'>Day 405</a> / <a href='https://www.cnn.com/2018/02/28/politics/trump-sessions-fisa-abuse/index.html' target='_blank'>CNN</a>)</p>",
            "incorrect": "<p><strong>No disgraceful enough.</strong>  Trump attacked Jeff Sessions on Twitter for his \"disgraceful\" handling of an investigation into potential surveillance abuses. \"Why is A.G. Jeff Sessions asking the Inspector General to investigate potentially massive FISA abuse. Will take forever, has no prosecutorial power and already late with reports on Comey etc,\" Trump tweeted. \"Isn't the I.G. an Obama guy? Why not use Justice Department lawyers? DISGRACEFUL!\" Yesterday, Sessions announced that the Justice Department is looking at whether the FBI properly handled FISA applications to monitor members of Trump's transition team. (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/28/day-405/#5-trump-attacked-jeff-sessions-on-tw' target='_blank'>Day 405</a> / <a href='https://www.cnn.com/2018/02/28/politics/trump-sessions-fisa-abuse/index.html' target='_blank'>CNN</a>)</p>" // no comma here
        },
        { // Question 2 - Multiple Choice, Multiple True Answers, Select Any
            "q": "What is the White House reportedly \"furious\" about?",
            "a": [
                {"option": "Robert Mueller looking into Trump's attempts to fire Jeff Sessions", "correct": false},
                {"option": "Ben Carson spending $31,000 to replace a dining room set",   "correct": true},
                {"option": "Hope Hicks resigning as White House communications director",  "correct": false},
                {"option": "Jared Kushner's security clearance being downgradedn", "correct": false} // no comma here
            ],
            "correct": "<p><strong>Cha-ching! That's correct.</strong> The White House is reportedly \"furious\" over the stories about excessive spending at the Department of Housing and Urban Development. Aides have been trying to manage the negative publicity, which includes Ben Carson spending $31,000 to replace a dining room set and demoting an administrative officer for refusing the spend more than the $5,000 legal limit on office decorations. Carson now wants to cancel the order for a $31,000 dining set, saying \"I was as surprised as anyone to find out that a $31,000 dining set had been ordered.\" (<a href='https://whatthefuckjusthappenedtoday.com/2018/03/01/day-406/#6-the-white-house-is-reportedly-furi' target='_blank'>Day 406</a> / <a href='https://www.cnn.com/2018/02/28/politics/white-house-ben-carson-table-chair/index.html' target='_blank'>CNN</a>)</p>",
            "incorrect": "<p><strong>NOPE.</strong> The White House is reportedly \"furious\" over the stories about excessive spending at the Department of Housing and Urban Development. Aides have been trying to manage the negative publicity, which includes Ben Carson spending $31,000 to replace a dining room set and demoting an administrative officer for refusing the spend more than the $5,000 legal limit on office decorations. Carson now wants to cancel the order for a $31,000 dining set, saying \"I was as surprised as anyone to find out that a $31,000 dining set had been ordered.\" (<a href='https://whatthefuckjusthappenedtoday.com/2018/03/01/day-406/#6-the-white-house-is-reportedly-furi' target='_blank'>Day 406</a> / <a href='https://www.cnn.com/2018/02/28/politics/white-house-ben-carson-table-chair/index.html' target='_blank'>CNN</a>)</p>" // no comma here
        },
        { // Question 3 - Multiple Choice, Multiple True Answers, Select All
            "q": "Who was caught dozing off during a meeting with governors?",
            "a": [
                {"option": "Devin Nunes",           "correct": false},
                {"option": "Jared Kushner",                  "correct": false},
                {"option": "Sarah Huckabee Sanders",  "correct": false},
                {"option": "Stephen Miller",          "correct": true} // no comma here
            ],
            "correct": "<p><strong>You must sleep well.</strong> Stephen Miller was caught dozing off during a meeting with governors about school safety following the mass shooting at a Florida high school. (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/26/day-403/#poll-58-of-americans-say-they-trust' target='_blank'>Day 403</a> / <a href='http://thehill.com/homenews/administration/375651-photographer-appears-to-catch-stephen-miller-sleeping-during-white' target='_blank'>The Hill</a>)</p>",
            "incorrect": "<p><strong>Rest up so you get this correct next time.</strong> Stephen Miller was caught dozing off during a meeting with governors about school safety following the mass shooting at a Florida high school. (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/26/day-403/#poll-58-of-americans-say-they-trust' target='_blank'>Day 403</a> / <a href='http://thehill.com/homenews/administration/375651-photographer-appears-to-catch-stephen-miller-sleeping-during-white' target='_blank'>The Hill</a>)</p>" // no comma here
        },
        { // Question 4
            "q": "Who joked that his job at the White House is a punishment from God?",
            "a": [
                {"option": "Donald Trump",     "correct": false},
                {"option": "John Kelly",    "correct": true},
                {"option": "Jared Kushner",      "correct": false},
                {"option": "Vladimir Putin",   "correct": false} // no comma here
            ],
            "correct": "<p><strong>Yep.</strong> John Kelly joked that his job at the White House is a punishment from God. Speaking at an event in Washington honoring former leaders of the Department of Homeland Security, Kelly said he didn't want to leave his job running the department, adding, \"but I did something wrong and God punished me, I guess.\"  (<a href='https://whatthefuckjusthappenedtoday.com/2018/03/01/day-406/#poll-74-of-americans-said-they-had-a' target='_blank'>Day 406</a> / <a href='http://abcnews.go.com/Politics/white-house-chief-staff-john-kelly-jokes-job/story?id=53440655' target='_blank'>ABC News</a>)</p>",
            "incorrect": "<p><strong>Nope.</strong> John Kelly joked that his job at the White House is a punishment from God. Speaking at an event in Washington honoring former leaders of the Department of Homeland Security, Kelly said he didn't want to leave his job running the department, adding, \"but I did something wrong and God punished me, I guess.\"  (<a href='https://whatthefuckjusthappenedtoday.com/2018/03/01/day-406/#poll-74-of-americans-said-they-had-a' target='_blank'>Day 406</a> / <a href='http://abcnews.go.com/Politics/white-house-chief-staff-john-kelly-jokes-job/story?id=53440655' target='_blank'>ABC News</a>)</p>" // no comma here
        },
        { // Question 5
            "q": "Russian operatives \"compromised\" election systems in how many states prior to 2016 election?",
            "a": [
                {"option": "7",    "correct": true},
                {"option": "11",     "correct": false},
                {"option": "22",      "correct": false},
                {"option": "23",   "correct": false} // no comma here
            ],
            "correct": "<p><strong>All your base are belong to us.</strong> Russian operatives \"compromised\" election systems in seven states prior to 2016 election, from hacking state websites to penetrating voter registration databases, according to a top-secret intelligence reported requested by Obama during his last weeks in office. Three senior intelligence officials said the intelligence community believed the states were Alaska, Arizona, California, Florida, Illinois, Texas, and Wisconsin. Several of those states were notified that foreign entities were probing their systems, but none were told the Russian government was behind it. (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/27/day-404/#9-russian-operatives-compromised-ele' target='_blank'>Day 404</a> / <a href='https://www.nbcnews.com/politics/elections/u-s-intel-russia-compromised-seven-states-prior-2016-election-n850296' target='_blank'>NBC News</a>)</p>",
            "incorrect": "<p><strong>Incorrect.</strong> Russian operatives \"compromised\" election systems in seven states prior to 2016 election, from hacking state websites to penetrating voter registration databases, according to a top-secret intelligence reported requested by Obama during his last weeks in office. Three senior intelligence officials said the intelligence community believed the states were Alaska, Arizona, California, Florida, Illinois, Texas, and Wisconsin. Several of those states were notified that foreign entities were probing their systems, but none were told the Russian government was behind it. (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/27/day-404/#9-russian-operatives-compromised-ele' target='_blank'>Day 404</a> / <a href='https://www.nbcnews.com/politics/elections/u-s-intel-russia-compromised-seven-states-prior-2016-election-n850296' target='_blank'>NBC News</a>)</p>" // no comma here
        } // no comma here
    ]
};