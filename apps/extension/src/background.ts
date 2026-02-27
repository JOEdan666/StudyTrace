// Background service worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('StudyTrace extension installed');
});

// 点击扩展图标时打开侧边栏
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// 设置侧边栏行为：点击图标打开
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
