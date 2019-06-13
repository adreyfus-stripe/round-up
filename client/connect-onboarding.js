document.querySelector("#sign-up-button").addEventListener("click", function() {
  var url = document.querySelector("button").dataset["url"];
  window.location.href = url;
});
