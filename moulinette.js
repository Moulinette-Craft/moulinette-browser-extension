
async function toggleMoulinettePanel() {

  /** Default implementation **/
  if(typeof browser !== "undefined") {
    // retrieve currently active tab
    const tabs = await browser.tabs.query({ currentWindow: true, active: true, lastFocusedWindow: true })
    if(tabs && tabs.length == 1) {
      browser.tabs.sendMessage(tabs[0].id, {action: "togglePanel"});
    }
  }
  // Chrome implementation
  else {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, {action: "togglePanel"});
    });
  }
}

// default (firefox and others)
if(typeof browser !== "undefined") {
  browser.browserAction.onClicked.addListener(toggleMoulinettePanel);
  browser.commands.onCommand.addListener((command) => {
    if (command === "toggle-panel") {
      toggleMoulinettePanel()
    }
  });
}
// chrome specific (manifest v3)
else {
  chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        const panel = document.getElementById("moulinette-panel")
        panel.style.display = (panel.style.display == 'none') ? 'block' : 'none';
        document.getElementById("mtteSearch").focus()
      },
    });
  });
}


