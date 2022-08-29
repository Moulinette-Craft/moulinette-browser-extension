class MoulinetteUtil {

  static filterPlainImages(assets) {
    const creators = {}

    // iterate on each creator
    assets.forEach(c => {
      const packs = []

      // iterate on each pack
      c.packs.forEach(p => {
        const pack = { name: p.name, sas: p.sas }
        pack.assets = []

        // iterate on each asset
        p.assets.forEach(a => {
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
}
