declare var chrome: any;
declare var browser: any;

$.ajax({
    url: (typeof browser !== "undefined" ? browser : chrome).runtime.getURL("html/moulinette-panel.html"),
    cache: false
}).done(function(data) {
  const existingPanel = document.getElementById("moulinette-panel");
  if (!existingPanel) {
    const panel = document.createElement('div');
    panel.style.display = "none"
    panel.id = "moulinette-panel"
    document.body.appendChild(panel);
    $(panel).html(data);  
  }
});
$.ajax({
    url: (typeof browser !== "undefined" ? browser : chrome).runtime.getURL("html/moulinette-drop.html"),
    cache: false
}).done(function(data) {
  const existingDropzone = document.getElementById("moulinette-drop");
  if (!existingDropzone) {
    const dropzone = document.createElement('div');
    //dropzone.style.display = "none"
    dropzone.id = "moulinette-drop"
    document.body.appendChild(dropzone);
    $(dropzone).html(data);
  }
});
$.ajax({
    url: (typeof browser !== "undefined" ? browser : chrome).runtime.getURL("html/moulinette-preview.html"),
    cache: false
}).done(function(data) {
  const existingPreview = document.getElementById("moulinette-preview");
  if (!existingPreview) {
    const preview = document.createElement('div');
    //preview.style.display = "none"
    preview.id = "moulinette-preview"
    document.body.appendChild(preview);
    $(preview).html(data);
  }
});
