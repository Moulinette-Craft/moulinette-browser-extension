import "./moulinette-init"

import { MouCollectionAssetTypeEnum, MoulinetteSearch } from "./moulinette-search";
import MouMediaUtils from "./utils/media-utils";

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
  previews: { [key: string]: string },
  assetsCount: number,
  curPage: number,
  ignoreScroll?: boolean
}


$(async function() {
  // for some reasons, the moulinette part is getting added sometimes after the ready
  setTimeout(function() {
    console.log("Moulinette | Initializing Moulinette panel")

    const moulinetteState : MoulinetteState = { 
      previews: {}, 
      assetsCount: 0, 
      curPage: 0, 
      ignoreScroll: false,
    }

    let previewTimeout: ReturnType<typeof setTimeout>
    const previewSound: HTMLAudioElement = new Audio()
    
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
      let url : string | null = null

      if(id) {
        
        const asset = await client.getAssetDetails(id)
        console.log(asset)
        if(asset) {
          $("#moulinette-preview .mtteImgPreview").css("width", url ? "300" : "100");
          $("#moulinette-preview .mtteImgPreview").css("height", url ? "300" : "100");
          if(!url && asset.type != MouCollectionAssetTypeEnum.Audio) {
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

      if(url) {
        $("#moulinette-preview .mtteImgPreview").attr("src",url);
      }
      
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
     * Utility function to reload list of creators
     */
    async function updateCreators() {
      $("#mttePacks").hide()
      $("#mttePacks").val("");
      const terms = $("#mtteSearch").val() as string
      const allAssets = $("#mtteAll").prop('checked')
      const client = await MoulinetteSearch.getUniqueInstance()
      const type = $("#mtteTypes").val() as string
      const creators = await client.getCreators(terms, type, allAssets)
      if(creators && creators.length > 0) {
        let creatorsHTML = '<option value="">↓↓ Filter by creator ↓↓</option>'
        for(const c of creators) {
          creatorsHTML += `<option value="${c.name}">${c.name} (${MouMediaUtils.prettyNumber(c.assets, true)})</option>`
        }
        $("#mtteCreators").html(creatorsHTML)
      }
    }

    /**
     * Utility function to reload list of packs
     */
    async function updatePacks() {
      $("#mttePacks").hide()
      $("#mttePacks").val("");
      const terms = $("#mtteSearch").val() as string
      const allAssets = $("#mtteAll").prop('checked')
      const client = await MoulinetteSearch.getUniqueInstance()
      const type = $("#mtteTypes").val() as string
      const creator = $("#mtteCreators").val() as string
      const packs = await client.getPacks(terms, type, creator, allAssets)
      if(packs && packs.length > 0) {
        // merge packs with same name
        let packsMerged: { [key: string]: { pack_ref: string[], assets: number } } = {}
        for(const p of packs) {
          if(p.name in packsMerged) {
            packsMerged[p.name]["pack_ref"].push(p.pack_ref)
            packsMerged[p.name]["assets"] += p.assets
          } else {
            packsMerged[p.name] = { pack_ref : [p.pack_ref], assets : p.assets }
          }
        }
        const packNames = Object.keys(packsMerged).sort((a, b) => a.localeCompare(b))
        let packsHTML = '<option value="">↓↓ Filter by pack ↓↓</option>'
        for(const p of packNames) {
          const pack = packsMerged[p]
          packsHTML += `<option value="${pack.pack_ref.join(";")}">${p} (${MouMediaUtils.prettyNumber(pack.assets, true)})</option>`
        }
        $("#mttePacks").html(packsHTML)
        $("#mttePacks").show()
      }
    }


    /**
     * Utility function for moulinette search
     */
    async function moulinetteSearch(page : number) {
      // retrieve search terms and filters
      const terms = $("#mtteSearch").val() as string
      const allAssets = $("#mtteAll").prop('checked')
      const type = $("#mtteTypes").val() as string
      const creator = $("#mtteCreators").val() as string
      const pack = $("#mttePacks").val() as string

      const client = await MoulinetteSearch.getUniqueInstance()
      if(page >= 0) {
        const results = await client.searchAssets({terms, type, creator, pack}, page, allAssets)
        
        // exception handling
        if(!results) {
          return;
        }
        // update current page according to results        
        moulinetteState.curPage = results.length == 0 || results.length < MoulinetteSearch.MAX_ASSETS ? -1 : page

        if(results.length == 0 && page == 0) {    
          $("#mtteAssets").html(`<div class="mtteWarning">No result. ${allAssets ? "" : "Check \"all\" to see assets from all creators."}</div>`)
          return
        }

        let resultsHTML = ""
        results.forEach((r) => {
          switch(r.type) {
            case MouCollectionAssetTypeEnum.Audio: 
              const duration = r.meta.find((m) => m.id == "duration")?.text || ""
              const hasPreview = r.meta.find((m) => m.id == "preview")?.text || ""
              resultsHTML += `<div class="mtteAsset sound" data-id="${r.id}" data-preview="${r.previewUrl ? r.previewUrl : ''}" draggable="true">` +
                `<div class="title">🎵 ${r.name} ${hasPreview}</div><div class="meta">${duration}</div></div>`
              break;
            case MouCollectionAssetTypeEnum.Image:
            case MouCollectionAssetTypeEnum.Map:
              resultsHTML += `<div class="mtteAsset" title="${r.name}" data-id="${r.id}" draggable="true" style="background-image: url('${r.previewUrl ? r.previewUrl.replace(/'/g, "\\'") : ""}')"></div>`
          }
          
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
            const assetFile = await client.downloadAssetByIdName(assetId, asset.attr("title")!.split("/").pop()!)
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

        $(".mtteAsset.sound").on("mouseenter", function(ev) {
          previewTimeout = setTimeout(async function() {
            ev.preventDefault()
            ev.stopPropagation();
            const asset = $(ev.currentTarget)
            const client = await MoulinetteSearch.getUniqueInstance()
            let previewUrl = asset.data("preview")
            if(previewUrl.length == 0) {
              const data = await client.getAssetDetails(asset.data("id"))
              if(data && data.url && data.url.startsWith("https")) {
                previewUrl = data.url
              }
            }
            if(previewUrl) {
              previewSound.src = previewUrl
              previewSound.play();
            }
          }, 1000);
        })
        $(".mtteAsset.sound").on("mouseleave", function() {
          clearTimeout(previewTimeout)
          previewSound.pause()
          previewSound.src = ""
        })

        // update counts
        $('#mtteStats').html(`1-${moulinetteState.assetsCount} results`)
      }
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
      moulinetteSearch(0)
      updateCreators()
    })

    /**
     * Execute search
     */
    $("#mtteSearch").on("keyup", async function(e) {
      if(e.code == 'Enter') {
        $("#mtteAssets").scrollTop(0);
        moulinetteSearch(0)
        updateCreators()
      }
    });

    /**
     * Trigger search when checkbox is clicked
     */
    $("#mtteTypes").on("change", async function() {
      const type = $("#mtteTypes").val()
      await (typeof browser !== "undefined" ? browser : chrome).storage.local.set({"assetType": type})
      updateCreators()
      moulinetteSearch(0)
    })


    /**
     * Scroll event
     */
    $("#mtteAssets").on("scroll", async function(event) {
      if(moulinetteState.ignoreScroll) return;
      const bottom = $(event.currentTarget).prop("scrollHeight") - ($(event.currentTarget).scrollTop() || 0)
      const height = $(event.currentTarget).height() || 0;
      //if(!this.searchResults) return;
      if(bottom - 20 < height) {
        if(moulinetteState.curPage >= 0) {
          moulinetteState.ignoreScroll = true // avoid multiple events to occur while scrolling
          await moulinetteSearch(moulinetteState.curPage+1)
          moulinetteState.ignoreScroll = false
        }
      }
    });

    /**
     * User selected a creator/pack in the filter (combo-box)
     */
    $("#mtteCreators").on("change", function() {
      updatePacks()
      moulinetteSearch(0)
    })
    $("#mtteCreators").on("mousedown", function(ev) {
      if(ev.button == 2) {
        $("#mtteCreators").val("");
        updatePacks()
        moulinetteSearch(0)
      }
    })
    $('#mtteCreators').on("contextmenu", function() {
      return false;
    });
    $("#mttePacks").on("change", function() {
      moulinetteSearch(0)
    })
    $('#mttePacks').on("contextmenu", function() {
      return false;
    });
    $("#mttePacks").on("mousedown", function(ev) {
      if(ev.button == 2) {
        $("#mttePacks").val("");
        moulinetteSearch(0)
      }
    })
    // initial loading
    $("#mtteCreators").on("click", function() {
      const terms = $("#mtteSearch").val() as string
      const options = $("#mtteCreators").children("option").length;
      if(terms.length == 0 && options <= 1) {
        $("#mtteCreators").html("<option>Loading ...</options>")
        updateCreators()
      }
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
        const filename = jsonData.name
        const file = await client.downloadAssetByIdName(jsonData.id, filename)
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

    let isResizing = false;
    const moulinettePanel = $('#moulinette-panel')

    $("#moulinette-panel .resize-handle").on('mousedown', (ev) => {
      ev.preventDefault(); 
      isResizing = true;
    })

    document.addEventListener('mousemove', (ev) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - ev.clientX;
      if(newWidth >= 330) {
        moulinettePanel.css('width', `${newWidth}px`);
      }
    })

    document.addEventListener('mouseup', () => {
      isResizing = false;
    });

    // initialize based on last session
    (typeof browser !== "undefined" ? browser : chrome).storage.local.get("allAssets").then((data: any) => {
      if(data && data.allAssets) {
        $("#mtteAll").prop('checked', data.allAssets)
      }
    });
    (typeof browser !== "undefined" ? browser : chrome).storage.local.get("assetType").then((data: any) => {
      if(data && data.assetType) {
        $("#mtteTypes").val(data.assetType)
      }
    });

  }, 500);

});

