function randomPost(){
   $.getJSON("/api/v1/random.json", function(data) {
    console.log("[search.json loaded for random posts]");

    var i = parseInt(Math.random() * data.length);
    location.href = data[i].href;
    });
};
