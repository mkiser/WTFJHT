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
            "q": "Trump tried to find a position in his administration for __________, who turned down a previous nomination after old domestic abuse allegations resurfaced. ",
            "a": [
                {"option": "Andy Puzder",      "correct": true},
                {"option": "KT McFarland",     "correct": false},
                {"option": "Michael Flynn",      "correct": false},
                {"option": "Anthony Scarmucci",     "correct": false} // no comma here
            ],
            "correct": "<p><strong>That's right!</strong> The White House wants to find a new role for Andrew Puzder, the former head of Carl's Jr. who declined the nomination to become labor secretary after old domestic abuse allegations resurfaced. The White House, however, is apparently considering finding another role for Puzder inside the Trump administration. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/09/day-355/' target='_blank'>Day 355</a> / <a href='https://www.politico.com/story/2018/01/08/andy-puzder-white-house-administration-328240' target='_blank'>Politico</a>)</p>",
            "incorrect": "<p><strong>Negative.</strong> The White House wants to find a new role for Andrew Puzder, the former head of Carl's Jr. who declined the nomination to become labor secretary after old domestic abuse allegations resurfaced. The White House, however, is apparently considering finding another role for Puzder inside the Trump administration. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/09/day-355/' target='_blank'>Day 355</a> / <a href='https://www.politico.com/story/2018/01/08/andy-puzder-white-house-administration-328240' target='_blank'>Politico</a>)</p>" // no comma here
        },
        { // Question 2 - Multiple Choice, Multiple True Answers, Select Any
            "q": "The US Army's official twitter account liked a tweet by __________ that was critical of Trump.",
            "a": [
                {"option": "Hillary Clinton", "correct": false},
                {"option": "Mindy Kaling",   "correct": true},
                {"option": "Oprah",  "correct": false},
                {"option": "Dianne Feinstein", "correct": false} // no comma here
            ],
            "correct": "<p><strong>Boom! That's correct.</strong> The US Army's official Twitter account liked a tweet critical of Trump by 'The Office' and 'The Mindy Project' star Mindy Kaling. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/08/day-354/' target='_blank'>Day 354</a> / <a href='https://www.washingtonpost.com/news/checkpoint/wp/2018/01/08/the-military-cant-stop-accidentally-undermining-trump-on-twitter/' target='_blank'>Washington Post</a>)</p>",
            "incorrect": "<p><strong>Darnit. That wasn't quite right.</strong> The US Army's official Twitter account liked a tweet critical of Trump by 'The Office' and 'The Mindy Project' star Mindy Kaling. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/08/day-354/' target='_blank'>Day 354</a> / <a href='https://www.washingtonpost.com/news/checkpoint/wp/2018/01/08/the-military-cant-stop-accidentally-undermining-trump-on-twitter/' target='_blank'>Washington Post</a>)</p>" // no comma here
        },
        { // Question 3 - Multiple Choice, Multiple True Answers, Select All
            "q": "What voting bloc has Trump lost the most ground with since becoming President?",
            "a": [
                {"option": "Millennials",           "correct": false},
                {"option": "Blue-collar white men",                  "correct": false},
                {"option": "Millennial men without a degree",  "correct": false},
                {"option": "Women",          "correct": true} // no comma here
            ],
            "correct": "<p><strong>Correct!</strong> Trump is losing ground with women, in particular Millennial, white-collar, and blue-collar white women, according to an unpublished SurveyMonkey poll of 605,172 Americans. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/11/day-357/' target='_blank'>Day 357</a> / <a href='https://www.theatlantic.com/politics/archive/2018/01/the-voters-abandoning-donald-trump/550247/' target='_blank'>The Atlantic</a>)</p>",
            "incorrect": "<p><strong>No! No! No!</strong> Trump is losing ground with women, in particular Millennial, white-collar, and blue-collar white women, according to an unpublished SurveyMonkey poll of 605,172 Americans. (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/11/day-357/' target='_blank'>Day 357</a> / <a href='https://www.theatlantic.com/politics/archive/2018/01/the-voters-abandoning-donald-trump/550247/' target='_blank'>The Atlantic</a>)</p>" // no comma here
        },
        { // Question 4
            "q": "What cable new host opened their segment this week with: 'The president of the United States is racist'",
            "a": [
                {"option": "Rachel Maddow",    "correct": false},
                {"option": "Anderson Cooper",     "correct": false},
                {"option": "Megyn Kelly",      "correct": false},
                {"option": "Don Lemon",   "correct": true} // no comma here
            ],
            "correct": "<p><strong>Damn straight.</strong> Don Lemon opened his segment with: 'The president of the United States is racist.' The CNN Tonight host added that 'A lot of us already knew that,' and that Trump's comments were 'disgusting,' but not shocking. 'They're not even really surprising.' (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/12/day-358/' target='_blank'>Day 358</a> / <a href='https://www.washingtonpost.com/news/morning-mix/wp/2018/01/12/this-is-cnn-tonight-im-don-lemon-the-president-of-the-united-states-is-racist/' target='_blank'>Washington Post</a>)</p>",
            "incorrect": "<p><strong>That's not fucking it.</strong> Don Lemon opened his segment with: 'The president of the United States is racist.' The CNN Tonight host added that 'A lot of us already knew that,' and that Trump's comments were 'disgusting,' but not shocking. 'They're not even really surprising.' (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/12/day-358/' target='_blank'>Day 358</a> / <a href='https://www.washingtonpost.com/news/morning-mix/wp/2018/01/12/this-is-cnn-tonight-im-don-lemon-the-president-of-the-united-states-is-racist/' target='_blank'>Washington Post</a>)</p>" // no comma here
        },
        { // Question 5
            "q": "Who called the court system 'broken and unfair?'",
            "a": [
                {"option": "Sarah Huckabee Sanders",    "correct": false},
                {"option": "Sean Spicer",     "correct": false},
                {"option": "Ryan Zinke",      "correct": false},
                {"option": "President Trump",   "correct": true} // no comma here
            ],
            "correct": "<p><strong>Bingo.</strong> A federal judge blocked the Trump administration's attempt to end DACA, the Obama-era program that allows undocumented immigrants who entered the country as children to remain in the United States. A San Francisco-based U.S. District Court judge said Jeff Sessions' claim that the program is illegal was 'based on a flawed legal premise,' and ordered the administration to resume accepting DACA renewal applications. Trump responded, calling the court system 'broken and unfair.' Sarah Huckabee Sanders added that the decision was 'outrageous.' (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/10/day-356/' target='_blank'>Day 356</a> / <a href='https://twitter.com/realDonaldTrump/status/951094078661414912' target='_blank'>Twitter</a>)</p>",
            "incorrect": "<p><strong>Sorry, try harder.</strong> A federal judge blocked the Trump administration's attempt to end DACA, the Obama-era program that allows undocumented immigrants who entered the country as children to remain in the United States. A San Francisco-based U.S. District Court judge said Jeff Sessions' claim that the program is illegal was 'based on a flawed legal premise,' and ordered the administration to resume accepting DACA renewal applications. Trump responded, calling the court system 'broken and unfair.' Sarah Huckabee Sanders added that the decision was 'outrageous.' (<a href='https://whatthefuckjusthappenedtoday.com/2018/01/10/day-356/' target='_blank'>Day 356</a> / <a href='https://twitter.com/realDonaldTrump/status/951094078661414912' target='_blank'>Twitter</a>)</p>" // no comma here
        } // no comma here
    ]
};