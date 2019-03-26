// $(document).ready(function() {


	$('#wtfbutton').click(function() {
		if(localStorage.countOfFucks !== undefined){
			var countOfFucks = parseInt(localStorage.getItem("countOfFucks"));
			localStorage.setItem("countOfFucks", ++countOfFucks); 
		} else {
			localStorage.setItem("countOfFucks", 1); 
		};
		console.log(localStorage.countOfFucks);
		$.getJSON("/api/v1/posts.json", function(data) {
			console.log("[posts.json loaded from API]");
			var i = parseInt(Math.random() * data.allPosts.length);
			console.log(i)
			var post = data.allPosts[i];
			console.log(post)

			var content = post.content;
			var blurb = content.split(/<p>[0-9][0-9]?\/\s|poll\/\s|<li>\s*<p>/).slice(1);
			var j = parseInt(Math.random() * blurb.length)
			var oneFuck = blurb[j].split(/<\/p>|<\/li>/).slice(0,-1)[0];
			console.log(blurb,j,oneFuck);

		 	// Build out the random fucking page
		 	document.getElementById('wtfcounter').innerHTML = localStorage.countOfFucks;
		 	document.getElementById('rfuck').innerHTML = oneFuck;
		 	document.getElementById('rtitle').innerHTML = post.title;
		 	document.getElementById('rdescription').innerHTML = post.desc;
		 	document.getElementById('rlink').href = post.href;
		 	document.getElementById('rdate').innerHTML = post.date.date;
		 });
	});
// });
