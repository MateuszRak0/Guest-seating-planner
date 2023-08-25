// Base
const widgetsMenager = {
    toHide:false,

    refreshPositions:function(){
        for(let widget of this.activeWidgets){
            widget.zIndex = 50 + this.activeWidgets.lookFor(widget);
        }
    },

    hideImportant:function(){
        if(this.toHide) this.toHide.hide();
    },

    loadFromDocument:function(){
        for(let element of document.getElementsByClassName("floating-widget")){ 
            if(!this.allWidgets.has(element.id))
             new FloatingWidget(element);
        }
    }
}

widgetsMenager.allWidgets = new Map();
widgetsMenager.activeWidgets = new Set();

for(let btn of document.getElementsByName("show-widget-btn")){
    btn.addEventListener("click",(e)=>{
        let widget = widgetsMenager.allWidgets.get(e.target.value);
        if(widget) widget.switchVisibility();
    })
}

class Widget{
    constructor(element,showCallback){
        if(widgetsMenager.allWidgets.has(element.id)) return widgetsMenager.allWidgets.get(element.id);
        this.element = element;
        this.hidden = true;
        this.id = this.element.id;
        this.showCallback = showCallback;
        widgetsMenager.allWidgets.set(this.id,this);
    }

    set zIndex(value){
        this.element.style.zIndex = value;
    }

    show(saveToMemory,hideImportant){
        if(typeof this.showCallback === "function") this.showCallback();
        this.hidden = false;
        this.checkPosition();
        if(!this.element.classList.contains("active")){
            this.element.classList.add("active");
            if(hideImportant) widgetsMenager.hideImportant();
            if(saveToMemory) widgetsMenager.toHide = this;
            widgetsMenager.activeWidgets.add(this);
        } 
        widgetsMenager.refreshPositions();
    }

    checkPosition(){
        let offScreen = false;
        if(this.element.offsetLeft + this.element.offsetWidth/2 > appWindow.offsetWidth || this.element.offsetLeft < 0 - this.element.offsetWidth/2) offScreen = true;
        if(this.element.offsetTop + this.element.offsetHeight/2 > appWindow.offsetHeight || this.element.offsetTop < 0 - this.element.offsetHeight/2) offScreen = true;

        if(offScreen){
            this.element.style.left = `${60}px`;
            this.element.style.top = `${60}px`;
        }
    }

    hide(){
        this.hidden = true;
        if(this.element.classList.contains("active")){
            this.element.classList.remove("active");
            this.hidden = true;
            widgetsMenager.activeWidgets.delete(this);
        } 
    }

    switchVisibility(){
        (this.element.classList.contains("active") ) ? this.hide() : this.show() ;
    }
}

class FloatingWidget extends Widget{
    constructor(element){
        super(element)
        let cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.classList.add("icon-cancel");
        cancelBtn.classList.add("btn-cancel");
        cancelBtn.classList.add("additional-btn");
        cancelBtn.value = this.id;

        this.element.appendChild(cancelBtn);
        cancelBtn.addEventListener("click",this.hide.bind(this))

        this.minimalizeBtn = document.createElement("button");
        this.minimalizeBtn.type = "button";
        this.minimalizeBtn.classList.add("icon-resize-small");
        this.minimalizeBtn.classList.add("btn-minimalize");
        this.minimalizeBtn.classList.add("additional-btn");
        this.minimalizeBtn.value = this.id;

        this.element.appendChild(this.minimalizeBtn);
        this.minimalizeBtn.addEventListener("click",this.minimalize.bind(this))
    }

    minimalize(event){
        let btn = event.target;

        if(btn.classList.contains("icon-resize-small")){
            btn.classList.remove("icon-resize-small");
            btn.classList.add("icon-resize-full");
        }

        else{
            btn.classList.add("icon-resize-small");
            btn.classList.remove("icon-resize-full");
        }

        this.element.classList.contains("minimalize") ? this.element.classList.remove("minimalize") : this.element.classList.add("minimalize");
    }

}

// Message Widget Functions
const messenger = new class{
    constructor(){
        this.acceptFunc=false;
        this.rejectFunc=false;
        this.showed=false;
        this.allMessages={};
    
        this.elements={
            title:document.getElementById("msg-title"),
            content:document.getElementById("msg-content"),
            rejectBtn:document.getElementById("msg-reject"),
            acceptBtn:document.getElementById("msg-accept"),
        };

        this.elements.acceptBtn.addEventListener("click",this.accept.bind(this));
        this.elements.rejectBtn.addEventListener("click",this.reject.bind(this));
    }


    show(msgID,acceptFunc,rejectFunc,arg){
        console.log("POKAZUJE")
        let message = this.allMessages[msgID];
        if(message){
            this.updateContent(message);
        }
        else{
            this.updateContent(this.allMessages.messageNotFound);
        }
        this.showed = true;
        this.arg = arg;
        this.acceptFunc = acceptFunc;
        this.rejectFunc = rejectFunc;
        this.widget.show()
    }

    updateContent(message){
        this.elements.title.innerHTML = message.title;
        this.elements.content.innerHTML = message.content;
        this.elements.acceptBtn.innerHTML = message.acceptBtn;
        if(message.rejectBtn){
            this.switchRejectBtn();
            this.elements.rejectBtn.innerHTML = message.rejectBtn;
        }
        else{
            this.switchRejectBtn(true);
        }
    }
    
    switchRejectBtn(hide){
        const status = this.elements.rejectBtn.classList.contains("hidden");
        if(hide){
            if(!status) this.elements.rejectBtn.classList.add("hidden");
        }
        else{
            if(status) this.elements.rejectBtn.classList.remove("hidden");
        }
    }

    accept(){
        this.hide();
        if( typeof this.acceptFunc === "function") this.acceptFunc(this.arg);
    }
    
    reject(){
        if( typeof this.rejectFunc === "function" ) this.rejectFunc(this.arg);
        this.hide();
    }

    hide(){
        console.log("CHOWAM")
        this.widget.hide();
        this.showed = false;
    }
}

messenger.widget = new Widget( document.getElementById("msg-box") );

messenger.allMessages.messageNotFound = {
    title: "Dziwna Sprawa",
    content: "Zgubiliśmy gdzieś tę wiadomość ! Ale pewnie wykonujesz jakąs operacje czy chcesz ją zakceptować ? ",
    acceptBtn: "Tak",
    rejectBtn:"Nie"
}

messenger.allMessages.loadingError = {
    title: "Błąd Ładowania",
    content: "Podczas pobierania danych z serwera wystąpił jakiś problem, Konieczne jest załadowania strony ponownie. Jeżeli błąd nadal występuje skontaktuj się ze mną",
    acceptBtn: "Załaduj ponownie",
    rejectBtn: "Wyjdź",
}
