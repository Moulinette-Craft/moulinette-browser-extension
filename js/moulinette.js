
$( document ).ready(async function() {

  // for some reasons, the moulinette part is getting added sometimes after the ready
  setTimeout(function() {

    const moulinette = { tab: "search" }
    const NO_RESULT = `<div class="mtteWarning">No result. Try with other search terms.</div>`

    /**
     * Bring focus to search field
     */
    $("#mtteSearch").focus()

    /**
     * Clears the UI
     */
    function moulinettePreviewClear() {
      $("#moulinette-preview .mtteTitle").html("Loading ...")
      $("#moulinette-preview .mtteImgPreview").attr("src", MoulinetteSearch.THUMB_DEFAULT);
      $("#moulinette-preview .mtteInfo").hide()
    }

    /**
     * Utility function to preview an image
     *  - if id is provided => searched
     *  - otherwise => browsed
     */
    async function moulinettePreview(id, creatorId, packId, assetPath) {
      // clear UI
      moulinettePreviewClear()
      $("#moulinette-preview").show()

      // load data
      const patreon = new MoulinettePatreon()
      const user = await patreon.getPatronUser()
      const client = await MoulinetteSearch.getUniqueInstance()

      title   = "???"
      creator = "???"
      pack    = "???"
      tiers   = "???"
      url     = ""

      if(id) {
        const doc = await client.getDocument(id)
        if(doc) {
          const data = await client.getPackDetails(doc.publisher, doc.pack)
          url = await client.getImageURL(id)
          $("#moulinette-preview .mtteImgPreview").css("width", url ? "300" : "100");
          $("#moulinette-preview .mtteImgPreview").css("height", url ? "300" : "100");
          if(!url) {
            url = `${MoulinetteSearch.THUMB_BASEURL}/${doc.base}/${doc.path}_thumb.webp`
          }
          const patreonURL = data ? data.publisherUrl : null
          tiers = data ? data.tiers.map(t => t.title) : null
          if(doc.perm.includes(0)) {
            tiers = ["- (Free)"]
          }

          title = doc.name.split("/").pop()
          creator = patreonURL ? `<a href="${data.publisherUrl}" target="_blank">${doc.publisher}</a>` : doc.publisher
          pack = doc.pack
          tiers = tiers ? tiers.join(", ") : "???"
        }
      }
      else {
        $("#moulinette-preview .mtteImgPreview").css("width", "300");
        $("#moulinette-preview .mtteImgPreview").css("height", "300");
        // retrieve pack
        const bCreator = moulinette.assets[creatorId]
        const bPack = bCreator.packs.find(p => p.id == packId)
        url = `${bPack.path}/${assetPath}?${bPack.sas ? bPack.sas : ""}`
        title = assetPath.split("/").pop()
        creator = creatorId
        pack = bPack.name
        tiers = null
      }

      $("#moulinette-preview .mtteImgPreview").attr("src",url);
      // update image sizes
      $("#moulinette-preview .mtteImgPreview").on("load", function() {
        const image = document.querySelector("#moulinette-preview .mtteImgPreview");
        $("#moulinette-preview .mtteSize").html(`${image.naturalWidth} x ${image.naturalHeight}`)
      })

      $("#moulinette-preview .mtteTitle").html(title)
      $("#moulinette-preview .mtteCreator").html(creator)
      $("#moulinette-preview .mttePack").html(pack)
      $("#moulinette-preview .mtteTiers").html(tiers)
      $("#moulinette-preview .mtteInfo").show()
      if(tiers) {
        $(".mtteAvailability").show()
      } else {
        $(".mtteAvailability").hide()
      }
    }

    /**
     * Utility function for moulinette search
     */
    async function moulinetteSearch(terms, page = 1, allCreators = false) {
      const patreon = new MoulinettePatreon()
      const user = await patreon.getPatronUser()
      const client = await MoulinetteSearch.getUniqueInstance()
      if(terms && terms.length >= 3) {
        const results = await client.search(terms, page, allCreators ? null : user.pledges)
        // exception handling
        if(typeof results === 'string' || results instanceof String) {
          $("#mtteAssets").html(`<div class="mtteWarning">${results}</div>`);
          return;
        }
        let resultsHTML = ""
        moulinette.meta = results.meta
        results.results.forEach(r => {
          resultsHTML += `<div class="tileres draggable" title="${r.name}" data-id="${r.id}"><img src="${r.url}"/></div>`
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
     * Utility function for moulinette browse
     */
    async function moulinetteFilter(terms, creator) {
      const creators = MoulinetteSearch.filterAssets(moulinette.assets, creator, terms)

      // list assets
      let resultsHTML = ""
      Object.keys(creators).sort().forEach(c => {
        creators[c].packs.forEach(p => {
          resultsHTML += `<div class="tilefolder" data-creator="${c}" data-pack="${p.id}">${creator.length > 0 ? p.name : `<b>${c}</b> : ${p.name}`} (${p.assets.length})</div>`
        })
      })

      $("#mtteAssets").html(resultsHTML.length > 0 ? resultsHTML : NO_RESULT)

      // update counts
      let count = 0
      Object.keys(creators).forEach(c => count += creators[c].count)
      $('#mtteStats').html(`${count} results`)

      /* Expand folder */
      $("#mtteAssets .tilefolder").click(e => {
        const creator = $(e.currentTarget).data('creator')
        const pack = parseInt($(e.currentTarget).data('pack'))

        // data already loaded => toggle visibility
        if(e.currentTarget.classList.contains("mtteLoaded")) {
          return $(`#mtteAssets .tileres.p${pack}`).toggle();
        }
        // load data
        if(creators[creator]) {
          const selPack = creators[creator].packs.filter(p => p.id === pack)
          if(selPack) {
            let html = ""
            selPack[0].assets.forEach(a => {
              const imageURL = `${selPack[0].path}/${a.replace(".webp", "_thumb.webp")}?${selPack[0].sas ? selPack[0].sas : ""}`
              html += `<div class="tileres draggable p${selPack[0].id}" title="${a}"><img src="${imageURL}"/></div>`
            })
            $(e.currentTarget).after(html)

            // listener : dragging the image
            $(".tileres").off()
            $(".tileres").on('dragstart', function(ev) {
              changeDropZoneVisibility(true)
              const folder = $(ev.currentTarget).prevAll(".tilefolder:first");
              const assetPath = $(ev.currentTarget).attr("title")
              const bCreator = moulinette.assets[folder.data("creator")]
              const bPack = bCreator.packs.find(p => p.id == folder.data("pack"))

              ev.originalEvent.dataTransfer.setData("Moulinette", JSON.stringify({
                url: `${bPack.path}/${assetPath}?${bPack.sas ? bPack.sas : ""}`
              }));
            });

            // listener : click => preview
            $('.tileres').click(async function(ev) {
              const folder = $(ev.currentTarget).prevAll(".tilefolder:first");
              const asset = $(ev.currentTarget).attr("title")
              moulinettePreview(null, folder.data("creator"), folder.data("pack"), asset)
            });
          }
        }
        $(e.currentTarget).addClass('mtteLoaded')
      })
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
     * Trigger search when checkbox is clicked
     */
    $("#mtteAll").change(function(ev) {
      moulinetteSearch($("#mtteSearch").val(), 1, $("#mtteAll").prop('checked'))
    })

    /**
     * Execute search
     */
    $("#mtteSearch").keyup(async function(e) {
      if(e.keyCode == 13) {
        if(moulinette.tab === "search") {
          moulinetteSearch($("#mtteSearch").val(), 1, $("#mtteAll").prop('checked'))
        } else if(moulinette.tab === "browse") {
          moulinetteFilter($("#mtteSearch").val(), $('#mtteCreators').find(":selected").val())
        }
      }
    });

    /**
     * Switch tab
     */
    $("#mtteTabs span").click(async function(e) {
      if(e.currentTarget.classList.contains("active")) {
        return
      } else if(e.currentTarget.classList.contains("mtteBrowse")) {
        moulinette.tab = "browse"
        // adapt UI
        $(".mtteAll").hide()                              // hide "All creators" checkbox (for search)
        $("#mtteSearch").addClass("small")                // make search bar smaller
        $("#mtteCreators").css("display", "inline-block") // show filters (list of creators)
        $("#mtteCreators").html("<option>Loading...</option>")
        const client = await MoulinetteSearch.getUniqueInstance()
        if(!moulinette.assets) {
          console.log("Moulinette | Downloading asset list from server...")
          moulinette.assets = await client.getAssetsByCreator()
        }
        // update list of filters
        const creators = Object.keys(moulinette.assets)
        const options = creators.map(c => `<option value="${c}">${c}</option>`)
        $("#mtteCreators").html("<option value=\"\">-- All creators --</option>" + options)
        moulinetteFilter($("#mtteSearch").val(), $('#mtteCreators').find(":selected").val())


      } else if(e.currentTarget.classList.contains("mtteSearch")) {
        moulinette.tab = "search"
        // adapt UI
        $("#mtteCreators").hide()             // hide filters (list of creators)
        $("#mtteSearch").removeClass("small") // make search bar default size
        $(".mtteAll").show()                  // show "All creators" checkbox (for search)
        $("#mtteAssets").html("")
        moulinetteSearch($("#mtteSearch").val(), 1, $("#mtteAll").prop('checked'))
      }

      // highlight tab
      $("#mtteTabs span.active").removeClass("active")
      $(e.currentTarget).addClass("active")
    })

    /**
     * Scroll event
     */
    $("#mtteAssets").scroll(async function(event) {
      if(moulinette.tab == "browse") return;
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

    /**
     * User selected a creator in the filter (combo-box)
     */
    $("#mtteCreators").change(function() {
      moulinetteFilter($("#mtteSearch").val(), $('#mtteCreators').find(":selected").val())
    })

    /**
     * User closes the preview window
     */
    $("#moulinette-preview button").click(e => $("#moulinette-preview").hide() )

    /**
     * Moulinette Drag & Drop events
     */
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
        const file = data.url ? await client.downloadImage(data.url) : await client.downloadImageByIdName(data.id, data.name)
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
        } else {
          moulinettePreview(data.id)
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
        const url = data.url ? data.url : await client.getImageURL(data.id)
        if(url) {
          location.href = url
        } else if(data.id) {
          moulinettePreview(data.id)
        }
      }
      return false
    })

  }, 500);
});
