
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    func: () => {
      const panel = document.getElementById("moulinette-panel")
      panel.style.display = (panel.style.display == 'none') ? 'block' : 'none';
      document.getElementById("mtteSearch").focus()
    },
  });
  /*
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    files: ['moulinette-ui.js']
  });*/
});

