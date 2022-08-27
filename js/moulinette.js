$( document ).ready(async function() {

  console.log("Downloading...")
  const moulinette = {}
  let res = await fetch("https://www.gravatar.com/avatar/9f5572c100ce5f2f90ee842c65c831db?s=64&d=identicon&r=PG").catch(function(e) {
    console.log(`Moulinette | Not able to fetch file`, e)
  });
  if(res) {
    const blob = await res.blob()
    const file = new File([blob], "temp.png", { type: blob.type, lastModified: new Date() })
    console.log("downloaded")
    moulinette.curFile = file
  }

  $(".asset").on('dragstart', function(e) {
    console.log(e.originalEvent)
    e.originalEvent.dataTransfer = new DataTransfer();
    e.originalEvent.dataTransfer.items.add(moulinette.curFile); // File object representing image being dropped
    e.dataTransfer = e.originalEvent.dataTransfer
    console.log(e)
    //evt.dataTransfer.data("DownloadURL",fileDetails); // so this produces error
  });

  $(".asset").on('click', function(e) {
    console.log("HERE")
  });


  $(".action").click(async function(e) {
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
  });
});
