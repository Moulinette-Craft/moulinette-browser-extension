
$( document ).ready(async function() {

  // for some reasons, the moulinette part is getting added sometimes after the ready
  setTimeout(function() {

    const moulinette = {}

    /**
     * Bring focus to search field
     */
    $("#mtteSearch").focus()

    /**
     * Utility function to preview an image
     */
    async function moulinettePreview(id) {
      const client = await MoulinetteSearch.getUniqueInstance()
      const doc = await client.getDocument(id)
      console.log(doc)
      if(doc) {
        const url = await client.getImageURL(id)
        const filename = doc.name.split("/").pop()
        $("#moulinette-preview .mtteImgPreview").attr("src",url);
        // update image sizes
        $("#moulinette-preview .mtteImgPreview").on("load", function() {
          const image = document.querySelector("#moulinette-preview .mtteImgPreview");
          $("#moulinette-preview .mtteSize").html(`${image.naturalWidth} x ${image.naturalHeight}`)
        })

        $("#moulinette-preview .mtteTitle").html(filename)
        $("#moulinette-preview .mtteCreator").html(doc.publisher)
        $("#moulinette-preview .mttePack").html(doc.pack)
      }
    }

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
          changeDropZoneVisibility(true)
          const asset = $(ev.currentTarget)
          ev.originalEvent.dataTransfer.setData("Moulinette", JSON.stringify({
            id: asset.data("id"),
            name: asset.attr("title")
          }));
        });

        // listener : click => preview
        $('.tileres').click(async function(ev) {
          const asset = $(ev.currentTarget)
          moulinettePreview(asset.data("id"))
        });

        // update counts
        const count = moulinette.meta.current == moulinette.meta.total_pages ? moulinette.meta.total_results : moulinette.meta.size * moulinette.meta.current
        $('#mtteStats').html(`1-${count} of ${moulinette.meta.total_results} results`)
      }
    }

    /**
     * Utility function to show/hide drop zone
     */
    function changeDropZoneVisibility(show = true) {
      if(show) {
        $("#moulinette-drop").show()
        $("#moulinette-panel .mtteActions").show()
      } else {
        $("#moulinette-drop").hide()
        $("#moulinette-panel .mtteActions").hide()
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
      changeDropZoneVisibility(false)
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
      changeDropZoneVisibility(false)
    })

    $("#moulinette-panel .mtteActions").on('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
    })

    $("#moulinette-panel .mtteActions").on('dragenter', function(e) {
      e.preventDefault();
      e.stopPropagation();
    })

    $("#moulinette-panel .mtteActions").on('drop', async function(ev) {
      changeDropZoneVisibility(false)
      const client = await MoulinetteSearch.getUniqueInstance()
      let data = ev.originalEvent.dataTransfer.getData("Moulinette");
      if(data) {
        data = JSON.parse(data)
        const url = await client.getImageURL(data.id)
        if(url) {
          location.href = url
        } else {
          console.error("Moulinette | Not able to get a URL for that image!")
        }
      }
      return false
    })

  }, 500);
});
