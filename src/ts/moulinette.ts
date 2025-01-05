import "./moulinette-init"

import { MoulinetteSearch } from "./moulinette-search";

declare var chrome: any;
declare var browser: any;

/**
 * Request for toggling right panel
 */
(typeof browser !== "undefined" ? browser : chrome).runtime.onMessage.addListener((request : any) => {
  if(request.action === "togglePanel") {
    console.log("Moulinette | Toggling Moulinette panel")
    const panel = document.getElementById("moulinette-panel")
    if(panel) {
      panel.style.display = (panel.style.display == 'none') ? 'block' : 'none';
      document.getElementById("mtteSearch")?.focus()
    }
  }
  return Promise.resolve({ response: "Done" });
});

export interface MoulinetteState {
  tab: string,
  previews: { [key: string]: string },
  assetsCount: number,
  curPage: number,
  ignoreScroll?: boolean
}


$(async function() {
  // for some reasons, the moulinette part is getting added sometimes after the ready
  setTimeout(function() {
    console.log("Moulinette | Initializing Moulinette panel")

    const moulinetteState : MoulinetteState = { tab: "search", previews: {}, assetsCount: 0, curPage: 0, ignoreScroll: false }
    
    /**
     * Bring focus to search field
     */
    $("#mtteSearch").trigger("focus")

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
    async function moulinettePreview(id : string, previewUrl : string) {
      // clear UI
      moulinettePreviewClear()
      $("#moulinette-preview").show()

      // load data
      const client = await MoulinetteSearch.getUniqueInstance()
      
      let title   = "???"
      let creator = "???"
      let pack    = "???"
      let tiers   = "???"
      let url : string | null = ""

      if(id) {
        
        const asset = await client.getAssetDetails(id)
        console.log(asset)
        if(asset) {
          url = null
          $("#moulinette-preview .mtteImgPreview").css("width", url ? "300" : "100");
          $("#moulinette-preview .mtteImgPreview").css("height", url ? "300" : "100");
          if(!url) {
            url = previewUrl
          }
          let tierList = asset.perms ? asset.perms.map((t) => t.title) : null
          if(asset.perms?.find((t) => t.id == "0")) {
            tierList = ["- (Free)"]
          }

          title = asset.name
          creator = `<a href="${asset.creatorUrl}" target="_blank">${asset.creator || "Unkown"}</a>`
          pack = asset.pack || "Unkown"
          if(tierList) {
            tiers = "<ul>"
            for(const t of tierList) {
              tiers += `<li>${t}</li>`
            }
            tiers += "</ul>"
          }
        }
      }

      $("#moulinette-preview .mtteImgPreview").attr("src",url);
      // update image sizes
      $("#moulinette-preview .mtteImgPreview").on("load", function() {
        const image = document.querySelector("#moulinette-preview .mtteImgPreview") as HTMLImageElement;
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
    async function moulinetteSearch(terms : string, page = 0, allCreators = false) {
      const client = await MoulinetteSearch.getUniqueInstance()
      if(terms && terms.length >= 3 && page >= 0) {
        const results = await client.searchAssets(terms, page, allCreators)
        // exception handling
        if(!results) {
          return;
        }
        // update current page according to results        
        moulinetteState.curPage = results.length == 0 || results.length < MoulinetteSearch.MAX_ASSETS ? -1 : page

        if(results.length == 0 && page == 0) {    
          $("#mtteAssets").html(`<div class="mtteWarning">No result. ${allCreators ? "" : "Check \"all\" to see assets from all creators."}</div>`)
          return
        }

        let resultsHTML = ""
        results.forEach((r) => {
          resultsHTML += `<div class="mtteAsset" title="${r.name}" data-id="${r.id}" draggable="true" style="background-image: url('${r.previewUrl ? r.previewUrl.replace(/'/g, "\\'") : ""}')"></div>`
        })
        if(page == 0) {
          $("#mtteAssets").html(resultsHTML)
          moulinetteState.assetsCount = results.length
          moulinetteState.previews = {}
        } else {
          $("#mtteAssets").append(resultsHTML)
          moulinetteState.assetsCount += results.length
        }
        for(const r of results) {
          moulinetteState.previews[r.id] = r.previewUrl ? r.previewUrl : ""
        }

        // listener : dragging the image
        $(".mtteAsset").off()
        $(".mtteAsset").on('dragstart', function(ev) {
          changeDropZoneVisibility(true)
          const asset = $(ev.currentTarget)
          ev.originalEvent?.dataTransfer?.setData("Moulinette", JSON.stringify({
            id: asset.data("id"),
            name: asset?.attr("title")?.split("/").pop()
          }));
        });

        // listener : click => preview
        $('.mtteAsset').on("click", async function(ev) {
          const asset = $(ev.currentTarget)
          moulinettePreview(asset.data("id"), moulinetteState.previews[asset.data("id")])
        });

        // block default browser context menu
        $('.mtteAsset').on("contextmenu", function() {
          return false;
        });

        $('.mtteAsset').on("mousedown", async function(ev) {
          if (ev.which === 3) {
            ev.preventDefault()
            ev.stopPropagation();
            const asset = $(ev.currentTarget)
            const client = await MoulinetteSearch.getUniqueInstance()
            const assetId = asset.data("id")
            const assetFile = await client.downloadImageByIdName(assetId, asset.attr("title")!.split("/").pop()!)
            if(!assetFile) {
              moulinettePreview(assetId,  moulinetteState.previews[assetId])
            } else {
              // dynamically generates a download
              const fileURL = URL.createObjectURL(assetFile);
              const link = document.createElement('a');
              link.href = fileURL;
              link.download = assetFile.name;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(fileURL);
            }
          }
        });

        // update counts
        $('#mtteStats').html(`1-${moulinetteState.assetsCount} results`)
      }
    }

    /**
     * Utility function for moulinette browse
     */
    async function moulinetteFilter(terms : string, creator : string) {
      terms; creator;
      /*
      const creators = MoulinetteSearch.filterAssets(moulinetteState.assets, creator, terms)

      // list assets
      let resultsHTML = ""
      Object.keys(creators).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).forEach(c => {
        creators[c].packs.forEach((p : any) => {
          resultsHTML += `<div class="tilefolder" data-creator="${c}" data-pack="${p.id}">${creator.length > 0 ? p.name : `<b>${c}</b> : ${p.name}`} (${p.assets.length})</div>`
        })
      })

      $("#mtteAssets").html(resultsHTML.length > 0 ? resultsHTML : NO_RESULT)

      // update counts
      let count = 0
      Object.keys(creators).forEach(c => count += creators[c].count)
      $('#mtteStats').html(`${count} results`)

      /* Expand folder 
      $("#mtteAssets .tilefolder").on("click", e => {
        const creator = $(e.currentTarget).data('creator')
        const pack = parseInt($(e.currentTarget).data('pack'))

        // data already loaded => toggle visibility
        if(e.currentTarget.classList.contains("mtteLoaded")) {
          $(`#mtteAssets .mtteAsset.p${pack}`).toggle();
          return;
        }
        // load data
        if(creators[creator]) {
          const selPack = creators[creator].packs.filter((p:any) => p.id === pack)
          if(selPack) {
            let html = ""
            selPack[0].assets.forEach((a:any) => {
              const imageURL = `${selPack[0].path}/${a.replace(".webp", "_thumb.webp")}?${selPack[0].sas ? selPack[0].sas : ""}`
              html += `<div class="mtteAsset p${selPack[0].id}" title="${a}" draggable="true" style="background-image: url('${imageURL}')"></div>`
            })
            $(e.currentTarget).after(html)

            // listener : dragging the image
            $(".mtteAsset").off()
            $(".mtteAsset").on('dragstart', function(ev) {
              changeDropZoneVisibility(true)
              const folder = $(ev.currentTarget).prevAll(".tilefolder:first");
              const assetPath = $(ev.currentTarget).attr("title")
              const bCreator = moulinetteState.assets[folder.data("creator")]
              const bPack = bCreator.packs.find((p:any) => p.id == folder.data("pack"))

              ev.originalEvent?.dataTransfer?.setData("Moulinette", JSON.stringify({
                url: `${bPack.path}/${assetPath}?${bPack.sas ? bPack.sas : ""}`,
                name: $(ev.currentTarget).attr("title")?.split("/").pop()
              }));
            });

            // listener : click => preview
            $('.mtteAsset').on("click", async function(ev) {
              const folder = $(ev.currentTarget).prevAll(".tilefolder:first");
              const asset = $(ev.currentTarget).attr("title") as string
              moulinettePreview(null, folder.data("creator"), folder.data("pack"), asset)
            });

            $('.mtteAsset').on("mousedown", async function(ev) {
              if (ev.which === 3) {
                const folder = $(ev.currentTarget).prevAll(".tilefolder:first");
                const assetPath = $(ev.currentTarget).attr("title")
                const bCreator = moulinetteState.assets[folder.data("creator")]
                const bPack = bCreator.packs.find((p:any) => p.id == folder.data("pack"))
                location.href = `${bPack.path}/${assetPath}?${bPack.sas ? bPack.sas : ""}`
              }
            });
          }
        }
        $(e.currentTarget).addClass('mtteLoaded')
      })
        */
    }


    /**
     * Utility function to show/hide drop zone
     */
    function changeDropZoneVisibility(show = true) {
      if(show) {
        $("#moulinette-drop").show()
      } else {
        $("#moulinette-drop").hide()
      }
    }

    /**
     * Trigger search when checkbox is clicked
     */
    $("#mtteAll").on("change", async function() {
      const checked = $("#mtteAll").prop('checked')
      await (typeof browser !== "undefined" ? browser : chrome).storage.local.set({"allAssets": checked})
      moulinetteSearch($("#mtteSearch").val() as string, 0, checked)
    })

    /**
     * Execute search
     */
    $("#mtteSearch").on("keyup", async function(e) {
      if(e.code == 'Enter') {
        $("#mtteAssets").scrollTop(0);
        if(moulinetteState.tab === "search") {
          moulinetteSearch($("#mtteSearch").val() as string, 0, $("#mtteAll").prop('checked'))
        } else if(moulinetteState.tab === "browse") {
          moulinetteFilter($("#mtteSearch").val() as string, $('#mtteCreators').find(":selected").val() as string)
        }
      }
    });

    /**
     * Switch tab
     */
    $("#mtteTabs span").on("click", async function(e) {
      if(e.currentTarget.classList.contains("active")) {
        return
      } else if(e.currentTarget.classList.contains("mtteBrowse")) {
        moulinetteState.tab = "browse"
        // adapt UI
        $(".mtteAll").hide()                              // hide "All creators" checkbox (for search)
        $("#mtteSearch").addClass("small")                // make search bar smaller
        $("#mtteCreators").css("display", "inline-block") // show filters (list of creators)
        $("#mtteCreators").html("<option>Loading...</option>")
        const client = await MoulinetteSearch.getUniqueInstance()
        client;
        /*
        if(!moulinetteState.assets) {
          console.log("Moulinette | Downloading asset list from server...")
          //moulinetteState.assets = await client.getAssetsByCreator()
        }
        // update list of filters
        const creators = Object.keys(moulinetteState.assets).sort(function (a, b) {
          return a.toLowerCase().localeCompare(b.toLowerCase());
        });
        const options = creators.map(c => `<option value="${c}">${c}</option>`)
        $("#mtteCreators").html("<option value=\"\">-- All creators --</option>" + options)
        */
        moulinetteFilter($("#mtteSearch").val() as string, $('#mtteCreators').find(":selected").val() as string)


      } else if(e.currentTarget.classList.contains("mtteSearch")) {
        moulinetteState.tab = "search"
        // adapt UI
        $("#mtteCreators").hide()             // hide filters (list of creators)
        $("#mtteSearch").removeClass("small") // make search bar default size
        $(".mtteAll").show()                  // show "All creators" checkbox (for search)
        $("#mtteAssets").html("")
        moulinetteSearch($("#mtteSearch").val() as string, 0, $("#mtteAll").prop('checked'))
      }

      // highlight tab
      $("#mtteTabs span.active").removeClass("active")
      $(e.currentTarget).addClass("active")
    })

    /**
     * Scroll event
     */
    $("#mtteAssets").on("scroll", async function(event) {
      if(moulinetteState.tab == "browse") return;
      if(moulinetteState.ignoreScroll) return;
      const bottom = $(event.currentTarget).prop("scrollHeight") - ($(event.currentTarget).scrollTop() || 0)
      const height = $(event.currentTarget).height() || 0;
      //if(!this.searchResults) return;
      if(bottom - 20 < height) {
        if(moulinetteState.curPage >= 0) {
          moulinetteState.ignoreScroll = true // avoid multiple events to occur while scrolling
          await moulinetteSearch($("#mtteSearch").val() as string, moulinetteState.curPage+1, $("#mtteAll").prop('checked'))
          moulinetteState.ignoreScroll = false
        }
      }
    });

    /**
     * User selected a creator in the filter (combo-box)
     */
    $("#mtteCreators").on("change", function() {
      moulinetteFilter($("#mtteSearch").val() as string, $('#mtteCreators').find(":selected").val() as string)
    })

    /**
     * User closes the preview window
     */
    $("#moulinette-preview button").on("click", () => $("#moulinette-preview").hide() )

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
      let data = e.originalEvent?.dataTransfer?.getData("Moulinette");
      if(data) {
        let jsonData = JSON.parse(data) as any
        console.log(jsonData)
        // download the image from server
        const filename = jsonData.name + (jsonData.name.endsWith(".webp") ? "" : ".webp")
        const file = await client.downloadImageByIdName(jsonData.id, filename)
        if(file) {
          const dataTransfer = typeof browser !== "undefined" ? new (window as any).wrappedJSObject.DataTransfer() : new DataTransfer();
          dataTransfer.items.add(file);
          const event = new DragEvent('drop', {
            dataTransfer: dataTransfer,
            clientX: e.originalEvent?.clientX,
            clientY: e.originalEvent?.clientY
          });

          // dispatch events
          let cur = document.elementFromPoint(e.originalEvent!.clientX, e.originalEvent!.clientY)
          while(cur) {
            cur.dispatchEvent(event);
            cur = cur.parentElement
          }
        } else {
          if(jsonData.id) {
            moulinettePreview(jsonData.id,  moulinetteState.previews[jsonData.id])
          }
        }

      }
    });

    $("#moulinette-drop").on("click", () => {
      changeDropZoneVisibility(false)
    })

    $("#moulinette-panel .mtteActions").on('drop', async function(ev) {
      changeDropZoneVisibility(false)
      const client = await MoulinetteSearch.getUniqueInstance()
      client;
      let data = ev.originalEvent?.dataTransfer?.getData("Moulinette");
      if(data) {
        let jsonData = JSON.parse(data)
        const assetFile = await client.downloadImageByIdName(jsonData.id, jsonData.name)
        if(!assetFile) {
          moulinettePreview(jsonData.id,  moulinetteState.previews[jsonData.id])
        } else {
          // dynamically generates a download
          const fileURL = URL.createObjectURL(assetFile);
          const link = document.createElement('a');
          link.href = fileURL;
          link.download = assetFile.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(fileURL);
        }
      }
      return false
    })

    let isResizing = false;
    const moulinettePanel = $('#moulinette-panel')

    $("#moulinette-panel .resize-handle").on('mousedown', (ev) => {
      ev.preventDefault(); 
      isResizing = true;
    })

    document.addEventListener('mousemove', (ev) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - ev.clientX;
      if(newWidth > 400) {
        moulinettePanel.css('width', `${newWidth}px`);
      }
    })

    document.addEventListener('mouseup', () => {
      isResizing = false;
    });

    // initialize checkbox based on last session
    (typeof browser !== "undefined" ? browser : chrome).storage.local.get("allAssets").then((data: any) => {
      if(data && data.allAssets) {
        $("#mtteAll").prop('checked', data.allAssets)
      }
    })

  }, 500);

});

