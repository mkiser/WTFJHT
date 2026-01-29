function randomPost() {
  fetch('/api/v1/random.json')
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      var i = Math.floor(Math.random() * data.length);
      location.href = data[i].href;
    })
    .catch(function(error) {
      console.error('Error loading random posts:', error);
    });
}
