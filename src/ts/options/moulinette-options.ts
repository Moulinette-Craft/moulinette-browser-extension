import { MoulinettePatreon } from "./moulinette-patreon"

declare var chrome: any;
declare var browser: any;

$(async function() {

  const patreon = new MoulinettePatreon()
  const user = await patreon.getPatronUser()
  const msgBox = $("#mttePatreon")

  if(user && user.id) {
    // prepare information
    let html = `You're connected to Patreon as "${user.fullName}".`
    if(user.patron || user.platinum) {
      html += `<br/><span style="color: green">You're supporting moulinette! (${user.patron ? user.patron : "platinum creator"})</span>".`
      html += "<br/><h4>Your pledges</h4><ul>"
      for(const p of user.pledges) {
        html += `<li><b>${p.vanity}</b> : ${p.pledge}</li>`
      }
      html += `</ul><button id="mttePatreonDisconnect">Disconnect</button>`
    } else {
      html += `<br/><span style="color: darkred">You don't support moulinette! Visit <a href="https://www.patreon.com/moulinette" target="_blank">Moulinette Patreon</a></span>".`
    }
    msgBox.html(html)

    // code for disconnect button
    $("#mttePatreonDisconnect").on("click", async function() {
      await (typeof browser !== "undefined" ? browser : chrome).storage.local.remove("sessionId")
      await (typeof browser !== "undefined" ? browser : chrome).storage.local.remove("patronUser")
      location.reload()
    })
  } else {
    const URL = await patreon.getAuthenticationURL()
    msgBox.html(`Your Patreon account is not yet linked to Moulinette.<br/><a id="mttePatreonLink" href=${URL} target="_blank">Authenticate and autorize Moulinette</a>.`)
  }

  $("#mttePatreonLink").on("click", () => {

    msgBox.html("Waiting for you to authenticate on Patreon and autorize Moulinette ...")
    let timerIter = 0

    const timer = setInterval(async function(){
      // stop after 2 minutes maximum
      if(timerIter > 60) {
        msgBox.html("The authentication took more than 2 minutes. Please retry!")
        return clearInterval(timer);
      }

      timerIter++;
      msgBox.html(msgBox.text() + ".")

      if(await patreon.isReady()) {
        clearInterval(timer);
        location.reload();
      }
    }, 2000);
  })

});
