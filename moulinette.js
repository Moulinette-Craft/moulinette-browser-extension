
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    func: () => {
      $("#moulinette-panel").toggle()
    },
  });
  /*
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    files: ['moulinette-ui.js']
  });*/
});

