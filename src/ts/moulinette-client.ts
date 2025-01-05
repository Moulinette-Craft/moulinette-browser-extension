/**
 * Client for Moulinette server
 */
export class MoulinetteClient {
  
  static SERVER_URL = "https://assets.moulinette.cloud/api/v2"
  //static SERVER_URL = "http://127.0.0.1:5000/api/v2"
  
  static HEADERS = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
  
  /*
   * Sends a request to server and returns the response
   */
  static async fetch(URI : string, method : string, data : any = null) {
    let params : any = {
      method: method,
      headers: MoulinetteClient.HEADERS
    }
    if( data ) { params.body = JSON.stringify(data) }

    const response = await fetch(`${MoulinetteClient.SERVER_URL}${URI}`, params).catch(function(e) {
      console.log(`MoulinetteClient | Cannot establish connection to server ${MoulinetteClient.SERVER_URL}`, e)
      console.warn(e)
    });
    return response
  }
  
  /*
   * Sends a request to server and return the response or null (if server unreachable)
   */
  static async send(URI : string, method : string, data : any = null) {
    const response = await MoulinetteClient.fetch(URI, method, data)
    if(!response) {
      return null;
    }
    return { 'status': response.status, 'data': await response.json() }
  }
  
  static async get(URI: string) { return MoulinetteClient.send(URI, "GET") }
  static async put(URI: string) { return MoulinetteClient.send(URI, "PUT") }
  static async post(URI: string, data: any) { return MoulinetteClient.send(URI, "POST", data) }
  static async delete(URI: string) { return MoulinetteClient.send(URI, "DELETE") }
}
