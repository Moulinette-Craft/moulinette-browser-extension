const moulinette = document.getElementById("moulinette")
if(!moulinette) {
  $.ajax({
      url: (typeof browser !== "undefined" ? browser : chrome).runtime.getURL("html/moulinette-panel.html"),
      cache: false
  }).done(function(data) {
    const panel = document.createElement('div');
    panel.style.display = "none"
    panel.id = "moulinette-panel"
    document.body.appendChild(panel);
    $(panel).html(data);
  });
  $.ajax({
      url: (typeof browser !== "undefined" ? browser : chrome).runtime.getURL("html/moulinette-drop.html"),
      cache: false
  }).done(function(data) {
    const dropzone = document.createElement('div');
    dropzone.id = "moulinette-drop"
    document.body.appendChild(dropzone);
    $(dropzone).html(data);
  });
  $.ajax({
      url: (typeof browser !== "undefined" ? browser : chrome).runtime.getURL("html/moulinette-preview.html"),
      cache: false
  }).done(function(data) {
    const dropzone = document.createElement('div');
    dropzone.id = "moulinette-preview"
    document.body.appendChild(dropzone);
    $(dropzone).html(data);
  });
}
