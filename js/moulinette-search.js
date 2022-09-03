class MoulinetteSearch {

  static INSTANCE = null
  static SERVER_URL = "https://assets.moulinette.cloud"
  static ELASTIC_ENDPOINT = "https://moulinette.ent.westus2.azure.elastic-cloud.com"
  static ELASTIC_ENGINE = "moulinette"
  static THUMB_BASEURL = "https://mttethumbs.nyc3.cdn.digitaloceanspaces.com"
  static THUMB_DEFAULT = "https://assets.moulinette.cloud/static/images/moulinette-preview.png"

  static MAX_ASSETS = 100


  constructor(sessionId) {
    this.sessionId = sessionId ? sessionId : "anonymous"
  }

  /**
   * Returns the unique instance of the client (and creates it the first time)
   */
  static async getUniqueInstance() {
    if(!MoulinetteSearch.INSTANCE) {
      // retrieve user from server
      const patreon = new MoulinettePatreon()
      const sessionId = await patreon.getSessionId()
      // create new instance
      MoulinetteSearch.INSTANCE = new MoulinetteSearch(sessionId)
      await MoulinetteSearch.INSTANCE.init()
    }
    return MoulinetteSearch.INSTANCE
  }

  /**
   * Initializes Moulinette by creating an ElasticSearch client
   */
  async init() {
    console.log("MoulinetteSearch | Retrieving search key from Moulinette Server")
    let results = await fetch(`${MoulinetteSearch.SERVER_URL}/search/keys/${this.sessionId}`).catch(function(e) {
      console.log(`MoulinetteSearch | Something went wrong while fetching search keys from the server`)
      console.warn(e)
      return {}
    })

    let searchKey = null
    if(results) {
      results = await results.json()
      if(results.search && results.search.length > 0) {
        this.elastic = window.ElasticAppSearch.createClient({
          endpointBase: MoulinetteSearch.ELASTIC_ENDPOINT,
          searchKey: results.search,
          engineName: MoulinetteSearch.ELASTIC_ENGINE,
          cacheResponses: false
        })
        return console.log("MoulinetteSearch | Search engine initialized!")
      }
    }

    console.warn(`MoulinetteSearch | You are not authorized to use this function. Make sure your Patreon account is linked to Moulinette.`)
  }

  /**
   * Executes a search and returns the results
   */
  async search(terms, page = 1, pledges = []) {
    if(!this.elastic) {
      console.warn("MoulinetteSearch | You are not authorized to use this function. Make sure your Patreon account is linked to Moulinette.!")
      return "You need first to link Moulinette to your Patreon<br/><em>(check the module's options)</em>"
    }
    if(this.pending) {
      console.warn("MoulinetteSearch | Moulinette already searching ... please wait!")
      return "Already searching... please wait!"
    }
    this.pending = true

    // prepare filters
    // - only tiles/images
    const optionsFilters = {
      all: [{category: "image"}]
    }

    // apply permissions if pledges are provided
    if(pledges && pledges.length > 0) {
      const perms = pledges.map(p => Number(p.id))
      perms.push(0) // 0 = free (available to anyone)
      optionsFilters.all.push({
        perm: perms
      })
    }

    const elasticOptions = {
      page: { size: MoulinetteSearch.MAX_ASSETS, current: page },
      //facets: facets,
      filters:  optionsFilters
    }

    const resultList = await this.elastic.search(terms, elasticOptions)
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

    return {results: results, meta: resultList.rawInfo.meta.page};
  }

  /**
   * Executes a search and returns the results
   */
  async getDocument(docId) {
    if(!this.elastic) {
      console.warn("MoulinetteSearch | You are not authorized to use this function. Make sure your Patreon account is linked to Moulinette.!")
      return "You need first to link Moulinette to your Patreon<br/><em>(check the module's options)</em>"
    }
    if(this.pending) {
      console.warn("MoulinetteSearch | Moulinette already searching ... please wait!")
      return "Already searching... please wait!"
    }
    this.pending = true

    const elasticOptions = {
      page: { size: 1, current: 1 },
      filters: {
        all: ({ id: docId})
      }
    }

    const resultList = await this.elastic.search("", elasticOptions)
    this.pending = false

    if(resultList && resultList.results) {
      const data = resultList.results[0].data
      const result = {}
      for(const key of Object.keys(data)) {
        if(data[key].raw) {
          result[key] = data[key].raw
        }
      }
      return result
    }

    return null
  }

  /**
   * Returns the details about the pack
   */
  async getPackDetails(creator, pack) {
    const results = await fetch(`${MoulinetteSearch.SERVER_URL}/asset/${creator}/${pack}`).catch(function(e) {
      console.log(`MoulinetteSearch | Something went wrong while fetching pack data from the server`)
      console.warn(e)
      return null;
    })

    return results ? await results.json() : null
  }

  /**
   * Returns the URL of the image matching the search id
   */
  async getImageURL(id) {
    const url = this.sessionId
    let result = await fetch(`${MoulinetteSearch.SERVER_URL}/search/imageurl/${this.sessionId}/${id}`).catch(function(e) {
      console.log(`MoulinetteSearch | No matching image on server with id ${id}`)
      console.warn(e)
      return null
    })
    if(result.status != 200) {
      console.log(`MoulinetteSearch | You don't have access to that image!`)
      return null;
    }

    result = await result.json()
    if(result && result.url) {
      return result.url
    }

    return null
  }

  /**
   * Downloads image matching id
   * Returns a File object with the binary file representing the image
   */
  async downloadImageByIdName(id, name) {
    return this.downloadImage(await this.getImageURL(id))
  }

  async downloadImage(url) {
    if(!url) return null

    let res = await fetch(url).catch(function(e) {
      console.warn(`MoulinetteSearch | Not able to download the image`, e)
    });
    if(res) {
      const blob = await res.blob()
      return new File([blob], name, { type: blob.type, lastModified: new Date() })
    }
  }


  async getAssetsByCreator() {
    let res = await fetch(`${MoulinetteSearch.SERVER_URL}/assets/${this.sessionId}`).catch(function(e) {
      console.error(`Moulinette | Not able to fetch assets from Moulinette servers`, e)
    });
    const creators = {}
    const data = await res.json()
    // filter assets for simple images only
    data.forEach(c => {
      const packs = []
      let count = 0
      c.packs.forEach(p => {
        const assets = p.assets.filter(a => (typeof a === 'string' || a instanceof String) && a.endsWith(".webp"))
        if(assets.length > 0) {
          count += assets.length
          packs.push({
            id: p.id,
            name: p.name,
            path: p.path,
            sas: p.sas,
            assets: assets
          })
        }
      })
      if(packs.length > 0) {
        creators[c.publisher] = {
          count: count,
          packs: packs
        }
      }
    })
    return creators;
  }

  /**
   * Utility function to filter assets
   */
  static filterAssets(assets, creator, terms) {
    let creators = {}
    const termsList = terms.toLowerCase().split(" ");
    Object.keys(assets).forEach(c => {
      // creator doesn't match
      if(creator.length > 0 && c !== creator) return
      const packs = []
      let count = 0
      assets[c].packs.forEach(p => {
        const assets = terms.length == 0 ? p.assets : p.assets.filter(a => {
          // must contain all terms
          for(const t of termsList) {
            if(!a.toLowerCase().includes(t)) {
              return false
            }
          }
          return true
        })
        // add pack
        if(assets.length > 0) {
          count += assets.length
          packs.push({
            id: p.id,
            name: p.name,
            path: p.path,
            sas: p.sas,
            assets: assets
          })
        }
      })
      // add creator
      if(packs.length > 0) {
        creators[c] = {
          count: count,
          packs: packs
        }
      }
    })
    return creators
  }
}
