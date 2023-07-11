const appWindow = document.getElementById("app-window");
const canvas = document.getElementById("main-canvas");
const canvas2 = document.getElementById("second-canvas");
const ctx = canvas.getContext("2d");
const ctx2 = canvas2.getContext("2d");// second canvas to not refresh all tables and chairs when moving one of them
ctx.fillStyle = "#c48545";
ctx2.fillStyle = "#64b327";
ctx.font = "14px monospace";
ctx2.font = "14px monospace";

let allTables = [];
let allChairs = [];
let selectedObject;

// Base tools ( always active )
let cursor = {
    x:0,
    y:0,
    
    tracking:function(event){
        this.x = event.offsetX;
        this.y = event.offsetY;
    }
};

let draggingTool = {
    dragedObj:false,
    marginX:0,
    marginY:0,
    beforeDrag:{},

    startDrag:function(object){
        if(object){
            this.beforeDrag.x = object.centerX;
            this.beforeDrag.y = object.centerY;
            this.marginX = cursor.x - object.centerX;
            this.marginY = cursor.y - object.centerY;
            this.dragedObj = object;
            clearContext(ctx2)
            renderAll(object);
            object.render(ctx2);
        }
    },

    drag:function(){
        if(this.dragedObj){
            this.dragedObj.centerX = cursor.x - this.marginX;
            this.dragedObj.centerY = cursor.y - this.marginY;
            clearContext(ctx2);
            this.dragedObj.render(ctx2);
            if(this.dragedObj.constructor == Chair){
                let obj = selectObject([allTables]);
                if(obj && obj != this.dragedObj.parent) obj.render(ctx2); // focus table when drag chair over it
            }
        }
    },

    endDrag:function(){
        if(this.dragedObj){
            if(this.dragedObj.constructor != Chair){
                showTableTools();
            }
            else{
                let hoveredTable = selectObject([allTables]);
                if(hoveredTable){
                    if(hoveredTable != this.dragedObj.parent){
                        replaceChair(hoveredTable);
                        this.dragedObj = false;
                    }
                    else{
                        clearContext(ctx2);
                        this.dragedObj.centerX = this.beforeDrag.x;
                        this.dragedObj.centerY = this.beforeDrag.y;
                        this.dragedObj.render(ctx2);
                        this.dragedObj = false;
                    }
                }
                else{
                    this.dragedObj.centerX = this.beforeDrag.x;
                    this.dragedObj.centerY = this.beforeDrag.y;
                    clearContext(ctx2);
                    this.dragedObj.render(ctx2);
                    this.dragedObj = false;
                }
            }
            this.dragedObj = false;
        }
    },
}

let popupsMenager = {
    allPopups:{},
    actualShowed:null,

    loadPopups:function(){
        for(let page of document.getElementsByClassName("popup")){
            let name = page.getAttribute("name");
            this.allPopups[name] = page;
        }

        for(let btn of document.getElementsByName("show-popup-button")){
            btn.addEventListener("click",this.activePopup.bind(this))
        }

        for(let btn of document.getElementsByClassName("popup-disbtn")){
            btn.addEventListener("click",this.disablePopop.bind(this));
        }

    },

    disablePopop:function(){
        if(this.actualShowed){
            this.actualShowed.classList.remove("active");
            this.actualShowed = false;
        }
    },

    activePopup:function(event){
        this.disablePopop();
        let popupName = event.currentTarget.getAttribute("value");
        this.actualShowed = this.allPopups[popupName];
        this.actualShowed.classList.add("active");
    }

}

let questsList = {
    listOjbect:document.getElementById("quest-big-list"),
    nameInput:document.getElementById("quest-name-input"),
    lastNameInput:document.getElementById("quest-lastName-input"),
    countDisplays:document.getElementsByClassName("questCount"),
    searchOptions:document.getElementById("search-options"),
    messegeBox:document.querySelector("[name=addQuestMessege]"),


    selectedQuest:null,
    quests:{},
    nextFunc:null,

    addQuest:function(){
        let name = this.nameInput.value;
        if(!name || name.trim() == ""){
            this.messegeBox.style.color = "#ff0000";
            this.messegeBox.innerHTML = "Podaj Jakieś imię !";
            return false;
        } else{
            this.messegeBox.style.color = "#00ff00";
            this.messegeBox.innerHTML = "Pomyślnie dodano";
        }
        let lastName = this.lastNameInput.value;
        let quest = new Quest(name,lastName);
        let elements = this.renderQuest(quest);
        let searchOption = document.createElement("option");
        searchOption.value = quest.name +" "+ quest.lastName;
        this.searchOptions.appendChild(searchOption);

        this.quests[quest.id] = {
            data:quest,
            element:elements[0],
            smallElement:elements[1],
            searchOption:searchOption,
        };

        refreshDisplays();
    },

    renderQuest:function(quest){
        let button = document.createElement("button");
        button.innerHTML = quest.name + " " + quest.lastName;
        button.value = quest.id;
        button.addEventListener("click",takeSeat)
        let li = document.createElement("li");
        let questCard = 
            `
                <i class="icon-wrench" name="edit" value="${quest.id}"></i>
                <i class="icon-trash" name="remove" value="${quest.id}"></i>
                <input type="text" value="${quest.name}" placeholder="Imię " name='name' disabled>
                <input type="text" value="${quest.lastName}" placeholder="Nazwisko"  name='lastName' disabled>  
                <button type="button" name="accept" disabled >&#10004;</button>
            `
        li.innerHTML = questCard;
        this.listOjbect.appendChild(li);
        document.getElementById("quest-small-list").appendChild(button)
        let btnTools = li.querySelector('[name="edit"]');
        let btnRemove = li.querySelector('[name="remove"]');

        btnTools.addEventListener("click",this.activeEditMode.bind(this))
        btnRemove.addEventListener("click",this.removeQuest.bind(this))
        return [li,button];
    },


    removeQuest:function(e){
        let id = e.target.getAttribute("value");
        let obj = this.quests[id];
        obj.searchOption.outerHTML = "";
        obj.element.outerHTML = "";
        obj.smallElement.outerHTML = "";
        delete this.quests[id];
        refreshDisplays();
    },

    EditQuestData:function(){
        for(let input of this.selectedQuest.element.querySelectorAll("input")){
            this.selectedQuest.data[input.name] = input.value;
            input.disabled = true;
        } 
        this.selectedQuest.searchOption.value = this.selectedQuest.data.name +" "+ this.selectedQuest.data.lastName;
        this.selectedQuest.smallElement.innerHTML = this.selectedQuest.data.name +" "+ this.selectedQuest.data.lastName;
        let btn = this.selectedQuest.element.querySelector('button[name=accept]');
        btn.disabled = true;
    },
    

    activeEditMode:function(e){
        let id = e.target.getAttribute("value");
        let obj = this.quests[id];
        this.selectedQuest = obj;
        for(let input of obj.element.querySelectorAll("input")){
            input.disabled = false;
        } 
        let btn = obj.element.querySelector('button[name=accept]');
        btn.disabled = false;
        btn.addEventListener("click",this.EditQuestData.bind(this))
    },

}



//Tables, chair & quest Constructors 

function RoundTable(chairsCount = 2,sides = 1,rotation = 0){
    this.rotation = rotation;
    this.chairs = [];
    this.sides = sides;
    this.centerX = 150 + appWindow.scrollLeft;
    this.centerY = 150 + appWindow.scrollTop;
    this.maxChairs = 20/this.sides;

    for(let startChairs = 0; startChairs < chairsCount; startChairs++){
        let chair = new Chair(this);
        this.chairs.push(chair);
    }

    let multiper = this.sides*1.9;
    this.size = (this.chairs.length * (2+multiper)) + 20;

    this.render = function(ctx){
        ctx.beginPath();
        ctx.arc(this.centerX,this.centerY,this.size/2, 0, 2 * Math.PI);
        ctx.fill();
       // ctx.fillRect(this.centerX-1,this.centerY-1,2,2);
        this.countChairsPositions(ctx);
    };

    this.countChairsPositions = function(ctx){
        let step = (360/this.sides)/this.chairs.length;
        let angle = this.rotation;
        let distance = (this.size + 5) - (this.chairs.length*2);
        for(let chair of this.chairs){
            let radians = angle * Math.PI/180;
            newX = this.centerX + ( Math.sin(radians)*distance );
            newY = this.centerY + ( Math.cos(radians)*distance );
            chair.centerX = newX;
            chair.centerY = newY;
            chair.render(ctx)
            angle += step;
        }
    };

    this.recalculate = function(){
        clearContext(ctx2);
        let multiper = this.sides*1.9;
        this.size = (this.chairs.length * (2+multiper)) + 20;
        this.maxChairs = 20/this.sides;
        if(this.chairs.length > this.maxChairs){
            this.removeChair();
        }
        else{
            this.render(ctx2);
        }
    };

    this.addChair = function(){
        if(this.chairs.length < this.maxChairs){
            let chair = new Chair(this);
            this.chairs.push(chair);
            this.recalculate();
        }
    };

    this.removeChair = function(){
        let chair = this.chairs.pop();
        this.recalculate();
        return chair;
    };

}

function SquareTable(chairsCount = 2,sides = 2,rotation = 0){
    this.rotation = rotation;
    this.chairs = [];
    this.sides = sides;
    this.width = 20 + (20*this.sides);
    this.centerX = 150 + appWindow.scrollLeft;
    this.centerY = 150 + appWindow.scrollTop;
    this.maxChairs = 50*this.sides;
    this.corners = {
        p1:null,
        p2:null,
        p3:null,
        p4:null,
        center1:null,
        center2:null,
    }

    for(let startChairs = 0; startChairs < chairsCount; startChairs++){
        let chair = new Chair(this);
        this.chairs.push(chair);
    }

    this.size = ((this.chairs.length/(this.sides*2)) * 40)+20;

    this.render = function(ctx){
        this.calculateCorenrs();
        ctx.beginPath();
        ctx.moveTo(this.corners.p1.x,this.corners.p1.y);
        ctx.lineTo(this.corners.p2.x,this.corners.p2.y);
        ctx.lineTo(this.corners.p3.x,this.corners.p3.y);
        ctx.lineTo(this.corners.p4.x,this.corners.p4.y);
        ctx.lineTo(this.corners.p1.x,this.corners.p1.y);
        ctx.fill();
       // ctx.fillRect(this.centerX-1,this.centerY-1,2,2) // center
        this.countChairsPositions(ctx);
    };


    this.countCorner = function(x,y,size,start = 0){
        let radians = (this.rotation + start) * Math.PI/180;
        let x1 = x + Math.sin(radians)*size;
        let y1 = y +  Math.cos(radians)*size;
        return {x:x1 , y:y1,ad:[x1,y1]};
    };


    this.calculateCorenrs = function(){
        let buffor = this.countCorner(this.centerX,this.centerY,this.width/2,270)
        this.corners.p1 = this.countCorner(buffor.x,buffor.y,this.size/2,180);
        this.corners.p2 = this.countCorner(this.corners.p1.x,this.corners.p1.y,this.size);
        this.corners.p3 = this.countCorner(this.corners.p2.x,this.corners.p2.y,this.width,90);
        this.corners.p4 = this.countCorner(this.corners.p1.x,this.corners.p1.y,this.width,90);
        this.corners.center2 = this.countCorner(this.centerX,this.centerY,this.width/2,90)
        this.corners.center1 = buffor;
    }

    this.countChairsPositions = function(ctx){
        let oneSide = Math.ceil(this.chairs.length/this.sides);
        let step = this.size / oneSide;
        let margin = step/2;
        for(let i = 0; i < this.chairs.length; i++){
            let chair = this.chairs[i];
            if(i < oneSide){
                let distance = margin +(step * i);
                let point = this.countCorner(this.corners.p1.x,this.corners.p1.y,distance,0);
                point = this.countCorner(point.x,point.y,20,-90);
                chair.centerX = point.x;
                chair.centerY = point.y;
            }
            else{
                let distance = margin + step * (i - oneSide);
                let point = this.countCorner(this.corners.p4.x,this.corners.p4.y,distance,0);
                point = this.countCorner(point.x,point.y,20,90);
                chair.centerX = point.x;
                chair.centerY = point.y;
            }
            chair.render(ctx)
        }
    };

    this.recalculate = function(){
        clearContext(ctx2);
        this.size = ((this.chairs.length/(this.sides*2)) * 40)+20;
        this.width = 20 + (20*this.sides);
        this.maxChairs = 50*this.sides;
        if(this.chairs.length > this.maxChairs){
            this.removeChair();
        }
        else{
            this.render(ctx2);
        }
    };

    this.addChair = function(){
        if(this.chairs.length < this.maxChairs){
            let chair = new Chair(this);
            this.chairs.push(chair);
            this.recalculate();
        }
    };

    this.removeChair = function(){
        let chair = this.chairs.pop();
        this.recalculate();
        return chair;
    };
    
}

function Chair(parent){
    this.occupied = false;
    this.quest = false;
    this.parent = parent;
    this.size = 20;
    this.centerX;
    this.centerY;
    allChairs.push(this);

    this.render = function(ctx){
        ctx.beginPath();
        ctx.arc(this.centerX,this.centerY,this.size/2, 0, 2 * Math.PI);
        ctx.stroke();
        if(this == selectedObject){
            ctx.fill();
        }
        else if(this.occupied == true){
            ctx.fill();
        }
    };
}

function Quest(name,lastName){
    if(!this.nextID) Quest.prototype.nextID = 0;
    this.name = name;
    this.seat;
    this.lastName = lastName;
    this.id = `q-${this.nextID}`;
    Quest.prototype.nextID ++;
}

// Base Functions

function clearContext(ctx){
    ctx.clearRect(0,0,canvas.width,canvas.height);
}

function renderAll(exception){
    clearContext(ctx);
    allTables.forEach(object=>{
        if(object != exception){
            object.render(ctx);
        }
    })
}

function isPointInsideRectangle(x, y, rectangleCenter, vertexA, vertexB, vertexC, vertexD) {
    const localX = x - rectangleCenter[0];
    const localY = y - rectangleCenter[1];
    const localVertexA = [vertexA[0] - rectangleCenter[0], vertexA[1] - rectangleCenter[1]];
    const localVertexB = [vertexB[0] - rectangleCenter[0], vertexB[1] - rectangleCenter[1]];
    const localVertexC = [vertexC[0] - rectangleCenter[0], vertexC[1] - rectangleCenter[1]];
    const localVertexD = [vertexD[0] - rectangleCenter[0], vertexD[1] - rectangleCenter[1]];
    const isLeftAB = isPointLeftOfEdge(localX, localY, localVertexA, localVertexB);
    const isLeftBC = isPointLeftOfEdge(localX, localY, localVertexB, localVertexC);
    const isLeftCD = isPointLeftOfEdge(localX, localY, localVertexC, localVertexD);
    const isLeftDA = isPointLeftOfEdge(localX, localY, localVertexD, localVertexA);
  
    if (isLeftAB && isLeftBC && isLeftCD && isLeftDA) {
      return true;
    } else {
      return false;
    }
}
  
  function isPointLeftOfEdge(x, y, edgeStart, edgeEnd) {
    const edgeVector = [edgeEnd[0] - edgeStart[0], edgeEnd[1] - edgeStart[1]];
    const pointVector = [x - edgeStart[0], y - edgeStart[1]];
    const crossProduct = edgeVector[0] * pointVector[1] - edgeVector[1] * pointVector[0];
    return crossProduct >= 0;
  }

function selectObject(lists){
    for(let list of lists){
        for (let object of list){
            if(object.constructor != SquareTable){
                let a = Math.abs(cursor.x - object.centerX);
                let b = Math.abs(cursor.y - object.centerY);
                let distance = Math.sqrt(Math.pow(a,2) + Math.pow(b,2));
                if(distance <= object.size/2) return object;
                
            } 
            else{
                let res = isPointInsideRectangle(cursor.x,cursor.y,[object.centerX,object.centerY],object.corners.p1.ad,object.corners.p4.ad,object.corners.p3.ad,object.corners.p2.ad)
                if(res){
                    return object
                }
            }
        }
    }
}

function mouseDown(){
    let object = selectObject([allTables,allChairs]);
    if(object){
        selectedObject = object;

        if(object.constructor == Chair){
            showChairTools(object.occupied);
            hideTableTool();
        }else{
            hideChairTool();
        }

        draggingTool.startDrag(object);
    }
    else{
        hideTableTool();
        hideChairTool();
    }
}

function refreshDisplays(){
    let quests = Object.keys(questsList.quests).length;
    let chairs = allChairs.length;

    for(let display of questsList.countDisplays){
        if(quests > chairs){display.style.color = "#ff0000";} 
        else{display.style.color = "#000000";}
        display.innerHTML = quests;
    }

    for(let display of document.getElementsByClassName("chairCount")){
        display.innerHTML = chairs;
    }

    for(let display of document.getElementsByClassName("tableCount")){
        display.innerHTML = allTables.length;
    }
}

// Table tools \/
function showTableTools(){
    let popupWindow = document.getElementById("table-edit-menu");
    popupWindow.classList.add("active");
    let posX = cursor.x + 50;
    let posY = cursor.y - 60;
    document.getElementById("tableInfo").innerHTML = `chairs: ${selectedObject.chairs.length} / ${selectedObject.maxChairs}`;


    popupWindow.style.left = `${posX}px`;
    popupWindow.style.top = `${posY}px`;
}

function hideTableTool(){
    let popupWindow = document.getElementById("table-edit-menu");
    popupWindow.classList.remove("active");
}

function removeTable(){
    let index = allTables.indexOf(selectedObject);
    allTables.splice(index,1);
    for(let chair of selectedObject.chairs){
        let index = allChairs.indexOf(chair);
        allChairs.splice(index,1);
    }
    selectedObject = false;
    clearContext(ctx2);
    hideTableTool();
    renderAll();
    refreshDisplays();
}

function rotateTable(event){
    let direction = event.target.getAttribute("value");
    clearContext(ctx2);
    selectedObject.rotation += (10*direction);
    if(selectedObject.rotation > 360){selectedObject.rotation = 0;} 
    else if (selectedObject.rotation < 0){selectedObject.rotation = 360;} 
    selectedObject.render(ctx2);
}

function copyTable(){
    let table = new selectedObject.constructor(selectedObject.chairs.length,selectedObject.sides,selectedObject.rotation);
    allTables.push(table);
    refreshDisplays();
    table.render(ctx);
}

function changeTableMode(){
    (selectedObject.sides == 2) ? selectedObject.sides = 1 : selectedObject.sides = 2 ;
    selectedObject.recalculate();
    document.getElementById("tableInfo").innerHTML = `chairs: ${selectedObject.chairs.length} / ${selectedObject.maxChairs}`;
    
}
// Chair/quest Tools
function showChairTools(occupied){
    let popupWindow = document.getElementById("chair-edit-menu");
    popupWindow.classList.add("active");
    let posX = cursor.x + 50;
    let posY = cursor.y - 60;
    document.getElementById("chairInfo").innerHTML = `Krzesło nr: ${allChairs.indexOf(selectedObject)+1}`;
    

    popupWindow.style.left = `${posX}px`;
    popupWindow.style.top = `${posY}px`;
}

function hideChairTool(){
    let popupWindow = document.getElementById("chair-edit-menu");
    popupWindow.classList.remove("active");
}

function replaceChair(newTable){
    clearContext(ctx2);
    let index = selectedObject.parent.chairs.indexOf(selectedObject);
    selectedObject.parent.chairs.splice(index,1);
    selectedObject.parent.recalculate();
    selectedObject.parent = newTable;
    newTable.chairs.push(selectedObject);
    newTable.recalculate();
    renderAll();
    showChairTools();
}

function takeSeat(event){
    if(selectedObject.constructor == Chair){
        if(selectedObject.occupied == false){
            let quest = questsList.quests[event.target.value];

            selectedObject.occupied = true;
            selectedObject.quest = quest;
            quest.data.chair = selectedObject;
            quest.smallElement.disabled = true;

            console.log(selectedObject)
            
        }
    }
}

// event Listeners \/
canvas2.addEventListener("mousedown",mouseDown);
canvas2.addEventListener("mousemove",cursor.tracking.bind(cursor));
canvas2.addEventListener("mousemove",draggingTool.drag.bind(draggingTool));
canvas2.addEventListener("mouseup",draggingTool.endDrag.bind(draggingTool));



document.getElementById("add-square-table").addEventListener("click",()=>{
    let table = new SquareTable(); 
    allTables.push(table);
    table.render(ctx);
    refreshDisplays();
});

document.getElementById("add-round-table").addEventListener("click",()=>{
    let table = new RoundTable(); 
    allTables.push(table);
    table.render(ctx);
    refreshDisplays();
});

document.getElementById("add-chair").addEventListener("click",()=>{
    selectedObject.addChair();
    document.getElementById("tableInfo").innerHTML = `chairs: ${selectedObject.chairs.length} / ${selectedObject.maxChairs}`;
    refreshDisplays();
})

document.getElementById("remove-chair").addEventListener("click",()=>{
    clearContext(ctx2);
    let chair = selectedObject.removeChair();
    allChairs.splice(allChairs.indexOf(chair),1);
    document.getElementById("tableInfo").innerHTML = `chairs: ${selectedObject.chairs.length} / ${selectedObject.maxChairs}`;
    refreshDisplays();
})

for(btn of document.getElementsByName("rotate-table")){
    btn.addEventListener("click",rotateTable);
}

document.getElementById("change-table-mode").addEventListener("click",changeTableMode);
document.getElementById("remove-table").addEventListener("click",removeTable);
document.getElementById("copy-table").addEventListener("click",copyTable);
document.getElementById("add-quest").addEventListener("click",questsList.addQuest.bind(questsList));

popupsMenager.loadPopups();