// this script listens for loading and start animations
let appWindow;

function startApp(){
    if(!appWindow){
        appWindow = document.createElement("iframe");
        appWindow.setAttribute("class","app-window");
        appWindow.src = "app.html";
        document.getElementById("main-header").appendChild(appWindow);
        let iFrame = appWindow.contentDocument || appWindow.contentWindow.document;
        if(iFrame.readyState === "complete"){
            afterLoad();
        }
    }
}

function afterLoad(){
   document.body.style.overflow = "hidden";
   appWindow.classList.add("app-window-start");
}

document.getElementById("app-start-btn").addEventListener("click",startApp);