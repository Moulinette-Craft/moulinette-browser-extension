import { MoulinetteClient } from "./moulinette-client.js"
import {MoulinettePatreon} from "./moulinette-patreon.js"
import MouMediaUtils from "./utils/media-utils.js"

export class CloudConstants {
  static MOU_STORAGE     = "https://mttestorage.blob.core.windows.net/"
  static MOU_STORAGE_PUB = "https://moulinette-previews.nyc3.cdn.digitaloceanspaces.com/"
}

enum CloudAssetType {
  PREVIEW,                  // asset is a preview (no access, requires membership)
  FREE,                     // asset is a freebe from creator
  AVAILABLE,                // asset is available (but not free)
}

export enum MouCollectionAssetTypeEnum {
  Scene = 1,
  Map = 2,
  Image = 3,
  PDF = 4,
  Actor = 5,
  Item = 6,
  Audio = 7,
  JournalEntry = 8,
  Playlist = 9,
  Macro = 10,
  RollTable = 11,
  Adventure = 12,
  Icon = 97,
  ScenePacker = 98,
  Undefined = 99
}

export interface MouCollectionFilters {
  creator?: string,
  pack?: string,
  type?: number,
  searchTerms?: string,
  folder?: string
}

export interface MouCollectionAssetMeta {
  icon?: string,
  text: string,
  hint: string
}

export interface MouPermissionTier {
  id: string,
  title: string,
  amount: number
}

class MouCollectionCloudAsset {
  
  id: string;                       // asset unique identifier
  url: string;                      // asset's full url
  type: number;                     // asset type
  format: string;                   // asset format (small, large)
  previewUrl: string | null;        // asset's preview url
  background_color: string;         // background color
  creator: string;                  // asset creator
  creatorUrl: string;               // asset creator url
  pack: string;                     // asset pack name
  pack_id: string;                  // asset pack id
  name: string;                     // asset name
  meta: MouCollectionAssetMeta[];   // asset metadata
  flags: any;                       // asset flags (e.g. is hasAudioPreview)
  perms?: MouPermissionTier[];      // asset permissions (tiers on which the asset is available)
  deps?: string[]                    // asset dependencies

  // specific to MouCollectionCloud
  cloud_type: number; 
  
  constructor(data: any) {
    this.id = data._id;
    this.format = [MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.Map, MouCollectionAssetTypeEnum.ScenePacker].includes(data.type) ? "large" : "small"
    const basePath = MouMediaUtils.getBasePath(data.filepath)
    this.url = data.filepath
    this.background_color = [MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.Map, MouCollectionAssetTypeEnum.ScenePacker].includes(data.type) ? data.main_color : null
    
    // creator & pack information are either under pack/ or directly in the asset
    if(typeof data.pack === 'object') {
      this.creator = data.pack.creator
      this.creatorUrl = data.pack.creator_url
      this.pack = data.pack.name
      this.previewUrl = `${CloudConstants.MOU_STORAGE_PUB}${data.pack.creator_ref}/${data.pack.path}/${basePath}.${data.type == MouCollectionAssetTypeEnum.Audio ? "ogg" : "webp"}`
    } else {
      this.creator = data.creator
      this.creatorUrl = data.creator_url
      this.pack = data.pack
      this.previewUrl = null
    }

    if(data.deps) {
      this.deps = data.deps.map((d: string) => `${data.base_url}/${d}`);
    }

    // full url
    if(data.file_url) {
      this.url = `${data.base_url}/${data.file_url}`
    }

    this.pack_id = data.pack_ref
    this.name = data.name && data.name.length > 0 ? data.name : MouMediaUtils.prettyMediaName(data.filepath)
    this.type = data.type;
    this.meta = []
    this.flags = {}

    if(typeof data.perms === 'object') {
      this.perms = data.perms?.tiers?.map((p: any) => { return { id: p.id, title: p.title, amount: p.amount } })
      if(data.perms?.isFree) {
        this.cloud_type = CloudAssetType.FREE
      } else {
        this.cloud_type = CloudAssetType.PREVIEW
      }
    } else {
      if(data.perms == 0) {
        this.cloud_type = CloudAssetType.FREE
        if(data.type != MouCollectionAssetTypeEnum.Audio) {
          this.previewUrl = `${CloudConstants.MOU_STORAGE}${data.pack.creator_ref}/${data.pack.path}/${data.thumb}`
        }
      } else if (data.perms < 0) {
        this.cloud_type = CloudAssetType.PREVIEW
      } else {
        this.cloud_type = CloudAssetType.AVAILABLE
        if(data.type != MouCollectionAssetTypeEnum.Audio) {
          this.previewUrl = `${CloudConstants.MOU_STORAGE}${data.pack.creator_ref}/${data.pack.path}/${data.thumb}`
        }
      }
    }
    
    
    switch(data.type) {
      case MouCollectionAssetTypeEnum.Image:
        if(data.size) {
          this.meta.push({ 
            icon: "fa-regular fa-expand-wide", 
            text: `${MouMediaUtils.prettyNumber(data.size.width, true)} x ${MouMediaUtils.prettyNumber(data.size.height, true)}`,
            hint: "Image size (static or animated)"
          })
        }
        break;
      case MouCollectionAssetTypeEnum.Audio:
        if(data.audio.duration >= 45) {
          this.flags["hasAudioPreview"] = true
          this.meta.push({ 
            icon: "fa-solid fa-headphones", 
            text: "",
            hint: "Preview available for that audio"
          })
        }
        this.meta.push({ 
          icon: "fa-regular fa-stopwatch", 
          text: MouMediaUtils.prettyDuration(data.audio.duration),
          hint: "Preview available for that audio"
        })
        break
      case MouCollectionAssetTypeEnum.Scene:
        if(data.scene.width) {
          this.meta.push({ 
            icon: "fa-regular fa-border-all", 
            text: `${data.scene.width} x ${data.scene.height}`,
            hint: "Scene dimensions (in grid units)"
          })
        } else {
          if(data.size) {
            this.meta.push({ 
              icon: "fa-regular fa-expand-wide", 
              text: `${MouMediaUtils.prettyNumber(data.size.width, true)} x ${MouMediaUtils.prettyNumber(data.size.height, true)}`,
              hint: "Image size (static or animated)"
            })
          }
        }
        break
      case MouCollectionAssetTypeEnum.Map:  
        this.meta.push({ 
          icon: "fa-regular fa-expand-wide", 
          text: `${MouMediaUtils.prettyNumber(data.size.width, true)} x ${MouMediaUtils.prettyNumber(data.size.height, true)}`,
          hint: "Image size (static or animated)"
        })
        break
      case MouCollectionAssetTypeEnum.PDF:
        this.meta.push({ 
          icon: "fa-regular fa-file-pdf", 
          text: `${data.pdf?.pages} ` + (data.pdf.pages > 1 ? "pages" : "page"),
          hint: "Number of pages in the PDF file"
        })
        break
      case MouCollectionAssetTypeEnum.Playlist:
        if(data.playlist?.sounds) {
          this.meta.push({ 
            icon: "fa-regular fa-music", 
            text: `${data.playlist.sounds} ` + (data.playlist.sounds > 1 ? "tracks" : "track"),
            hint: "Number of tracks in the playlist"
          })
        }
        break
      case MouCollectionAssetTypeEnum.JournalEntry:
        if(data.journal?.pages) {
          this.meta.push({ 
            icon: "fa-regular fa-file-lines", 
            text: `${data.journal.pages} ` + (data.journal.pages > 1 ? "MOU.pages" : "MOU.page"),
            hint: "Number of pages in the journal"
          })
        }
        break
    }
    this.meta.push({ 
      icon: "fa-regular fa-weight-hanging",
      text: MouMediaUtils.prettyFilesize(data.filesize, 0),
      hint: "File size"})
  }
}


export interface MouCollectionCreator {
  name: string,
  assets: number
}

export interface MouCollectionPack {
  name: string,
  assets: number,
  pack_ref: string
}


export class MoulinetteSearch {

  static INSTANCE: MoulinetteSearch | null = null
  static SERVER_URL = "https://assets.moulinette.cloud"
  static SERVER_API = "https://assets.moulinette.cloud/api/v2"
  static THUMB_BASEURL = "https://mtte-previews.nyc3.cdn.digitaloceanspaces.com"
  static THUMB_DEFAULT = "https://assets.moulinette.cloud/static/images/moulinette-preview.png"
  
  static MAX_ASSETS = 100

  private sessionId : string
  private pending : boolean = false


  constructor(sessionId: string) {
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
    }
    return MoulinetteSearch.INSTANCE
  }


  /**
   * Retrieves the corresponding asset type ID based on the provided asset type string.
   *
   * @param assetType - The type of the asset as a string (e.g., "map", "sound", "pdf").
   * @returns The corresponding `MouCollectionAssetTypeEnum` value for the given asset type.
   *          Defaults to `MouCollectionAssetTypeEnum.Image` if the asset type is not recognized.
   */
  getAssetTypeId(assetType : string) : MouCollectionAssetTypeEnum {
    switch(assetType) {
      case "map": return MouCollectionAssetTypeEnum.Map;
      case "sound": return MouCollectionAssetTypeEnum.Audio; 
      case "pdf": return MouCollectionAssetTypeEnum.PDF;
      default: return MouCollectionAssetTypeEnum.Image
    }
  }

  getAssetTypeMime(assetType : number, ext: string) : string {
    switch(assetType) {
      case MouCollectionAssetTypeEnum.Audio: return `audio/${ext}`; 
      case MouCollectionAssetTypeEnum.PDF: return "application/pdf";
      default: return "image/webp"
    }
  }

  /**
   * Executes a search and returns the results
   */
  async searchAssets(filters = { terms : "" as string, type : "" as string, creator: "" as string, pack : "" as string }, page = 0, allAssets = false) : Promise<MouCollectionCloudAsset[] | null> {
    if(this.pending) {
      console.warn("MoulinetteSearch | Moulinette already searching ... please wait!")
      return null
    }
    this.pending = true
    let searchFilters : MouCollectionFilters = {
      searchTerms: filters.terms,
      type: this.getAssetTypeId(filters.type)
    }
    let results : MouCollectionCloudAsset[] = []
    const filtersDuplicate : any = {}
    Object.assign(filtersDuplicate, searchFilters);
    filtersDuplicate["page"] = page
    filtersDuplicate["scope"] = { mode: allAssets ? "cloud-all" : "cloud-accessible", session: this.sessionId }
    filtersDuplicate["creator"] = filters.creator.length == 0 ? null : filters.creator
    filtersDuplicate["pack"] = filters.pack.length == 0 ? null : filters.pack
    
    try {
      const response = await MoulinetteClient.post(`/assets`, filtersDuplicate)
      if(response && response.status == 200) {
        for(const data of response.data) {
          results.push(new MouCollectionCloudAsset(data))
        }
      }
    } catch(error: any) {
      console.error(`MoulinetteSearch | Not able to retrieve assets`, error)
    }
    this.pending = false
    return results
  }

  async getCreators(terms: string, assetType: string, allAssets = false) : Promise<MouCollectionCreator[] | null> {
    if(this.pending) {
      console.warn("MoulinetteSearch | Moulinette already searching ... please wait!")
      return null
    }
    let filters : MouCollectionFilters = {
      searchTerms: terms,
      type:  this.getAssetTypeId(assetType)
    }
    let results : MouCollectionCreator[] = []
    const filtersDuplicate : any = {}
    Object.assign(filtersDuplicate, filters);
    filtersDuplicate["scope"] = { mode: allAssets ? "cloud-all" : "cloud-accessible", session: this.sessionId }
    try {
      const response = await MoulinetteClient.post(`/creators`, filtersDuplicate)
      if(response && response.status == 200) {
        for(const data of response.data) {
          results.push(data)
        }
      }
    } catch(error: any) {
      console.error(`MoulinetteSearch | Not able to retrieve creators`, error)
    }
    this.pending = false
    results.sort((a, b) => a.name.localeCompare(b.name))
    return results
  }

  async getPacks(terms: string, assetType: string, creator: string, allAssets = false) : Promise<MouCollectionPack[] | null> {
    if(this.pending) {
      console.warn("MoulinetteSearch | Moulinette already searching ... please wait!")
      return null
    }
    let filters : MouCollectionFilters = {
      searchTerms: terms,
      creator: creator,
      type:  this.getAssetTypeId(assetType)
    }
    let results : MouCollectionPack[] = []
    if(creator.length == 0) return results

    const filtersDuplicate : any = {}
    Object.assign(filtersDuplicate, filters);
    filtersDuplicate["scope"] = { mode: allAssets ? "cloud-all" : "cloud-accessible", session: this.sessionId }
    try {
      const response = await MoulinetteClient.post(`/packs`, filtersDuplicate)
      if(response && response.status == 200) {
        for(const data of response.data) {
          results.push(data)
        }
      }
    } catch(error: any) {
      console.error(`MoulinetteSearch | Not able to retrieve creators`, error)
    }
    this.pending = false
    //results.sort((a, b) => a.name.localeCompare(b.name))
    return results
  }

  /**
   * Returns the URL of the image matching the search id
   */
  async getAssetDetails(id: string): Promise<MouCollectionCloudAsset | null> {
    try {
      const response = await MoulinetteClient.get(`/asset/${id}?session=${this.sessionId}`)
      if(response && response.status == 200) {
        return new MouCollectionCloudAsset(response.data)
      }
    } catch(error: any) {
      console.error(`MoulinetteSearch | Not able to retrieve asset details`, error)
    }

    return null
  }

  /**
   * Downloads image matching id
   * Returns a File object with the binary file representing the image
   */
  async downloadAssetByIdName(id : string, name : string) {
    const details = await this.getAssetDetails(id)
    if(!details) return null
    // special case for scenes (download first dependency (corresponds to the image))
    if(details.type == MouCollectionAssetTypeEnum.Scene) {
      if(details.deps && details.deps.length > 0) {
        return this.downloadAsset(details.deps[0], MouCollectionAssetTypeEnum.Image, name)
      } else {
        return null;
      }
    }
    return this.downloadAsset(details.url, details.type, name)
  }

  async downloadAsset(url : string | null, assetType: number, name: string) : Promise<File | null> {
    if(!url || !url.startsWith("https://")) return null

    let res = await fetch(url).catch(function(e) {
      console.warn(`MoulinetteSearch | Not able to download the asset`, e)
    });
    if(res) {
      const blob = await res.blob()
      const fileExt = name.split('.').pop() || ""
      return new File([blob], name, { type: this.getAssetTypeMime(assetType, fileExt), lastModified: new Date().getTime() })
    }
    return null
  }
}
