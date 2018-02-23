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
            "q": "Who will not accept financial support from Trump's Patriot Legal Expense Fund?",
            "a": [
                {"option": "Paul Manafort",      "correct": false},
                {"option": "Rob Porter",     "correct": false},
                {"option": "Rick Gates",      "correct": false},
                {"option": "Michael Flynn",     "correct": true} // no comma here
            ],
            "correct": "<p><strong>Correct.</strong> Michael Flynn will not accept financial support from Trump's \"Patriot Legal Expense Fund,\" which was established using Trump's campaign funds to help White House and campaign aides with the legal expenses related to the special counsel's probe.   (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/22/day-399/#michael-flynn-will-not-accept-financ' target='_blank'>Day 399</a> / <a href='http://abcnews.go.com/Politics/trump-legal-fund-recipients-unclear-flynn/story?id=53281888' target='_blank'>ABC News</a>)</p>",
            "incorrect": "<p><strong>No dice.</strong> Michael Flynn will not accept financial support from Trump's \"Patriot Legal Expense Fund,\" which was established using Trump's campaign funds to help White House and campaign aides with the legal expenses related to the special counsel's probe.   (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/22/day-399/#michael-flynn-will-not-accept-financ' target='_blank'>Day 399</a> / <a href='http://abcnews.go.com/Politics/trump-legal-fund-recipients-unclear-flynn/story?id=53281888' target='_blank'>ABC News</a>)</p>" // no comma here
        },
        { // Question 2 - Multiple Choice, Multiple True Answers, Select Any
            "q": "Jared Kushner has been unable to obtain a full security clearance because ______?",
            "a": [
                {"option": "He's an asshole", "correct": false},
                {"option": "He's amended his personal financial disclosure too many times",   "correct": false},
                {"option": "He doesn't need one",  "correct": false},
                {"option": "Robert Mueller's investigation", "correct": true} // no comma here
            ],
            "correct": "<p><strong>That's correct.</strong> Jared Kushner has been unable to obtain a full security clearance because of Robert Mueller's investigation and is unlikely to obtain the full clearance as long as the special counsel's probe is ongoing. (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/23/day-400/#2-jared-kushner-has-been-unable-to-o' target='_blank'>Day 400</a> / <a href='https://www.cnn.com/2018/02/22/politics/jared-kushner-security-clearance-delay-mueller-investigation/index.html' target='_blank'>CNN</a>)</p>",
            "incorrect": "<p><strong>I thought this was obvious. Guess not.</strong> Jared Kushner has been unable to obtain a full security clearance because of Robert Mueller's investigation and is unlikely to obtain the full clearance as long as the special counsel's probe is ongoing. (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/23/day-400/#2-jared-kushner-has-been-unable-to-o' target='_blank'>Day 400</a> / <a href='https://www.cnn.com/2018/02/22/politics/jared-kushner-security-clearance-delay-mueller-investigation/index.html' target='_blank'>CNN</a>)</p>" // no comma here
        },
        { // Question 3 - Multiple Choice, Multiple True Answers, Select All
            "q": "Trump blamed a lot of people for the Russia investigation this week in a tweetstorm. Who DIDN'T he blame?",
            "a": [
                {"option": "The FBI",           "correct": false},
                {"option": "CNN",                  "correct": false},
                {"option": "Hillary Clinton",  "correct": false},
                {"option": "Russia",          "correct": true} // no comma here
            ],
            "correct": "<p><strong>верный!</strong> Trump blamed everybody but Russia as he lashed out against the Russia investigation in a nine-hour, profanity-laced, and error-laden tweetstorm. He attacked the FBI, CNN, the Democratic Party, his national security adviser, former president Obama, the top Democrat on the House Intelligence Committee, Hillary Clinton, and more. He never criticized Russia or Putin's attempts to undermine U.S. elections. (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/19/day-396/#6-trump-blamed-everybody-but-russia' target='_blank'>Day 396</a> / <a href='https://www.politico.com/story/2018/02/18/trump-twitter-mueller-fbi-russia-scandal-416858' target='_blank'>Politico</a>)</p>",
            "incorrect": "<p><strong>некорректный</strong> Trump blamed everybody but Russia as he lashed out against the Russia investigation in a nine-hour, profanity-laced, and error-laden tweetstorm. He attacked the FBI, CNN, the Democratic Party, his national security adviser, former president Obama, the top Democrat on the House Intelligence Committee, Hillary Clinton, and more. He never criticized Russia or Putin's attempts to undermine U.S. elections. (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/19/day-396/#6-trump-blamed-everybody-but-russia' target='_blank'>Day 396</a> / <a href='https://www.politico.com/story/2018/02/18/trump-twitter-mueller-fbi-russia-scandal-416858' target='_blank'>Politico</a>)</p>" // no comma here
        },
        { // Question 4
            "q": "The chairman of the Joint Chiefs of Staff said Trump's decision to end _________ \"was unexpected\" and that he was \"not consulted.\"",
            "a": [
                {"option": "Bump stocks",     "correct": false},
                {"option": "Transgender military service",    "correct": true},
                {"option": "DACA",      "correct": false},
                {"option": "Net Neutrality",   "correct": false} // no comma here
            ],
            "correct": "<p><strong>Yep.</strong> The chairman of the Joint Chiefs of Staff said Trump's decision to end transgender military service \"was unexpected\" and that he was \"not consulted.\" Less than 24 hours after Trump tweeted that \"after consultation with my Generals and military experts\" he was ending transgender service in the military, Gen. Joseph Dunford, the highest-ranking military general, emailed the generals of the Air Force, Army, Marines, National Guard, and Navy to say \"I know yesterday’s announcement was unexpected\" and that he would \"state that I was not consulted\" if asked at a scheduled Senate Armed Services Committee hearing on September 26th.  (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/20/day-397/#5-the-chairman-of-the-joint-chiefs-o' target='_blank'>Day 397</a> / <a href='https://www.buzzfeed.com/dominicholden/joint-chiefs-transgender' target='_blank'>BuzzFeed News</a>)</p>",
            "incorrect": "<p><strong>Nope.</strong> The chairman of the Joint Chiefs of Staff said Trump's decision to end transgender military service \"was unexpected\" and that he was \"not consulted.\" Less than 24 hours after Trump tweeted that \"after consultation with my Generals and military experts\" he was ending transgender service in the military, Gen. Joseph Dunford, the highest-ranking military general, emailed the generals of the Air Force, Army, Marines, National Guard, and Navy to say \"I know yesterday’s announcement was unexpected\" and that he would \"state that I was not consulted\" if asked at a scheduled Senate Armed Services Committee hearing on September 26th.  (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/20/day-397/#5-the-chairman-of-the-joint-chiefs-o' target='_blank'>Day 397</a> / <a href='https://www.buzzfeed.com/dominicholden/joint-chiefs-transgender' target='_blank'>BuzzFeed News</a>)</p>" // no comma here
        },
        { // Question 5
            "q": "Who said the \"evidence is now incontrovertible\" that Russia meddled in the U.S. political system?",
            "a": [
                {"option": "H. R. McMaster ",    "correct": true},
                {"option": "Sean Hannity",     "correct": false},
                {"option": "Dan Coates",      "correct": false},
                {"option": "Paul Ryan",   "correct": false} // no comma here
            ],
            "correct": "<p><strong>That would be correct.</strong> National Security Adviser H. R. McMaster said the \"evidence is now incontrovertible\" that Russia meddled in the U.S. political system, essentially telling the Munich Security Conference to ignore Trump's tweet. Trump countered on Twitter, naturally: \"General McMaster forgot to say that the results of the 2016 election were not impacted or changed by the Russians and that the only Collusion was between Russia and Crooked H, the DNC and the Dems.\" (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/19/day-396/#7-national-security-adviser-h-r-mcma' target='_blank'>Day 396</a> / <a href='https://www.washingtonpost.com/world/top-us-officials-tell-the-world-to-ignore-trumps-tweets/2018/02/18/bc605236-14a2-11e8-942d-16a950029788_story.html' target='_blank'>Washington Post</a>)</p>",
            "incorrect": "<p><strong>I appreciate your effortts, but you are wrong.</strong> National Security Adviser H. R. McMaster said the \"evidence is now incontrovertible\" that Russia meddled in the U.S. political system, essentially telling the Munich Security Conference to ignore Trump's tweet. Trump countered on Twitter, naturally: \"General McMaster forgot to say that the results of the 2016 election were not impacted or changed by the Russians and that the only Collusion was between Russia and Crooked H, the DNC and the Dems.\" (<a href='https://whatthefuckjusthappenedtoday.com/2018/02/19/day-396/#7-national-security-adviser-h-r-mcma' target='_blank'>Day 396</a> / <a href='https://www.washingtonpost.com/world/top-us-officials-tell-the-world-to-ignore-trumps-tweets/2018/02/18/bc605236-14a2-11e8-942d-16a950029788_story.html' target='_blank'>Washington Post</a>)</p>" // no comma here
        } // no comma here
    ]
};