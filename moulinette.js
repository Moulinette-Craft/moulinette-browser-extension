
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    func: () => {
      const iframe = document.getElementById("moulinette")
      if(iframe.style.width == "400px") {
        iframe.style.width="0px";
      }
      else {
        iframe.style.width="400px";
      }
    },
  });
  /*
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    files: ['moulinette-ui.js']
  });*/
});

