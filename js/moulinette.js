
$( document ).ready(async function() {

  // for some reasons, the moulinette part is getting added sometimes after the ready
  setTimeout(function() {

    /**
     * Bring focus to search field
     */
    $("#mtteSearch").focus()

    console.log($("#mtteSearch"))

    /**
     * Execute search
     */
    $("#mtteSearch").keyup(async function(e) {
      if(e.keyCode == 13) {
        const client = await MoulinetteSearch.getUniqueInstance()
        const terms = $("#mtteSearch").val()
        if(terms && terms.length >= 3) {
          const results = await client.search(terms)
          if(!results) return;
          let resultsHTML = ""
          results.forEach(r => {
            resultsHTML += `<div class="tileres draggable" title="${r.name}" data-id="${r.id}"><img width="70" height="70" src="${r.url}"/></div>`
          })
          $("#mtteAssets").html(resultsHTML)

          // listener : dragging the image
          $(".tileres").on('dragstart', function(ev) {
            $("#moulinette-drop").show()
            const asset = $(ev.currentTarget)
            ev.originalEvent.dataTransfer.setData("Moulinette", JSON.stringify({
              id: asset.data("id"),
              name: asset.attr("title")
            }));
          });

          // listener : right clicking => download
          $('.tileres').click(async function(ev) {
            const asset = $(ev.currentTarget)
            location.href = await client.getImageURL(asset.data("id"))
            return false
          });
        }
      }
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
      const client = await MoulinetteSearch.getUniqueInstance()
      let data = e.originalEvent.dataTransfer.getData("Moulinette");
      if(data) {
        data = JSON.parse(data)

        // download the image from server
        const file = await client.downloadImage(data.id, data.name)
        if(file) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          const event = new DragEvent('drop', {
            dataTransfer: dataTransfer,
            clientX: e.originalEvent.clientX,
            clientY: e.originalEvent.clientY
          });
          // dispatch events
          let cur = document.elementFromPoint(e.originalEvent.clientX, e.originalEvent.clientY)
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

  }, 500);
});
