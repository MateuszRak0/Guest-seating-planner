const appWindow = document.getElementById("app-window");
const [canvas,canvas2] = document.getElementsByClassName("app-canvas");
const [ctx,ctx2] = [canvas.getContext("2d"),canvas2.getContext("2d")];

let availableAttractions = new Map();
let allQuests = new Map();
let allTables = new Set();
let allChairs = new Set();
let allAttractions = new Set();
let selectedObject;

ctx.shadowColor = '#75757585';
ctx.shadowBlur = 7;
ctx.shadowOffsetX = 3;
ctx.shadowOffsetY = 3;
ctx2.shadowColor = '#da6398';
ctx2.shadowBlur = 7;

ctx2.shadowOffsetX = 0;
ctx2.shadowOffsetY = 0;
ctx.font = '12px monospace';
ctx2.font = '12px monospace';

Set.prototype.lookFor = function(value){
    return [...this].indexOf(value);
}

let colors = {
    locked:"#bf347080"
}

const cursor = {
    fakeX:0,
    fakeY:0,
    x: 0,
    y: 0,

    tracking: function (e){
        if(e instanceof MouseEvent){
            this.fakeX = e.pageX;
            this.fakeY = e.pageY;
            this.x = this.fakeX + appWindow.scrollLeft;
            this.y = this.fakeY + appWindow.scrollTop;
            document.getElementById("stats-2").innerHTML = `${this.x}`
        }
        else if(e instanceof TouchEvent){
            this.fakeX = e.targetTouches[0].pageX;
            this.fakeY = e.targetTouches[0].pageY;
            this.x = this.fakeX + appWindow.scrollLeft;
            this.y = this.fakeY + appWindow.scrollTop;
        }
    },
};

const clickHoldLoop = {
    intervalObj:false,

    start:function(callback,actionObj){
        if(typeof callback === "function" && actionObj){
            this.intervalObj = setInterval(callback,16,actionObj);
        }
    },

    stop:function(){
        if(! this.intervalObj) return false ;
        clearInterval(this.intervalObj);
        this.intervalObj = false;
    },
};

const dragScroll = {
    inDrag:false,

    start:function(){
        this.inDrag = true;
        this.startX = cursor.x;
        this.startY = cursor.y;
        this.startScrollX = appWindow.scrollLeft;
        this.startScrollY = appWindow.scrollTop;
    },

    scroll:function(){
        if(this.inDrag){
            let distanceX = cursor.x - this.startX;
            let distanceY = cursor.y - this.startY;
            appWindow.scrollLeft = this.startScrollX + (distanceX/-1.9);
            appWindow.scrollTop = this.startScrollY + (distanceY/-1.9);
        }
    },

    end:function(){
        this.inDrag = false;
    },
};

const draggingTool = {
    dragedObj: false,
    marginX: 0,
    marginY: 0,
    beforeDrag: {},

    startDrag: function (object) {
        if (object) {
            this.beforeDrag.x = object.shape.centerX;
            this.beforeDrag.y = object.shape.centerY;
            this.marginX = cursor.x - object.shape.centerX;
            this.marginY = cursor.y - object.shape.centerY;
            this.dragedObj = object;
            clearContext(ctx2)
            renderAll(object);
            object.render(ctx2);
            widgetsMenager.hideImportant()
        }
    },

    drag: function () {
        if (this.dragedObj) {
            this.dragedObj.shape.centerX = cursor.x - this.marginX;
            this.dragedObj.shape.centerY = cursor.y - this.marginY;
            clearContext(ctx2);
            if (this.dragedObj.constructor == Chair){
                let obj = selectObject([allTables,allChairs],this.dragedObj);
                if(obj){
                    if(obj.constructor == Chair){
                        obj.render(ctx2,true);
                    }
                    else if(obj != this.dragedObj.parent){
                        obj.render(ctx2);
                    }
                }
            }
            this.dragedObj.render(ctx2);
        }
    },

    putBack: function(){
        this.dragedObj.shape.centerX = this.beforeDrag.x;
        this.dragedObj.shape.centerY = this.beforeDrag.y;
        clearContext(ctx2);
        this.dragedObj.render(ctx2);
    },

    endDrag: function () {
        if (this.dragedObj) {
            if (this.dragedObj.constructor == Chair) {
                let hoveredTable = selectObject([allTables],this.dragedObj.parent);
                if (hoveredTable){
                        if(hoveredTable.chairs.size+1 <= hoveredTable.maxChairs){
                            this.dragedObj.changeTable(hoveredTable);
                        }
                        else{
                            messenger.show("tableFull2"); //msg full Table
                            this.putBack();
                        }
                }
                else {
                    let hoveredChair = selectObject([allChairs],this.dragedObj)
                    if(hoveredChair){
                        if(!this.dragedObj.swapPlace(hoveredChair)){
                            this.putBack();
                        }
                    }
                    else{
                        this.putBack();
                    }                  
                }
            }
            this.dragedObj = false;
        }
    },
};

const padlock = new class{
    constructor(){
        this.padlocks = document.getElementsByClassName("padlock");
        for(let padlock of this.padlocks){
            padlock.innerHTML = "Zablokuj Pozycje";
            padlock.classList.add("icon-lock-open");
            padlock.addEventListener("click",this.lockObj.bind(this));
        } 
    }

    lockObj(){
        (selectedObject.locked) ? selectedObject.locked = false : selectedObject.locked = true ;
        clearContext(ctx2);
        selectedObject.render(ctx2);
        this.refreshPadlocks();
        
    }

    refreshPadlocks(){
        let msg;
        let remClass;
        let addClass;
        if(selectedObject.locked){
            msg = "Odblokuj";
            remClass = "icon-lock-open";
            addClass = "icon-lock";
        }
        else{
            msg = "Zablokuj";
            remClass = "icon-lock";
            addClass = "icon-lock-open";
        }
        for(let padlock of this.padlocks){
            padlock.innerHTML = msg;
            padlock.classList.add(addClass);
            padlock.classList.remove(remClass);
        } 
    }
}


class Quest{
    constructor(name,lastName){
        if(!Quest.prototype.id) Quest.prototype.id = 0;
        this.id = `${Quest.prototype.id}`;
        Quest.prototype.id++;
        this.tools = questTools;
        this.seat = false;
        this.name = name;
        this.lastName = lastName;

        this.element = document.createElement("button");
        this.element.type = "button";
        this.element.value = this.id;
        this.searchElement = document.createElement("option");

        this.element.classList.add("standard-btn");
        this.element.addEventListener("click",this.tools.selectQuest.bind(this.tools))
        this.refresh();
    }

    refresh(){
        this.name = this.name.charAt(0).toUpperCase() + this.name.slice(1).toLowerCase();
        this.lastName = this.lastName.charAt(0).toUpperCase() + this.lastName.slice(1).toLowerCase();
        this.fullName = this.name + " " + this.lastName;
        this.element.innerHTML = this.fullName;
        this.searchElement.value = this.fullName
    }

    hide() {
        this.element.classList.add("hidden");
    }

    show() {
        this.element.classList.remove("hidden");
    }

    takeSeat(seat){
        if(seat.constructor == Chair){
            clearContext(ctx2);
            seat.quest = this;
            this.seat = seat;
            seat.render(ctx2);
            this.tools.selectMode();
        }
    }

    leaveSeat() {
        if(this.seat) {
            this.seat.disinfectAfterQuest();
        }
        this.seat = false;
        this.tools.selectMode();
    }

    leaveParty() {
        widgetsMenager.hideImportant();
        this.leaveSeat();
        this.element.outerHTML = "";
        this.searchElement.outerHTML = "";
    }

}

class Shape{
    constructor( rotation, size, width = 0 ){
        this.centerX = (appWindow.offsetWidth/2) + appWindow.scrollLeft - size/2;
        this.centerY = (appWindow.offsetHeight/2) + appWindow.scrollTop - size/2;
        this.rotation = (rotation) ? rotation:0 ;
        this.size = size;
        this.width = width;
    }

    textInside(text,ctx,color = "#000000"){
        text = new String(text)
        let lastColor = ctx.fillStyle;
        ctx.fillStyle = color;
        let splited = text.split(" ");
        for(let partOfText of splited){
            let line = splited.indexOf(partOfText);
            if(partOfText.length == 1){
                ctx.fillText(partOfText,this.centerX - 2, this.centerY +  3);
            }
            else{
                ctx.fillText(partOfText,this.centerX - 2 - (3*partOfText.length), (this.centerY +  3) + (line * 12));
            }
            
        }
        ctx.fillStyle = lastColor;
    }
}

class Circle extends Shape{
    constructor(rotation,size){
        super(rotation,size)
    }

    checkCollision(){
        let a = Math.abs(cursor.x - this.centerX);
        let b = Math.abs(cursor.y - this.centerY);
        let distance = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
        if (distance <= this.size / 2) return true;
    }

    render(ctx,stroke,color){
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.size / 2, 0, 2 * Math.PI);

        if(color){
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
        }
        
        (stroke) ? ctx.stroke() : ctx.fill();
    }
};

class Square extends Shape{
    constructor(rotation,size,width){
        super(rotation,size,width)
        this.corners = new Map();
    }

    countCorner(x, y, size, start = 0){
        let radians = (this.rotation + start) * Math.PI / 180;
        let x1 = x + Math.sin(radians) * size;
        let y1 = y + Math.cos(radians) * size;
        return { x: x1, y: y1, ad: [x1, y1] };
    }

    calculateCorenrs(){
        let buffor = this.countCorner(this.centerX, this.centerY, this.width / 2, 270)
        this.corners.p1 = this.countCorner(buffor.x, buffor.y, this.size / 2, 180);
        this.corners.p2 = this.countCorner(this.corners.p1.x, this.corners.p1.y, this.size);
        this.corners.p3 = this.countCorner(this.corners.p2.x, this.corners.p2.y, this.width, 90);
        this.corners.p4 = this.countCorner(this.corners.p1.x, this.corners.p1.y, this.width, 90);
        this.corners.center2 = this.countCorner(this.centerX, this.centerY, this.width / 2, 90)
        this.corners.center1 = buffor;
    }

    render(ctx,stroke,color){
        this.calculateCorenrs();
        ctx.beginPath();
        ctx.moveTo(this.corners.p1.x, this.corners.p1.y);
        ctx.lineTo(this.corners.p2.x, this.corners.p2.y);
        ctx.lineTo(this.corners.p3.x, this.corners.p3.y);
        ctx.lineTo(this.corners.p4.x, this.corners.p4.y);
        ctx.lineTo(this.corners.p1.x, this.corners.p1.y);
        if(color){
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
        }
        (stroke) ? ctx.stroke() : ctx.fill();

        
    }

    checkCollision(){
        let res = this.isPointInsideRectangle(
            cursor.x,
            cursor.y, 
            [this.centerX, this.centerY], 
            this.corners.p1.ad, 
            this.corners.p4.ad, 
            this.corners.p3.ad, 
            this.corners.p2.ad
            )
        if (res) return true;
    }

    isPointInsideRectangle(x, y, rectangleCenter, vertexA, vertexB, vertexC, vertexD) {
        const localX = x - rectangleCenter[0];
        const localY = y - rectangleCenter[1];
        const localVertexA = [vertexA[0] - rectangleCenter[0], vertexA[1] - rectangleCenter[1]];
        const localVertexB = [vertexB[0] - rectangleCenter[0], vertexB[1] - rectangleCenter[1]];
        const localVertexC = [vertexC[0] - rectangleCenter[0], vertexC[1] - rectangleCenter[1]];
        const localVertexD = [vertexD[0] - rectangleCenter[0], vertexD[1] - rectangleCenter[1]];
        const isLeftAB = this.isPointLeftOfEdge(localX, localY, localVertexA, localVertexB);
        const isLeftBC = this.isPointLeftOfEdge(localX, localY, localVertexB, localVertexC);
        const isLeftCD = this.isPointLeftOfEdge(localX, localY, localVertexC, localVertexD);
        const isLeftDA = this.isPointLeftOfEdge(localX, localY, localVertexD, localVertexA);
    
        if (isLeftAB && isLeftBC && isLeftCD && isLeftDA) {
            return true;
        } else {
            return false;
        }
    }
    
    isPointLeftOfEdge(x, y, edgeStart, edgeEnd) {
        const edgeVector = [edgeEnd[0] - edgeStart[0], edgeEnd[1] - edgeStart[1]];
        const pointVector = [x - edgeStart[0], y - edgeStart[1]];
        const crossProduct = edgeVector[0] * pointVector[1] - edgeVector[1] * pointVector[0];
        return crossProduct >= 0;
    }
}

class Furniture{
    constructor(shape,tools,color){
        this.shape = shape;
        this.tools = tools;
        this.color = color;
        this.locked = false;
    }

    rotate(e){
        let direction = e.target.getAttribute("value");
        clearContext(ctx2);
        this.shape.rotation += parseInt(direction);
        if (this.shape.rotation > 360) { this.shape.rotation = 0; }
        else if (this.shape.rotation < 0) { this.shape.rotation = 360; }
        this.render(ctx2);
    }
}

class Chair extends Furniture{
    constructor(parent){
        super(new Circle(0,22),chairTools)
        this.quest = false;
        this.parent = parent;
        allChairs.add(this);
        this.normalChair = true;
    }

    render(ctx){
        let lastColor = ctx.fillStyle;
        if (this.quest) {
            ctx.fillStyle = "#f73434";
        }
        else {
            if(this.normalChair){
                ctx.fillStyle = "#89b52b";
            }
            else{
                ctx.fillStyle = "#8f608e";
            }
        }

        this.shape.render(ctx);
        this.shape.textInside( this.parent.chairs.lookFor(this)+1, ctx )
        if(this.locked){
            ctx.strokeStyle = colors.locked;
            this.shape.render(ctx,true);
        }; 
    }

    disinfectAfterQuest(){
        clearContext(ctx2)
        this.quest = false;
        this.render(ctx2);
    }

    changeMode(){
        (this.normalChair) ? this.normalChair = false : this.normalChair = true;
        this.tools.refreshData();
        clearContext(ctx2)
        this.render(ctx2)
    }

    changeTable(newTable){
        clearContext(ctx2);
        this.parent.chairs.delete(this);
        this.parent.recalculate();
        this.parent = newTable;
        newTable.chairs.add(this);
        newTable.recalculate();
        renderAll();
    }

    swapPlace(otherChair){
        if(!otherChair.locked && !this.locked){
            let quest1 = otherChair.quest;
            let quest2 = this.quest;
            if(quest1) quest1.leaveSeat();
            if(quest2) quest2.leaveSeat();
            if(quest1) quest1.takeSeat(this);
            if(quest2) quest2.takeSeat(otherChair);
            clearContext(ctx2);
            renderAll();
            selectedObject = otherChair;
            this.tools.refreshData();
            return true;
        }
        else{
            messenger.show("error04");
            return false;
        }
    }
}

class Attraction extends Furniture{
    constructor(data){
        let rotation = (data.rotation) ? data.rotation : 0;

        if(data.circle){ super(new Circle(rotation,data.size), false, data.color)}
        else{ super(new Square(rotation,data.minWidth,data.size), false, data.color)}

        for(let key in data){
            this[key] = data[key];
        }

        this.tools = attractionsTools;
        this.recalculate(true)
    }

    render(ctx){
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;
        this.shape.render(ctx,this.onlyStroke);
        if (!this.hideText) this.shape.textInside(this.name,ctx);
        if(this.locked){
            ctx.strokeStyle = colors.locked;
            this.shape.render(ctx,true);
        }; 
    }

    recalculate(noRender){
        if(this.shape.size < this.minSize){
            this.shape.size = this.minSize;
        }
        else if(this.shape.size > this.maxSize){
            this.shape.size = this.maxSize
        }

        this.shape.width = this.shape.size * this.multiper;
        if(this.shape.width < this.minWidth){
            this.shape.width = this.minWidth;
        }
        if(!noRender){
            clearContext(ctx2)
            this.render(ctx2);
        }
    };

    resize(value){
        if(typeof value === "number"){
            this.shape.size += value;
            this.recalculate();
        }
    };

    changeMode(){
        let oldX = this.shape.centerX;
        let oldY = this.shape.centerY;
        if(this.shape.constructor == Circle){
            this.shape = new Square(this.shape.rotation,this.shape.width,this.shape.size);
        }
        else{
            this.shape = new Circle(this.shape.rotation,this.shape.size);
        }
        this.shape.centerX = oldX;
        this.shape.centerY = oldY;
        this.recalculate();
    };
};

class RoundTable extends Furniture{
    constructor(chairsCount = 2, sides = 1, rotation = 0){

        let multiper = sides * 1.9;
        let size = (chairsCount * (2 + multiper)) + 20;
        super(new Circle(rotation,size),tableTools,"#c9c963");

        this.sides = sides;
        this.chairs = new Set();
        this.maxChairs = 16;
    
        for (let startChairs = 0; startChairs < chairsCount; startChairs++) {
            let chair = new Chair(this);
            this.chairs.add(chair);
        }
    }

    render(ctx){
        ctx.fillStyle = this.color;
        this.shape.render(ctx);
        
        this.countChairsPositions(ctx);
        
        if(this.locked){
            ctx.strokeStyle = colors.locked;
            this.shape.render(ctx,true);
        }; 
    }


    countChairsPositions(ctx){
        let step = (360 / this.sides) / this.chairs.size;
        let angle = this.shape.rotation;
        let distance = (this.shape.size + 5) - (this.chairs.size * 2);
        for (let chair of this.chairs) {
            let radians = angle * Math.PI / 180;
            let newX = this.shape.centerX + (Math.sin(radians) * distance);
            let newY = this.shape.centerY + (Math.cos(radians) * distance);
            chair.shape.centerX = newX;
            chair.shape.centerY = newY;
            chair.radians = radians;
            chair.render(ctx);
            angle += step;
        }
    }

    recalculate(){
        clearContext(ctx2);
        let multiper = this.sides * 1.9;
        this.shape.size = (this.chairs.size * (2 + multiper)) + 20;
        this.render(ctx2);

    }

    changeMode(){
        (this.sides == 2) ? this.sides = 1 : this.sides = 2;
        this.recalculate();
    }
}

class SquareTable extends Furniture{
    constructor(chairsCount = 2, sides = 2, rotation = 0){

        let size = ((chairsCount / (sides * 2)) * 40) + 20;
        let width = 20 + (20 * sides);
        super(new Square(rotation,width,size),tableTools,"#c9c963")

        this.rotation = rotation;
        this.chairs = new Set();
        this.sides = sides;
        this.maxChairs = 100;
    
        for (let startChairs = 0; startChairs < chairsCount; startChairs++) {
            let chair = new Chair(this);
            this.chairs.add(chair);
        }
    }

    render(ctx) {
        ctx.fillStyle = this.color;
        this.shape.render(ctx);
        this.countChairsPositions(ctx);
        if(this.locked){
            ctx.strokeStyle = colors.locked;
            this.shape.render(ctx,true);
        }; 
    };

    countChairsPositions(ctx) {
        let oneSide = Math.ceil(this.chairs.size / this.sides);
        let step = this.shape.size / oneSide;
        let margin = step / 2;
        let i = 0;
        for(let chair of this.chairs){
            if (i < oneSide) {
                let distance = margin + (step * i);
                let point = this.shape.countCorner(this.shape.corners.p1.x, this.shape.corners.p1.y, distance, 0);
                point = this.shape.countCorner(point.x, point.y, 20, -90);
                chair.shape.centerX = point.x;
                chair.shape.centerY = point.y;
            }
            else {
                let distance = margin + step * (i - oneSide);
                let point = this.shape.countCorner(this.shape.corners.p4.x, this.shape.corners.p4.y, distance, 0);
                point = this.shape.countCorner(point.x, point.y, 20, 90);
                chair.shape.centerX = point.x;
                chair.shape.centerY = point.y;
            }
            chair.render(ctx)
            i++;
        }
    };

    recalculate() {
        clearContext(ctx2);
        this.shape.size = ((this.chairs.size / (this.sides * 2)) * 40) + 20;
        this.shape.width = 20 + (20 * this.sides);
        this.render(ctx2);

    };

    changeMode(){
        (this.sides == 2) ? this.sides = 1 : this.sides = 2;
        selectedObject.recalculate();
    };
}

//Canvas Functions
function clearContext(ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

function renderAll(exception) {
    clearContext(ctx);
    
    allTables.forEach(object => {
        if (object != exception) {
            object.render(ctx);
        }
    })

    allAttractions.forEach(object => {
        if (object != exception) {
            object.render(ctx);
        }
    })
};

// Base Functions (actionStart/Active/End represents Mouse or Touch event )
function actionStart(e) {
    if(e.target != canvas2) return false;
    cursor.tracking(e); // for fix bug with old postion on mobile devices
    let object = selectObject([allTables, allChairs,allAttractions]);
    if (object) {
        selectedObject = object;
        if (!selectedObject.locked) {
            draggingTool.startDrag(object);
        }
        else {
            clearContext(ctx2);
            selectedObject.render(ctx2)
            renderAll(selectedObject);
            selectedObject.tools.show()
        }
        clickHoldLoop.stop();
    }
    else if (selectedObject && e.target == canvas2){
        widgetsMenager.hideImportant()
        selectedObject = false;
        clearContext(ctx2);
        renderAll();
        dragScroll.start();
        
    }
    else{
        dragScroll.start();
    }
}

function actionActive(e){
    draggingTool.drag();
    if(!dragWidgetsTool.dragedWidget && e.target == canvas2){
        dragScroll.scroll();
    } 
    (selectObject([allAttractions,allChairs,allTables])) ? document.body.style.cursor = "pointer" : document.body.style.cursor = "default";
}

function actionEnd(){
    if (selectedObject) {
        padlock.refreshPadlocks();

        if(selectedObject.tools && draggingTool.dragedObj){ selectedObject.tools.show(); } 
        draggingTool.endDrag();

    }
    dragScroll.end();
    clickHoldLoop.stop();
}

function selectObject(lists,ignore){
    for (let list of lists) {
        for (let object of list) {
            if(object != ignore){
                if(object.shape.checkCollision())return object;
            }
        }
    }
}

//Tools Pined to specific object's 

let questTools = new class{
    constructor(){
        this.widget = new FloatingWidget( document.getElementById("quest-list") );
        this.modeDisplay = document.getElementById("quest-list-mode");
        this.selectedQuest = null;
        this.questList = document.getElementById("quest-list-box");
        this.clearMode = false;
        this.editMode = true;

        this.searchBar = {
            options : document.getElementById("quest-search-opt"),
            searchInput : document.getElementById("quest-search-bar"),
            countDisplay:document.getElementById("quest-search-results"),

            filter: function (filterFunc){
                let sum = 0;
                for (let quest of allQuests) {
                    quest = quest[1];
                    if(filterFunc(quest)){
                        quest.show();
                        sum++;
                    }
                    else{ 
                        quest.hide();  
                    }
                }
                
                this.countDisplay.innerHTML = `${sum} wyników `;
            },
        }

        this.addQuestWidget = {
            nameInput : document.getElementById("new-quest-name"),
            lastNameInput : document.getElementById("new-quest-lastName"),
            checkbox : document.getElementById("remove-lastName")
        }

        let buffor = new FloatingWidget( document.getElementById("edit-quest"));
        this.editQuestWidget = {
            widget:buffor,
            nameInput : document.getElementById("edit-quest-name"),
            lastNameInput : document.getElementById("edit-quest-lastName"),

            show:function(quest){
                this.nameInput.value = quest.name;
                this.lastNameInput.value = quest.lastName;
                this.widget.show()
            }
        }

        document.getElementById("new-quest-submit").addEventListener("click",this.addQuest.bind(this));
        document.getElementById("edit-quest-submit").addEventListener("click",this.editQuest.bind(this));
        document.getElementById("remove-quest-btn").addEventListener("click",()=>{
            messenger.show("beforeRemove",questTools.removeObject.bind(questTools))
        });

        document.getElementById("chair-tools-editQuest").addEventListener("click", function(e){
            let quest = selectedObject.quest;
            if(quest){
                this.refresh();
                this.editQuestWidget.show(quest);
            }
        }.bind(this));

        document.getElementById("chair-tools-relaseChair").addEventListener("click",()=>{
            clearContext(ctx2);
            selectedObject.quest.leaveSeat();
            selectedObject.disinfectAfterQuest();
            this.refresh();
        })
        this.addQuestWidget.checkbox.addEventListener("input",this.switchClearMode.bind(this));

        for(let btn of  document.querySelectorAll("button[value=quest-list]")){
            btn.addEventListener("click",this.selectMode.bind(this));
        }

    }

    selectMode(){
        console.log("SELECT MODE")
        if(selectedObject){
            if(selectedObject.constructor == Chair && !selectedObject.quest){
                this.editMode = false;
                this.modeDisplay.innerHTML = "Tryb Usadzania gości";
            }
            else{
                this.editMode = true;
                this.modeDisplay.innerHTML = "Tryb edycji gości";
            }
        }
        else{
            this.editMode = true;
            this.modeDisplay.innerHTML = "Tryb edycji gości";
        }
        this.refresh();
    }
    
    refresh(){
        if(this.editMode){
            this.searchBar.filter(()=>{return true})
        }
        else{
            this.searchBar.filter( (quest)=>{
                if(quest.seat){ return false }
                else{ return true }
        })
        }
    }

    addQuest(){
        let name = this.addQuestWidget.nameInput.value;
        if(this.nameValidator(name)){
            let lastName = this.addQuestWidget.lastNameInput.value;
            let quest = new Quest(name,lastName);
            this.questList.appendChild(quest.element);
            this.searchBar.options.appendChild(quest.searchElement);
            allQuests.set(quest.id,quest);
        }
        this.clearInputs( this.addQuestWidget, this.clearMode );
        this.refresh();
    }

    editQuest(){
        if(this.selectedQuest){
            let name = this.editQuestWidget.nameInput.value;
            if(this.nameValidator(name)){
                let lastName = this.editQuestWidget.lastNameInput.value;
                this.selectedQuest.name = name;
                this.selectedQuest.lastName = lastName;
                this.selectedQuest.refresh();
                chairTools.refreshData();
                this.editQuestWidget.widget.hide();
            }
        }
    }

    switchClearMode(){
        (this.clearMode) ? this.clearMode = false : this.clearMode = true ;
    }

    clearInputs(widget,clearMode){
        widget.nameInput.value = "";
        if(clearMode){
            widget.lastNameInput.value = "";
        }
    }

    nameValidator(name){
        if (!name || name.trim() == "") {
            return false;
        }
        return true
    }

    selectQuest(event){
        let quest = allQuests.get(event.target.value);
        if(quest){
            this.selectedQuest = quest;

                if(this.editMode){
                this.clearInputs(this.editQuestWidget,true)
                this.editQuestWidget.show(this.selectedQuest)
                }
    
                else{
                    this.selectedQuest.takeSeat(selectedObject);
                    this.refresh();
                    widgetsMenager.hideImportant();
                    chairTools.refreshData();
                }
        }
    }

    removeObject(){
        console.log("STARTUJE")
        if(this.selectedQuest){
            this.editQuestWidget.widget.hide()
            this.selectedQuest.leaveSeat();
            this.selectedQuest.leaveParty();
            if(allQuests.delete(this.selectedQuest.id)) console.log("Quest Removed");
            this.refresh();
        }
    }
}

let tableTools = new class{
    constructor(){
        this.widget = new FloatingWidget( document.getElementById("tools-table") );
        this.idDisplay = document.getElementById("tableID");
        this.extraDisplay = document.getElementById("tableChairs");

        document.getElementById("add-chair-btn").addEventListener("click",this.addChair.bind(this))
        document.getElementById("remove-chair-btn").addEventListener("click",this.removeChair.bind(this))
    }

    show(){
        this.widget.show(true);
        this.refreshData();
    }

    refreshData(){
        this.idDisplay.innerHTML = [...allTables].indexOf(selectedObject) + 1;
        this.extraDisplay.innerHTML = `Krzesła: ${selectedObject.chairs.size} / ${selectedObject.maxChairs}`;
    }

    removeObject(){
        for (let chair of selectedObject.chairs) {
            if (chair.locked) {
                console.log(chair)
                messenger.show("error03");
                return false;
            }
        }
        if(allTables.delete(selectedObject)){
            for (let chair of selectedObject.chairs) {
                if (chair.quest){
                    chair.quest.leaveSeat();
                }
                allChairs.delete(chair)
            }

            widgetsMenager.hideImportant();

        }
        selectedObject = false;
        clearContext(ctx2);
        renderAll();
    }

    copyObject(){
        let table = new selectedObject.constructor(selectedObject.chairs.size, selectedObject.sides, selectedObject.shape.rotation);
        table.shape.centerX = selectedObject.shape.centerX - 1;
        table.shape.centerY = selectedObject.shape.centerY - 1;
        allTables.add(table);
        table.render(ctx)
    }
    
    addChair(){
        if (selectedObject.chairs.size < selectedObject.maxChairs) {
            let chair = new Chair(selectedObject);
            selectedObject.chairs.add(chair);
            selectedObject.recalculate();
            this.refreshData();
        }
        else{
            messenger.show("tableFull");
        }
    }

    removeChair(){
        if(selectedObject.chairs.size > 0){
            let selectedChair = this.selectChairToRemove();
            if(!selectedChair){
                messenger.show("error02")
            }
            else if(!selectedChair.quest){
                chairTools.removeObject(selectedChair);
                this.refreshData();
            }
            else{
                messenger.show("removeBusyChair",(chair)=>{
                    chairTools.removeObject(chair);
                    tableTools.refreshData();
                },false,selectedChair)
            }
        }
    }

    selectChairToRemove() {
        let noLocked = [];
        for (let chair of selectedObject.chairs) {
            if (!chair.quest && !chair.locked) {
                return chair;
            }
            else if (!chair.locked) {
                noLocked.push(chair);
            }
        }
        return noLocked[0]; // if no found free chair remove first busy but not locked
    };
}

let chairTools = new class{
    constructor(){
        this.widget =  new FloatingWidget( document.getElementById("tools-chair") );
        this.title =  document.getElementById("chair-title");
        this.id =  document.getElementById("chair-id");
        this.subtitle = document.getElementById("chair-subtitle");

        this.freeChairElements = {
            questBtn:document.getElementById("chair-tools-addQuest")
        };

        this.busyChairElements = {
            questBtn:document.getElementById("chair-tools-relaseChair"),
            editQuestBtn:document.getElementById("chair-tools-editQuest"),
        };
        this.busyChairElements.questBtn.addEventListener("click",this.refreshData.bind(this));
    }

    show(){
        this.refreshData();
        if(questTools.widget.hidden){
            this.widget.show(true);
        }
        else if(!questTools.widget.hidden && questTools.editMode){
            this.widget.show(true);
        }
    }

    refreshData(){
        if(selectedObject && selectedObject.constructor == Chair){

            let index = selectedObject.parent.chairs.lookFor(selectedObject) +1;
            this.title.innerHTML = this.getChairType();
            this.id.innerHTML = index;
            let quest = selectedObject.quest
            if(quest){
                this.switchElements( this.busyChairElements , this.freeChairElements );
                this.subtitle.innerHTML = quest.fullName;
            }
            else {
                this.switchElements( this.freeChairElements , this.busyChairElements );
                this.subtitle.innerHTML = "Wolne";
            }

        }

    }

    switchElements(show,hide){
        for(let key in show){
            let widget = show[key];
            widget.classList.remove("hidden");
        };

        for(let key in hide){
            let widget = hide[key];
            widget.classList.add("hidden");
        };

    }

    getChairType(){
        return (selectedObject.normalChair) ? "Krzesło" : "Krzeseło dla dziecka";
    }

    removeObject(obj){
        let chair = (obj || selectedObject);
        
        clearContext(ctx2);
        if (chair.quest) {
            chair.quest.leaveSeat();
        }
        
        chair.parent.chairs.delete(chair);
        allChairs.delete(chair);
        chair.parent.recalculate();
        
        if(!obj){
          renderAll();
          widgetsMenager.hideImportant();
        } 
    }
};

let attractionsTools = new class{
    constructor(){
        this.widget = new FloatingWidget( document.getElementById("tools-attraction") );
        this.title =  document.getElementById("attraction-title");
        this.subtitle = document.getElementById("attraction-subtitle");
        this.shapeBtn = this.widget.element.querySelector("button[name=change-object-mode]");

        for(let btn of document.getElementsByName("change-object-size")){
            let value = parseInt(btn.value)
            btn.addEventListener("mousedown",(e)=>{
                if(e.button == 0){
                    clickHoldLoop.start(selectedObject.resize.bind(selectedObject),value)
                }
            })
        
            btn.addEventListener("touchstart",(e)=>{ clickHoldLoop.start( selectedObject.resize.bind(selectedObject), value ) })
            btn.addEventListener("mouseleave",()=>{clickHoldLoop.stop()})
        }
    }

    show() {
        (selectedObject.blockShape) ? this.shapeBtn.disabled = true : this.shapeBtn.disabled = false ;
        this.widget.show(true)
        this.title.innerHTML = selectedObject.name;
    }

    copyObject(){
        let data = availableAttractions.get(selectedObject.id)
        let attraction = new Attraction(data)
        attraction.shape = new selectedObject.shape.constructor(selectedObject.shape.rotation,selectedObject.shape.size,selectedObject.shape.width)
        attraction.shape.centerX = selectedObject.shape.centerX - 1;
        attraction.shape.centerY = selectedObject.shape.centerY - 1;
        allAttractions.add(attraction)
        attraction.render(ctx);
    }

};

//let notesTools in future



//Listeners
for(let btn of document.getElementsByName("add-table-btn")){
    btn.addEventListener("click",(e)=>{
        let table;
        if(e.target.value == "Circle"){
            table = new RoundTable(2,1,0);
        }
        else if(e.target.value == "Square"){
            table = new SquareTable(2,2,0);
        }

        if(table){
            allTables.add(table);
            table.render(ctx);
        } 
    })
}

for(let btn of document.getElementsByName("rotate-object-btn")){
    btn.addEventListener("mousedown",(e)=>{
        if(e.button == 0){
            clickHoldLoop.start(selectedObject.rotate.bind(selectedObject),e)
        }
    })

    btn.addEventListener("touchstart",(e)=>{ clickHoldLoop.start( selectedObject.rotate.bind(selectedObject), e ) })
    btn.addEventListener("mouseleave",()=>{clickHoldLoop.stop()})
}

for(let btn of document.getElementsByName("remove-object-btn")){
    btn.addEventListener("click", ()=>{  
        if( selectedObject ) {
            if( !selectedObject.locked ){
                messenger.show("beforeRemove",selectedObject.tools.removeObject)
            } 
            else{ messenger.show("error01") }
        }; 
    });
}

for(let btn of document.getElementsByName("change-object-mode")){
    btn.addEventListener("click",()=>{ selectedObject.changeMode(); });
}

for(let btn of document.getElementsByName("copy-object")){
    btn.addEventListener("click",()=>{ selectedObject.tools.copyObject(); });
}

addEventListener("mousemove",cursor.tracking.bind(cursor));
addEventListener("touchmove",cursor.tracking.bind(cursor));
addEventListener("mousedown",actionStart)
addEventListener("touchstart",actionStart)
addEventListener("mouseup", actionEnd);
addEventListener("touchend", actionEnd);
addEventListener("touchcancel",()=>{clickHoldLoop.stop()});
addEventListener("touchend",()=>{clickHoldLoop.stop()});
appWindow.addEventListener("mousemove",actionActive);
appWindow.addEventListener("touchmove",actionActive);

//First loading

let stateCheck = setInterval(() => {
    if (document.readyState === 'complete') {
      clearInterval(stateCheck);
      
      (function(){
        const attractionsJsonURL = " https://raw.githubusercontent.com/MateuszRak0/Guest-seating-planner/main/data/attractions.json ";
        const messagesJsonURL = "https://raw.githubusercontent.com/MateuszRak0/Guest-seating-planner/main/data/messages.json";

        let loader = {
            toLoad:1,
            loaded:0,
            progressText: document.getElementById("loading-progress-text"),
            progressBar: document.getElementById("loading-progress-bar"),
            messages: [ " Zapraszanie gości... "," Planowanie ceremoni "," Dekorowanie sali "," Wybieranie Sukni "],

            updateStatus: function(){
                this.loaded ++;
                let value = 100/this.toLoad;
                this.progressBar.value += value;
                this.progressText.innerHTML = this.messages[this.loaded]
                if(this.loaded == this.toLoad - 1) setTimeout(()=>{loader.updateStatus()},100);
                if(this.loaded == this.toLoad){
                    this.hideWidget();
                    messenger.show("welcome")
                } 
            },

            loadData: function(url,callback){
                this.toLoad ++;
                fetch(url)
                .then( response => { return response.json() } )
                .then( data => { 
                    callback(data);
                    loader.updateStatus();
                 } )
                .catch(error => { loader.loadError(error)})
            },

            hideWidget: function(){
                document.getElementById("loading-window").classList.remove("active");
            },

            loadError:function(error){
                this.hideWidget();
                messenger.show("loadingError",()=>{location.reload()});
            }

        }
    
        function unpackAttractions(attractions){
            const buttonsContainer = document.getElementById("obj-vert-list");
            for(let id in attractions){
                const data = attractions[id];
                availableAttractions.set(id,data);
    
                let btn = document.createElement("button");
                btn.type = "button";
                btn.value = id;
                btn.innerHTML = data.name;
                buttonsContainer.appendChild(btn);
    
                btn.addEventListener("click",(e)=>{
                    let data = availableAttractions.get(e.target.value);
                    if(data){
                        let attraction = new Attraction(data);
                        attraction.render(ctx);
                        allAttractions.add(attraction);
                    }
                })
            }
        }
    
        function unpackMessages(messages){
            Object.assign(messenger.allMessages,messages)
        }
        
        widgetsMenager.loadFromDocument();
        window.oncontextmenu = function(){ return false; } // cancel default menu

        questTools.addQuest(); // Add Test Quest

        loader.loadData( attractionsJsonURL, unpackAttractions );
        loader.loadData( messagesJsonURL, unpackMessages );
        
    }())
    }
  }, 100);
