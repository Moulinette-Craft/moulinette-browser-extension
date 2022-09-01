
$( document ).ready(async function() {

  // for some reasons, the moulinette part is getting added sometimes after the ready
  setTimeout(function() {

    const moulinette = {}

    /**
     * Bring focus to search field
     */
    $("#mtteSearch").focus()

    /**
     * Utility function for moulinette search
     */
    async function moulinetteSearch(terms, page = 1) {
      const client = await MoulinetteSearch.getUniqueInstance()
      if(terms && terms.length >= 3) {
        const results = await client.search(terms, page)
        // exception handling
        if(typeof results === 'string' || results instanceof String) {
          $("#mtteAssets").html(`<div class="mtteWarning">${results}</div>`);
          return;
        }
        let resultsHTML = ""
        moulinette.meta = results.meta
        results.results.forEach(r => {
          resultsHTML += `<div class="tileres draggable" title="${r.name}" data-id="${r.id}"><img width="70" height="70" src="${r.url}"/></div>`
        })
        if(page == 1) {
          $("#mtteAssets").html(resultsHTML)
        } else {
          $("#mtteAssets").append(resultsHTML)
        }

        // listener : dragging the image
        $(".tileres").off()
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

        // update counts
        const count = moulinette.meta.current == moulinette.meta.total_pages ? moulinette.meta.total_results : moulinette.meta.size * moulinette.meta.current
        $('#mtteStats').html(`1-${count} of ${moulinette.meta.total_results} results`)
      }
    }

    /**
     * Execute search
     */
    $("#mtteSearch").keyup(async function(e) {
      if(e.keyCode == 13) {
        moulinetteSearch($("#mtteSearch").val(), 1)
      }
    });

    /**
    * Scroll event
    */
    $("#mtteAssets").scroll(async function(event) {
      if(moulinette.ignoreScroll) return;
      const bottom = $(event.currentTarget).prop("scrollHeight") - $(event.currentTarget).scrollTop()
      const height = $(event.currentTarget).height();
      //if(!this.searchResults) return;
      if(bottom - 20 < height) {
        if(moulinette.meta.current < moulinette.meta.total_pages) {
          moulinette.ignoreScroll = true // avoid multiple events to occur while scrolling
          await moulinetteSearch($("#mtteSearch").val(), moulinette.meta.current+1)
          moulinette.ignoreScroll = false
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
