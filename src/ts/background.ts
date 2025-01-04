declare var chrome: any;
declare var browser: any;

async function toggleMoulinettePanel() {

  // Default implementation
  if(typeof browser !== "undefined") {
    // retrieve currently active tab
    const tabs = await browser.tabs.query({ currentWindow: true, active: true, lastFocusedWindow: true })
    if(tabs && tabs.length == 1) {
      console.log("SENDING MESSAGE", tabs)
      browser.tabs.sendMessage(tabs[0].id, {action: "togglePanel"});
    }
  }
  // Chrome implementation
  else {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([tab] : any[]) => {
      chrome.tabs.sendMessage(tab.id, {action: "togglePanel"});
    });
  }
}

// default (firefox and others)
if(typeof browser !== "undefined") {
  console.log("HERE")
  browser.browserAction.onClicked.addListener(toggleMoulinettePanel);
  browser.commands.onCommand.addListener((command: string) => {
    console.log("COMMAND")
    if (command === "toggle-panel") {
      toggleMoulinettePanel()
    }
  });
}
// chrome specific (manifest v3)
else {
  chrome.action.onClicked.addListener((tab: any) => {
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        const panel = document.getElementById("moulinette-panel")
        if(panel) {
          panel.style.display = (panel.style.display == 'none') ? 'block' : 'none';
          document.getElementById("mtteSearch")?.focus()
        }
      },
    });
  });
}