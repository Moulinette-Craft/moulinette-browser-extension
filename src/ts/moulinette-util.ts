export class MoulinetteUtil {

  static filterPlainImages(assets : any) {
    const creators = {} as any

    // iterate on each creator
    assets.forEach((c : any) => {
      const packs = [] as any[]

      // iterate on each pack
      c.packs.forEach((p : any) => {
        const pack = { name: p.name, sas: p.sas, assets: [] as any[] }
        
        // iterate on each asset
        p.assets.forEach((a : any) => {
          if(typeof a === 'string' || a instanceof String) {
            pack.assets.push(a)
          }
        })

        // add pack only if contains assets
        if(pack.assets.length > 0) {
          packs.push(pack)
        }
      })

      // add creator only if contains packs (with assets)
      if(packs.length > 0) {
        creators[c.publisher] = packs
      }
    });

    return creators;
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
