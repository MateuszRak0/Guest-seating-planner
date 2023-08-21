//Side Bar
const sideBar = {
    btn:document.getElementById("btn-show-sidebar"),
    sidebar:document.getElementById("side-bar"),

    switchPosition:function(){
        let classes = this.sidebar.classList;
        if(classes.contains("active")){
            classes.remove("active");
            this.btn.classList.remove("icon-cancel");
            this.btn.classList.add("icon-menu");
        }
        else{
            classes.add("active");
            this.btn.classList.remove("icon-menu");
            this.btn.classList.add("icon-cancel");
        }
    }
    
}

// Fake Sliders
const fakeSliders = {
    load : function(){
        if(!this.allSliders) this.allSliders = new Map();
        for(let slider of document.getElementsByClassName("fake-slider")){
            let obj = document.getElementById(slider.name);
            let data = {
                obj:obj,
                multiper:(obj.scrollWidth - obj.clientWidth)/100
            }
            this.allSliders.set(slider.name,data);
            slider.addEventListener("input",fakeSliders.moveSlider.bind(fakeSliders));
        };
    },

    moveSlider : function(e){
        let name = e.target.name
        const data = this.allSliders.get(name)
        if(data){
            this.resize(data);
            let pos = data.multiper*e.target.value;
            data.obj.scrollLeft = pos;

        }
    },

    resizeAll : function(){
        for(let key of this.allSliders.keys()){
            let data = this.allSliders.get(key);
            data.multiper = (data.obj.scrollWidth - data.obj.clientWidth)/100
        }
    },

    resize : function(data){
        data.multiper = (data.obj.scrollWidth - data.obj.clientWidth)/100
    }
}

// Floating Widgets
const dragWidgetsTool = new class{
    constructor(){
        this.floatingWidgets = new Set();
        this.dragedWidget = undefined;
        this.marginX = 0;
        this.marginY = 0;
        addEventListener("mouseup",()=>{  dragWidgetsTool.dragedWidget = false; });
        addEventListener("mouseleave",()=>{  dragWidgetsTool.dragedWidget = false; });
        addEventListener("mousemove",()=>{dragWidgetsTool.moveWidget()});

        addEventListener("touchend",()=>{  dragWidgetsTool.dragedWidget = false; });
        addEventListener("touchmove",()=>{dragWidgetsTool.moveWidget()});
        let cnt = 0;

        for(let widget of document.getElementsByClassName("floating-widget")){
            this.addFloatingWidget(widget);
        }
    }

    addFloatingWidget(widget){
        this.floatingWidgets.add(widget)
        widget.style.zIndex = 50 + this.floatingWidgets.size;
        widget.addEventListener("mousedown",this.selectWidget.bind(this));
        widget.addEventListener("touchstart",this.selectWidget.bind(this));
        
    }

    selectWidget(e){
        cursor.tracking(e);
        let widget = e.target;
        if(widget.classList.contains("floating-widget")){
            this.dragedWidget = widget;
            let posX = parseInt((widget.style.left || getComputedStyle(widget).left));
            let posY = parseInt((widget.style.top || getComputedStyle(widget).top));
            this.marginX = cursor.fakeX - posX;
            this.marginY = cursor.fakeY - posY;
        }
    }

    moveWidget(){
        if(this.dragedWidget){
            if(draggingTool.dragedObj) draggingTool.endDrag();
            let newX = cursor.fakeX - this.marginX;
            let newY = cursor.fakeY - this.marginY;
            if(newX + this.dragedWidget.offsetWidth < appWindow.offsetWidth && newX > 0){
                if(newY + this.dragedWidget.offsetHeight < appWindow.offsetHeight && newY > 0){
                    this.dragedWidget.style.left = `${newX}px`;
                    this.dragedWidget.style.top = `${newY}px`;
                }
            }
        }
    }
}

sideBar.btn.addEventListener("click",sideBar.switchPosition.bind(sideBar));
fakeSliders.load();
window.addEventListener("resize",fakeSliders.resizeAll.bind(fakeSliders));
