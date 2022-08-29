
$( document ).ready(async function() {

  /**
   * Initialize search engine
   */
  const client = new MoulinetteSearch("huymc4d3he9r8t25nl0ldnimza");
  await client.init()

  /**
   * Bring focus to search field
   */
  $("#mtteSearch").focus()

  /**
   * Execute search
   */
  $("#mtteSearch").keyup(async function(e) {
    if(e.keyCode == 13) {
      const terms = $("#mtteSearch").val()
      if(terms && terms.length >= 3) {
        const results = await client.search(terms)
        let resultsHTML = ""
        results.forEach(r => {
          resultsHTML += `<div class="tileres draggable" title="${r.name}" data-id="${r.id}"><img width="70" height="70" src="${r.url}"/></div>`
        })
        $("#mtteAssets").html(resultsHTML)

        // add listeners
        $(".tileres").on('dragstart', function(ev) {
          $("#moulinette-drop").show()
          const asset = $(ev.currentTarget)
          ev.originalEvent.dataTransfer.setData("Moulinette", JSON.stringify({
            id: asset.data("id"),
            url: asset.find("img").attr("src"),
            name: asset.attr("title")
          }));
        });
      }
    }
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

  $("#moulinette-drop").on("drop", async function(e) {
    $("#moulinette-drop").hide()
    let data = e.originalEvent.dataTransfer.getData("Moulinette");
    if(data) {
      data = JSON.parse(data)
      let res = await fetch(data.url).catch(function(e) {
        console.log(`Moulinette | Not able to download image`, e)
      });
      if(res) {
        const blob = await res.blob()
        const file = new File([blob], data.name, { type: blob.type, lastModified: new Date() })

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
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
    }
  });

  $("#moulinette-drop").click(function(e) {
    $("#moulinette-drop").hide()
  })
});
