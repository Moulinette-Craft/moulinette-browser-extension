

const moulinette = document.getElementById("moulinette")
if(!moulinette) {
  $.ajax({
      url: chrome.runtime.getURL("html/moulinette.html"),
      cache: false
  }).done(function(data) {
    const panel = document.createElement('div');
    panel.id = "moulinette-panel"
    document.body.appendChild(panel);
    $(panel).html(data);
    const dropzone = document.createElement('div');
    dropzone.id = "moulinette-drop"
    document.body.appendChild(dropzone);
  });
}



// download file
/*
async function test() {
  console.log("Downloading...")
  let res = await fetch("https://www.gravatar.com/avatar/9f5572c100ce5f2f90ee842c65c831db?s=64&d=identicon&r=PG").catch(function(e) {
    console.log(`Moulinette | Not able to fetch file`, e)
  });
  if(res) {
    const blob = await res.blob()
    const file = new File([blob], "temp.png", { type: blob.type, lastModified: new Date() })
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file); // File object representing image being dropped
    const event = new DragEvent('drop', {
      dataTransfer: dataTransfer,
      clientX: 1017,
      clientY: 523
    });
    document.getElementById("editor-wrapper").dispatchEvent(event);
    console.log("dispatched")
  }
}
*/
