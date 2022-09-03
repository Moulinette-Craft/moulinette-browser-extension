class MoulinettePatreon {

  static SERVER_URL = "https://assets.moulinette.cloud"

  // client ID for FVTT integration
  static CLIENT_ID = "K3ofcL8XyaObRrO_5VPuzXEPnOVCIW3fbLIt6Vygt_YIM6IKxA404ZQ0pZbZ0VkB"

  constructor() {}

  /**
   * Returns the current user session ID
   */
  async getSessionId() {
    const data = await chrome.storage.local.get("sessionId")
    return data && data.sessionId ? data.sessionId : null
  }

  /**
   * Generates a new session
   * Returns a URL for authenticating the user
   */
  async getAuthenticationURL() {
    // generate new GUID and store it
    const newGUID = "C" + MoulinetteUtil.generateGUID(25);
    await chrome.storage.local.set({ sessionId : newGUID })
    await chrome.storage.local.remove("patronUser")
    const callback = `${MoulinettePatreon.SERVER_URL}/patreon/callback`
    return `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${MoulinettePatreon.CLIENT_ID}&redirect_uri=${callback}&scope=identity+identity.memberships&state=${newGUID}`
  }

  /**
   * Returns the user data (for the active session)
   */
  async getPatronUser() {
    // hardcoded test
    await chrome.storage.local.remove("patronUser")
    await chrome.storage.local.set({ sessionId: "cv5bl1p0bzpwh0dk2hm7vor3vy" })

    const user = await chrome.storage.local.get("patronUser")
    const data = await chrome.storage.local.get("sessionId")

    if(user && user.patronUser) {
      return user.patronUser;
    }

    const noCache = "?ms=" + new Date().getTime()
    const results = await fetch(`${MoulinettePatreon.SERVER_URL}/user/${data.sessionId}${noCache}`).catch(function(e) {
      console.log(`MoulinetteSearch | Something went wrong while fetching user data from the server`)
      console.warn(e)
      return null;
    })

    if(results && results.status == 200) {
      const user = await results.json()
      await chrome.storage.local.set({ patronUser : user })
      // GUID has been updated (after 24 hours, for security reasons)
      if(user.guid) {
        await chrome.storage.local.set({ sessionId : user.guid })
        delete user.guid
      }
      return user
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
      console.log(`MoulinetteSearch | Something went wrong while checking session readiness`)
      console.warn(e)
      return false;
    })

    if(results && results.status == 200) {
      const data = await results.json()
      return data.status == "yes"
    }
    return false;
  }

}
