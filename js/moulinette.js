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
    $("#moulinette-drop").show()
    //console.log(e.originalEvent)
    //e.originalEvent.dataTransfer.setData()

    //e.originalEvent.dataTransfer = new DataTransfer();
    /*
    e.originalEvent.dataTransfer.items.add(moulinette.curFile); // File object representing image being dropped

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(moulinette.curFile); // File object representing image being dropped
    dataTransfer.setData("text/plain", JSON.stringify({type: "moulinette"}));
    console.log(dataTransfer)
    e.originalEvent.dataTransfer = dataTransfer
    */
    e.originalEvent.dataTransfer.setData("Moulinette", JSON.stringify({}));

    //e.dataTransfer = e.originalEvent.dataTransfer
    //evt.dataTransfer.data("DownloadURL",fileDetails); // so this produces error
  });



  $(".action").click(async function(e) {

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(moulinette.curFile);

    const event = new DragEvent('drop', {
      dataTransfer: dataTransfer,
      clientX: 1017,
      clientY: 523
    });

    /*
    console.log(event)
    console.log()
    let cur = document.elementFromPoint(150, 60)
    while(cur) {
      const res = cur.dispatchEvent(event);
      console.log(cur, res)
      cur = cur.parentElement
    }*/

  });

  $("#moulinette-drop").on('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
  })

  $("#moulinette-drop").on('dragenter', function(e) {
    e.preventDefault();
    e.stopPropagation();
  })

  $("#moulinette-drop").on("drop", function(e) {
    $("#moulinette-drop").hide()
    const data = e.originalEvent.dataTransfer.getData("Moulinette");
    if(data) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(moulinette.curFile);
      const event = new DragEvent('drop', {
        dataTransfer: dataTransfer,
        clientX: e.originalEvent.clientX,
        clientY: e.originalEvent.clientY
      });
      // dispatch events
      let cur = document.elementFromPoint(e.originalEvent.screenX, e.originalEvent.screenY)
      while(cur) {
        const res = cur.dispatchEvent(event);
        cur = cur.parentElement
      }
    }
  });

  $("#moulinette-drop").click(function(e) {
    $("#moulinette-drop").hide()
  })

});
