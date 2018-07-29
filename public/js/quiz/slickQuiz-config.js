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
            "q": "Who did Trump call a \"Gas Killing Animal\" on Twitter?",
            "a": [
                {"option": "Putin",      "correct": false},
                {"option": "Robert Mueller",     "correct": false},
                {"option": "Paul Ryan",      "correct": false},
                {"option": "Assad",     "correct": true} // no comma here
            ],
            "correct": "<p><strong>Correct.</strong> Trump tweets that \"smart\" missiles \"will be coming\" toward Syria in response to a chemical attack, taunting Russia to \"get ready.\" Russia's ambassador to Lebanon said any U.S. missiles fired at Syria would be shot down and the launch sites targeted. Trump also condemned Moscow's backing of Bashar al-Assad, saying: \"You shouldn't be partners with a Gas Killing Animal who kills his people and enjoys it!\" In a pair of subsequent tweets, Trump said relations between the U.S. and Russia are \"worse now than it has ever been\" and the \"Fake and Corrupt Russia Investigation,\" Democrats, and everybody that worked for Obama are to blame. (<a href='https://whatthefuckjusthappenedtoday.com/2018/04/11/day-447/#1-trump-tweets-that-smart-missiles-w'>Day 447</a> / <a href='https://www.nytimes.com/2018/04/11/world/middleeast/trump-syria-attack.html' target='_blank'>New York Times</a>)</p>",
            "incorrect": "<p><strong>No, not corrupt enough.</strong> Trump tweets that \"smart\" missiles \"will be coming\" toward Syria in response to a chemical attack, taunting Russia to \"get ready.\" Russia's ambassador to Lebanon said any U.S. missiles fired at Syria would be shot down and the launch sites targeted. Trump also condemned Moscow's backing of Bashar al-Assad, saying: \"You shouldn't be partners with a Gas Killing Animal who kills his people and enjoys it!\" In a pair of subsequent tweets, Trump said relations between the U.S. and Russia are \"worse now than it has ever been\" and the \"Fake and Corrupt Russia Investigation,\" Democrats, and everybody that worked for Obama are to blame. (<a href='https://whatthefuckjusthappenedtoday.com/2018/04/11/day-447/#1-trump-tweets-that-smart-missiles-w'>Day 447</a> / <a href='https://www.nytimes.com/2018/04/11/world/middleeast/trump-syria-attack.html' target='_blank'>New York Times</a>)</p>" // no comma here
        },
        { // Question 2 - Multiple Choice, Multiple True Answers, Select Any
            "q": "What was the \"disgraceful situation\" Trump was referring to? (Hint: he said this has reached a \"new level of unfairness\" and \"an attack on our country in a true sense.\")",
            "a": [
                {"option": "The chemical attack in Syria", "correct": false},
                {"option": "The FBI raid on Michael Cohen",   "correct": true},
                {"option": "Mark Zuckerberg's congressional testimony",  "correct": false},
                {"option": "Scott Pruitt's controversial pay raise for an aide", "correct": false} // no comma here
            ],
            "correct": "<p><strong>Nailed it.</strong> The FBI raided Michael Cohen's office, home, and Manhattan hotel room seizing records related to Stormy Daniels and several other topics. Federal prosecutors in Manhattan obtained the search warrants after receiving a referral from Robert Mueller. The search warrants were executed by the office of the U.S. Attorney for Southern District of New York and are \"in part\" related to Mueller's investigation. Trump characterized the FBI raid on his longtime personal attorney as a \"disgraceful situation\" that has reached a \"new level of unfairness\" and \"an attack on our country in a true sense.\" (<a href='https://whatthefuckjusthappenedtoday.com/2018/04/09/day-445/#1-the-fbi-raided-michael-cohens-offi' target='_blank'>Day 445</a> / <a href='https://www.nytimes.com/2018/04/09/us/politics/fbi-raids-office-of-trumps-longtime-lawyer-michael-cohen.html' target='_blank'>New York Times</a>)</p>",
            "incorrect": "<p><strong>Not the disgraceful situation you're looking for.</strong> The FBI raided Michael Cohen's office, home, and Manhattan hotel room seizing records related to Stormy Daniels and several other topics. Federal prosecutors in Manhattan obtained the search warrants after receiving a referral from Robert Mueller. The search warrants were executed by the office of the U.S. Attorney for Southern District of New York and are \"in part\" related to Mueller's investigation. Trump characterized the FBI raid on his longtime personal attorney as a \"disgraceful situation\" that has reached a \"new level of unfairness\" and \"an attack on our country in a true sense.\" (<a href='https://whatthefuckjusthappenedtoday.com/2018/04/09/day-445/#1-the-fbi-raided-michael-cohens-offi' target='_blank'>Day 445</a> / <a href='https://www.nytimes.com/2018/04/09/us/politics/fbi-raids-office-of-trumps-longtime-lawyer-michael-cohen.html' target='_blank'>New York Times</a>)</p>" // no comma here
        },
        { // Question 3 - Multiple Choice, Multiple True Answers, Select All
            "q": "Who \"LIED! LIED! LIED!\" according to Trump?",
            "a": [
                {"option": "James Comey",           "correct": false},
                {"option": "Michael Cohen",                  "correct": false},
                {"option": "Rod Rosenstein",  "correct": false},
                {"option": "Andrew McCabe",          "correct": true} // no comma here
            ],
            "correct": "<p><strong>TRUTH.</strong> The Justice Department inspector general found that former FBI Deputy Director Andrew McCabe \"lacked candor\" on four occasions when discussing the alleged improper authorization of information to a newspaper reporter and then misleading investigators about it. Trump tweeted that the report \"is a total disaster. He LIED! LIED! LIED! McCabe was totally controlled by Comey - McCabe is Comey!! No collusion, all made up by this den of thieves and lowlifes!\" McCabe was fired by Attorney General Jeff Sessions just hours before his retirement and the FBI officially filled McCabe's roll with Associate Deputy Director David Bowdich (<a href='https://whatthefuckjusthappenedtoday.com/2018/04/13/day-449/#10-the-justice-department-inspector' target='_blank'>Day 449</a> / <a href='https://www.cnn.com/2018/04/13/politics/andrew-mccabe-ig-report-congress/index.html' target='_blank'>CNN</a>)</p>",
            "incorrect": "<p><strong>FAKE NEWS.</strong> The Justice Department inspector general found that former FBI Deputy Director Andrew McCabe \"lacked candor\" on four occasions when discussing the alleged improper authorization of information to a newspaper reporter and then misleading investigators about it. Trump tweeted that the report \"is a total disaster. He LIED! LIED! LIED! McCabe was totally controlled by Comey - McCabe is Comey!! No collusion, all made up by this den of thieves and lowlifes!\" McCabe was fired by Attorney General Jeff Sessions just hours before his retirement and the FBI officially filled McCabe's roll with Associate Deputy Director David Bowdich (<a href='https://whatthefuckjusthappenedtoday.com/2018/04/13/day-449/#10-the-justice-department-inspector' target='_blank'>Day 449</a> / <a href='https://www.cnn.com/2018/04/13/politics/andrew-mccabe-ig-report-congress/index.html' target='_blank'>CNN</a>)</p>" // no comma here
        },
        { // Question 4
            "q": "Who is working with White House aides and Congressional allies on a plan to undermine Robert Mueller's probe?",
            "a": [
                {"option": "Michael Cohen",     "correct": false},
                {"option": "Steve Bannon",    "correct": true},
                {"option": "Mike Pompeo",      "correct": false},
                {"option": "Stormy Daniels",   "correct": false} // no comma here
            ],
            "correct": "<p><strong>Yeah, that guy again.</strong> Steve Bannon is working with White House aides and Congressional allies on a plan to undermine Robert Mueller's probe. The plan involves firing Rod Rosenstein, refusing to cooperate with Mueller's team, and having Trump assert executive privilege \"retroactively\" in order to argue that Mueller's interviews with White House officials over the past year should now be null and void. Bannon also said \"Ty Cobb should be fired immediately.\" Trump, however, tweeted that he has \"full confidence in Ty Cobb.\" (<a href='https://whatthefuckjusthappenedtoday.com/2018/04/12/day-448/#1-steve-bannon-is-working-with-white' target='_blank'>Day 448</a> / <a href='https://www.washingtonpost.com/politics/bannon-pitches-white-house-on-plan-to-cripple-mueller-probe-and-protect-trump/2018/04/11/1ec5b1b2-3d9f-11e8-a7d1-e4efec6389f0_story.html?utm_term=.fbeab258d83c' target='_blank'>Washington Post</a>)</p>",
            "incorrect": "<p><strong>Nope.</strong> Steve Bannon is working with White House aides and Congressional allies on a plan to undermine Robert Mueller's probe. The plan involves firing Rod Rosenstein, refusing to cooperate with Mueller's team, and having Trump assert executive privilege \"retroactively\" in order to argue that Mueller's interviews with White House officials over the past year should now be null and void. Bannon also said \"Ty Cobb should be fired immediately.\" Trump, however, tweeted that he has \"full confidence in Ty Cobb.\" (<a href='https://whatthefuckjusthappenedtoday.com/2018/04/12/day-448/#1-steve-bannon-is-working-with-white' target='_blank'>Day 448</a> / <a href='https://www.washingtonpost.com/politics/bannon-pitches-white-house-on-plan-to-cripple-mueller-probe-and-protect-trump/2018/04/11/1ec5b1b2-3d9f-11e8-a7d1-e4efec6389f0_story.html?utm_term=.fbeab258d83c' target='_blank'>Washington Post</a>)</p>" // no comma here
        },
        { // Question 5
            "q": "Michael Cohen is under federal investigation for ____________?",
            "a": [
                {"option": "Possible bank fraud, wire fraud, and violations of campaign finance law",    "correct": true},
                {"option": "Lying to investigators",     "correct": false},
                {"option": "Impregnating a Playboy Playmate",      "correct": false},
                {"option": "Being a \"weak and untruthful slime ball\"",   "correct": false} // no comma here
            ],
            "correct": "<p><strong>Gold star, you got it.</strong> Michael Cohen is under federal investigation for possible bank fraud, wire fraud, and violations of campaign finance law. Two potential crimes – bank and wire fraud – suggest prosecutors believe Cohen may have misled bankers about his use of certain funds or improperly used banks to transfer funds. Among the documents taken in Monday's FBI raids on Cohen's office, home and hotel room were those related to a 2016 payment Cohen made to Stormy Daniels. (<a href='https://whatthefuckjusthappenedtoday.com/2018/04/10/day-446/#1-michael-cohen-is-under-federal-inv' target='_blank'>Day 446</a> / <a href='https://www.washingtonpost.com/politics/fbi-seizes-records-related-to-stormy-daniels-in-raid-of-trump-attorney-michael-cohens-office/2018/04/09/e3e43cf4-3c30-11e8-974f-aacd97698cef_story.html?utm_term=.c5a65d674124' target='_blank'>Washington Post</a>)</p>",
            "incorrect": "<p><strong>Incorrect, sorry.</strong> Michael Cohen is under federal investigation for possible bank fraud, wire fraud, and violations of campaign finance law. Two potential crimes – bank and wire fraud – suggest prosecutors believe Cohen may have misled bankers about his use of certain funds or improperly used banks to transfer funds. Among the documents taken in Monday's FBI raids on Cohen's office, home and hotel room were those related to a 2016 payment Cohen made to Stormy Daniels. (<a href='https://whatthefuckjusthappenedtoday.com/2018/04/10/day-446/#1-michael-cohen-is-under-federal-inv' target='_blank'>Day 446</a> / <a href='https://www.washingtonpost.com/politics/fbi-seizes-records-related-to-stormy-daniels-in-raid-of-trump-attorney-michael-cohens-office/2018/04/09/e3e43cf4-3c30-11e8-974f-aacd97698cef_story.html?utm_term=.c5a65d674124' target='_blank'>Washington Post</a>)</p>" // no comma here
        } // no comma here
    ]
};