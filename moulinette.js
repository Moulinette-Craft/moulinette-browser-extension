
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    func: () => {
      const panel = document.getElementById("moulinette-panel")
      panel.style.display = (panel.style.display == 'none') ? 'block' : 'none';
      //$("#moulinette-panel").toggle()
    },
  });
  /*
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    files: ['moulinette-ui.js']
  });*/
});


chrome.commands.onCommand.addListener(function (command) {
  console.log("HERE")
  if (command === 'toggle') {
    $("#moulinette-panel").toggle()
  }
});

