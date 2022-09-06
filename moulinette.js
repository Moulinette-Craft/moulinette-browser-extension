"use strict";

async function toggleMoulinettePanel() {

  // retrieve currently active tab
  const tabs = await (browser ? browser : chrome).tabs.query({ currentWindow: true, active: true })
  if(tabs && tabs.length == 1) {
    (browser ? browser : chrome).tabs.sendMessage(tabs[0].id, {action: "togglePanel"});
  }
}

// default (firefox and others)
if(browser) {
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
        toggleMoulinettePanel();
      },
    });
  });
}

