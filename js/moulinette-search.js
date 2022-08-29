class MoulinetteSearch {

  static SERVER_URL = "https://assets.moulinette.cloud"
  static ELASTIC_ENDPOINT = "https://moulinette.ent.westus2.azure.elastic-cloud.com"
  static ELASTIC_ENGINE = "moulinette"
  static THUMB_BASEURL = "https://mttethumbs.nyc3.digitaloceanspaces.com"

  static MAX_ASSETS = 100


  constructor(sessionId) {
    this.sessionId = sessionId ? sessionId : "anonymous"
  }

  /**
   * Initializes Moulinette by creating an ElasticSearch client
   */
  async init() {
    let searchKey = await chrome.storage.local.get("searchKey")
    if(!searchKey || !searchKey.searchKey) {
      console.log("MoulinetteSearch | Retrieving search key from Moulinette Server")
      let results = await fetch(`${MoulinetteSearch.SERVER_URL}/search/keys/${this.sessionId}`).catch(function(e) {
        console.log(`MoulinetteSearch | Something went wrong while fetching search keys from the server`)
        console.warn(e)
        return {}
      })

      if(results) {
        results = await results.json()
        if(results.search && results.search.length > 0) {
          searchKey = results.search
          await chrome.storage.local.set({ searchKey: searchKey})
        }
      }
    }
    else {
      searchKey = searchKey.searchKey
    }

    if(searchKey) {
      this.elastic = window.ElasticAppSearch.createClient({
        endpointBase: MoulinetteSearch.ELASTIC_ENDPOINT,
        searchKey: searchKey,
        engineName: MoulinetteSearch.ELASTIC_ENGINE,
        cacheResponses: false
      })
      console.log("MoulinetteSearch | Search engine initialized!")
    } else {
      console.warn(`MoulinetteSearch | You are not authorized to use this function. Make sure your Patreon account is linked to Moulinette.`)
    }
  }

  /**
   * Executes a search and returns the results
   */
  async search(terms) {
    if(this.pending) {
      return console.warn("MoulinetteSearch | Moulinette already searching ... please wait!")
    }
    this.pending = true

    // prepare filters
    // - only tiles/images
    const optionsFilters = {
      all: ({category: "image"})
    }

    const elasticOptions = {
      page: { size: MoulinetteSearch.MAX_ASSETS, current: 1 },
      //facets: facets,
      filters:  optionsFilters
    }

    const resultList = await this.elastic.search(terms, elasticOptions)
    console.log(resultList.rawInfo.meta.page)
    this.pending = false


    const results = []
    for(const r of resultList.results) {
      if(r.getRaw("category") == "image") {
        results.push({
          id: r.getRaw("id"),
          name: r.getRaw("name"),
          url: `${MoulinetteSearch.THUMB_BASEURL}/${r.getRaw("base")}/${r.getRaw("path")}_thumb.webp`
        })
      }
    }

    return results;
  }


  async getAssets() {
    let res = await fetch(`${MoulinetteSearch.SERVER_URL}/assets/${this.sessionId}`).catch(function(e) {
      console.error(`Moulinette | Not able to fetch assets from Moulinette servers`, e)
    });
    return await res.json()
  }
}
