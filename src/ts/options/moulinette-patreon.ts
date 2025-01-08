/**
 * THIS IS A COPY OF ts/moulinette-patreon.ts !!!
 */
declare var chrome: any;
declare var browser: any;

export class MoulinettePatreon {

  //static SERVER_URL = "https://127.0.0.1:5000"
  static SERVER_URL = "https://assets.moulinette.cloud"

  // client ID for FVTT integration
  static CLIENT_ID = "K3ofcL8XyaObRrO_5VPuzXEPnOVCIW3fbLIt6Vygt_YIM6IKxA404ZQ0pZbZ0VkB"

  constructor() {}

  /**
   * Returns the current user session ID
   */
  async getSessionId(force = false) {
    if(!force || await this.getPatronUser()) {
      const data = await (typeof browser !== "undefined" ? browser : chrome).storage.local.get("sessionId")
      return data && data.sessionId ? data.sessionId : null
    }
    return null
  }

  /**
   * Generates a new session
   * Returns a URL for authenticating the user
   */
  async getAuthenticationURL() {
    // generate new GUID and store it
    const newGUID = "C" + MoulinettePatreon.generateGUID(25);
    await (typeof browser !== "undefined" ? browser : chrome).storage.local.set({ sessionId : newGUID })
    await (typeof browser !== "undefined" ? browser : chrome).storage.local.remove("patronUser")
    const callback = `${MoulinettePatreon.SERVER_URL}/patreon/callback`
    return `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${MoulinettePatreon.CLIENT_ID}&redirect_uri=${callback}&scope=identity+identity.memberships&state=${newGUID}`
  }

  /**
   * Returns the user data (for the active session)
   */
  async getPatronUser() {
    // hardcoded test
    //await chrome.storage.local.remove("patronUser")
    //await chrome.storage.local.set({ sessionId: "cv5bl1p0bzpwh0dk2hm7vor3vy" })

    const storage = await (typeof browser !== "undefined" ? browser : chrome).storage.local.get(["patronUser", "patreonUpdate", "sessionId"])
    
    if(storage && storage.patronUser && storage.patreonUpdate && storage.patreonUpdate > (new Date().getTime() - 3600000)) {
      console.log("MoulinetteSearch | Using cached user data")
      return storage.patronUser;
    }

    if(!storage || !storage.sessionId) return null;

    const noCache = "?ms=" + new Date().getTime()
    const results = await fetch(`${MoulinettePatreon.SERVER_URL}/user/${storage.sessionId}${noCache}`).catch(function(e) {
      console.log(`MoulinettePatreon | Something went wrong while fetching user data from the server`)
      console.warn(e)
      return null;
    })

    if(results && results.status == 200) {
      const user = await results.json()
      // user is only valid if user data contains a full name
      if(user.fullName) {
        let storageNew : any = { patronUser : user, patreonUpdate : new Date().getTime() }
        // check if GUID has been updated
        if(user.guid) {
          storageNew["sessionId"] = user.guid
          delete user.guid
        }
        console.log("MoulinettePatreon | Storing user data.")
        await (typeof browser !== "undefined" ? browser : chrome).storage.local.set(storageNew)
        
        return user  
      } 
      // user is not valid => clear storage from deprecated data
      else {
        await (typeof browser !== "undefined" ? browser : chrome).storage.local.clear()
      }
    }

    return null;
  }

  /**
   * Returns true if user session is ready (after authenticating)
   */
  async isReady() {
    const sessionId = await this.getSessionId()
    if(!sessionId) {
      return false;
    }
    const results = await fetch(`${MoulinettePatreon.SERVER_URL}/user/${sessionId}/ready`).catch(function(e) {
      console.log(`MoulinettePatreon | Something went wrong while checking session readiness`)
      console.warn(e)
      return null;
    })

    if(results && results.status == 200) {
      const data = await results.json()
      return data.status == "yes"
    }
    return false;
  }

  /**
   * Generates a random ID
   */
  static generateGUID(length : number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

}
