
const enable = document.querySelector('.enable button[name="enable"]');
const disable = document.querySelector('.enable button[name="disable"]');

const lbrySite = document.querySelector('.redirect button[name="site"]');
const lbryApp = document.querySelector('.redirect button[name="app"]');

chrome.storage.local.get(['enabled', 'redirect'], ({ enabled, redirect }) => {

  const currentButton = enabled ? enable : disable;
  currentButton.classList.add('active');

  const currentRadio = !redirect ? lbrySite : redirect === 'lbry.tv' ? lbrySite : lbryApp;
  currentRadio.classList.add('active');
});

const checkElementForClass = (elToAdd, elToRemove) => {
  if(!elToAdd.classList.contains('active')){

    elToAdd.classList.add('active');
    elToRemove.classList.remove('active');
  }
}

const attachClick = (selector, handler) =>{
  document.querySelector(selector).addEventListener('click', (event) => {
    const element = event.target;
    const name = event.target.getAttribute('name');
    const value = event.target.getAttribute('value');
    typeof handler==='function' ? handler(element, name, value): null;
  });
}

attachClick('.enable', (element, name, value) => {
  const parsedValue = !!+value;
  if(name){
    checkElementForClass(element, name === 'enable' ? disable : enable  );
    chrome.storage.local.set({ enabled: parsedValue });
  }
});

attachClick('.redirect', (element, name, value) => {
  if(name){
    checkElementForClass(element, name === 'site' ? lbryApp : lbrySite);
    chrome.storage.local.set({ redirect: value });
  }
});

var button = document.getElementById("btn1");
button.addEventListener("click", function(){
    chrome.tabs.create({url:"/tools/YTtoLBRY.html"});
});
