const appWindow = document.getElementById("app-window");
const canvas = document.getElementById("layer1");
const canvas2 = document.getElementById("layer2");
const ctx = canvas.getContext("2d");
const ctx2 = canvas2.getContext("2d");

let allTables = [];
let allChairs = [];
let selectedObject;

let questsList = {
    searchInput: document.getElementById("search-quest-input"),
    searchOptions: document.getElementById("quest-search-options"),

    nameInput: document.getElementById("new-quest-name"),
    editNameInput: document.getElementById("edit-quest-name"),

    lastNameInput: document.getElementById("new-quest-last-name"),
    editLastNameInput: document.getElementById("edit-quest-last-name"),

    listElement: document.getElementById("quest-list"),
    listMode: document.getElementById("list-mode"),
    resultDisplay: document.getElementById("quest-adding-result"),
    countDisplay: document.getElementById("quest-count-display"),

    quests: {},
    selectedQuest: false,
    editMode: true,
    editFromChair: false,
    clearLastName: false,

    add: function () {
        let name = this.nameInput.value;
        let lastName = this.lastNameInput.value;
        if (this.nameValidator(name)) {
            let quest = new Quest(name, lastName)
            quest.element.addEventListener("click", this.selectQuest.bind(this));
            this.quests[quest.id] = quest;
            this.listElement.appendChild(quest.element);
            this.searchOptions.appendChild(quest.searchOption);
            this.nameInput.value = "";

            if (this.clearLastName) this.lastNameInput.value = "";
            if (this.editMode) {
                quest.refresh();
                this.resultDisplay.innerHTML = "Pomyślnie dodano ";
            }
            else {
                quest.takeSeat();
                chairTools.show(selectedObject);
            }

        }
        else {
            this.resultDisplay.innerHTML = "Imię jest wymagane !"
        }
    },

    EnableEditMode: function (quest) {
        this.editMode = true;
        this.listMode.innerHTML = "Wybierz i Edytuj";
        if (quest.constructor == Quest) {
            this.selectedQuest = quest;
            this.editFromChair = true;
        }
        this.filter(() => { return true });
    },

    DisableEditMode: function () {
        this.editMode = false;
        this.listMode.innerHTML = "Kto ma tu siedzieć ?";
        this.filter((quest) => {
            if (!quest.seat) return true
        })
    },

    filter: function (filterFunc) {
        let sum = 0;
        for (let id in this.quests) {
            let quest = this.quests[id];
            if(filterFunc(quest)){
                quest.show();
                sum++;
            }
            else{ 
                quest.hide();  
            }
        }
        this.countDisplay.innerHTML = `${sum} wyników`;
    },

    search: function () {
        let searchName = this.searchInput.value;
        if(!searchName ){
            if(this.editMode){
                this.filter(() => { return true });
            }
            else {
                this.filter((quest) => {
                    if (!quest.seat) return true
                })
            }
            return false
        }
        let sum = 0;
        for(let id in this.quests){
            let quest = this.quests[id];
            if(!this.editMode && quest.seat) continue
            if(checkStringsSimilarity(quest.name,searchName) > .7 || checkStringsSimilarity(quest.lastName,searchName) > .7 || checkStringsSimilarity(quest.fullName,searchName) > .7){
                quest.show();
                sum++;
            } else{
                quest.hide();
            }
        }
        this.countDisplay.innerHTML = `${sum} wyników`;
        
    },

    removeQuest: function () {
        this.selectedQuest.leaveParty();
        delete this.quests[this.selectedQuest.id];
        this.selectedQuest = false;
        popupsMenager.returnToLast();
    },

    refreshEditWindow: function () {
        this.editNameInput.value = this.selectedQuest.name;
        this.editLastNameInput.value = this.selectedQuest.lastName;
    },

    nameValidator: function (name) {
        if (!name || name.trim() == "") {
            return false;
        }
        return true
    },

    editQuest: function () {
        let name = this.editNameInput.value;
        let lastName = this.editLastNameInput.value;
        if (!this.nameValidator(name)) return false
        this.selectedQuest.name = name;
        this.selectedQuest.lastName = lastName;
        this.selectedQuest.refresh();
        if (this.editFromChair) {
            this.editFromChair = false;
            chairTools.refreshName();
        }
    },

    selectQuest: function (questBtn) {
        this.selectedQuest = this.quests[questBtn.target.value];
        if (this.selectedQuest) {
            if (this.editMode) {
                this.refreshEditWindow();
                popupsMenager.activeById("edit-quest-tool");
            }
            else {
                this.selectedQuest.takeSeat();
                popupsMenager.disablePopup();
            }
        }
    },

    switchNameClearing: function () {
        (this.clearLastName) ? this.clearLastName = false : this.clearLastName = true;
    },
};

// Base tools
let cursor = {
    x: 0,
    y: 0,

    tracking: function (event) {
        this.x = event.offsetX;
        this.y = event.offsetY;
    }
};

let dragScroll = {
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
            appWindow.scrollLeft = this.startScrollX + (distanceX/-2);
            appWindow.scrollTop = this.startScrollY + (distanceY/-2);
        }
    },

    end:function(){
        this.inDrag = false;
    }

}

let draggingTool = {
    dragedObj: false,
    marginX: 0,
    marginY: 0,
    beforeDrag: {},

    startDrag: function (object) {
        if (object) {
            this.beforeDrag.x = object.centerX;
            this.beforeDrag.y = object.centerY;
            this.marginX = cursor.x - object.centerX;
            this.marginY = cursor.y - object.centerY;
            this.dragedObj = object;
            clearContext(ctx2)
            renderAll(object);
            object.render(ctx2);
            popupsMenager.disablePopup();
        }
    },

    drag: function () {
        if (this.dragedObj) {
            this.dragedObj.centerX = cursor.x - this.marginX;
            this.dragedObj.centerY = cursor.y - this.marginY;
            clearContext(ctx2);
            this.dragedObj.render(ctx2);
            if (this.dragedObj.constructor == Chair) {
                let obj = selectObject([allTables]);
                if (obj && obj != this.dragedObj.parent) obj.render(ctx2); // focus table when drag chair over it
            }
        }
    },

    endDrag: function () {
        if (this.dragedObj) {
            if (this.dragedObj.constructor == Chair) {

                let hoveredTable = selectObject([allTables]);

                if (hoveredTable) {

                    if (hoveredTable != this.dragedObj.parent) {
                        replaceChair(hoveredTable);
                        this.dragedObj = false;
                    }

                    else {
                        clearContext(ctx2);
                        this.dragedObj.centerX = this.beforeDrag.x;
                        this.dragedObj.centerY = this.beforeDrag.y;
                        this.dragedObj.render(ctx2);
                        this.dragedObj = false;
                    }
                }

                else {
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
};

let popupsMenager = {
    allPopups: {},
    actualShowed: null,
    lastShowed: null,

    loadPopups: function () {
        for (let popup of document.getElementsByClassName("popup")) {
            let popupID = popup.getAttribute("id");
            this.allPopups[popupID] = popup;
        }

        for (let btn of document.getElementsByName("show-popup-btn")) {
            btn.addEventListener("click", this.activePopup.bind(this))
        }

        for (let btn of document.getElementsByName("disable-popup-btn")) {
            btn.addEventListener("click", this.disablePopup.bind(this));
        }

        for (let btn of document.getElementsByName("return-popup-btn")) {
            btn.addEventListener("click", this.returnToLast.bind(this));
        }

    },

    disablePopup: function () {
        if (this.actualShowed) {
            this.lastShowed = this.actualShowed;
            this.actualShowed.classList.remove("popup-active");
            this.actualShowed = false;
        }
    },

    activePopup: function (event) {
        this.disablePopup();
        let popupID = event.currentTarget.getAttribute("value");
        this.actualShowed = this.allPopups[popupID];
        this.actualShowed.classList.add("popup-active");
    },

    activeById: function (popupID) {
        this.disablePopup();
        this.actualShowed = this.allPopups[popupID];
        this.actualShowed.classList.add("popup-active");
    },

    returnToLast: function () {
        if (this.lastShowed) {
            let id = this.lastShowed.getAttribute("id");
            this.activeById(id);
        }
    }
};

let tableTools = {
    popup: "table-tools",
    idDisplay: document.getElementById("tableID"),
    rotateBtn: document.getElementsByName("rotate-table"),

    show: function (table) {
        popupsMenager.activeById(this.popup);
        this.idDisplay.innerHTML = allTables.indexOf(table) + 1;
    },

};

let chairTools = {
    popupFree: "chair-tools-free",
    popupBusy: "chair-tools-occupied",
    idDisplays: document.getElementsByClassName("chair-ID"),
    questNameBox: document.getElementById("quest-on-chair"),

    show: function (chair) {
        let index = allChairs.indexOf(chair) + 1;
        for (display of this.idDisplays) {
            display.innerHTML = index;
        }

        if (chair.occupied) {
            this.questNameBox.innerHTML = `<span>${chair.quest.fullName}</span>`;
            popupsMenager.activeById(this.popupBusy);
        }
        else {
            popupsMenager.activeById(this.popupFree);
        }
    },

    refreshName: function () {
        this.questNameBox.innerHTML = `<span>${selectedObject.quest.name}</span> <span>${selectedObject.quest.lastName}</span> `;
    }
};

let systemMessenger = {
    popup: document.getElementById("system-message"),
    titleSpan: document.getElementById("system-message-title"),
    contentSpan: document.getElementById("system-message-content"),
    acceptBtn: document.getElementById("system-message-btn"),
    afterAccept: false,
    afterReject:false,
    clearAfter:false,

    show: function(message,acceptFunc,rejectFunc,clearAfter = true) {
        this.titleSpan.innerHTML = message.title;
        this.contentSpan.innerHTML = message.content;
        this.acceptBtn.innerHTML = message.button;
        this.afterAccept = acceptFunc;
        this.afterReject = rejectFunc;
        this.clearAfter = clearAfter
        this.popup.classList.add("popup-active");
    },

    hide: function() {
        this.popup.classList.remove("popup-active");
    },

    reject: function() {
        this.hide();
        if(this.afterReject) this.afterReject();
        if(this.clearAfter){
            this.afterReject = false;
            this.afterAccept = false;      
        }

    },

    accept: function() {
        this.hide();
        if (this.afterAccept) this.afterAccept();
        if(this.clearAfter){
            this.afterReject = false;
            this.afterAccept = false;
        }

    },
};

let padlock = {
    lockButtons: document.getElementsByName("object-lock-btn"),

    lockObject: function () {
        if (selectedObject.locked) {
            selectedObject.locked = false;
        }
        else {
            selectedObject.locked = true;
        }
        this.refresh();
    },

    refresh: function () {
        for (let btn of this.lockButtons) {
            if (selectedObject.locked) {
                btn.classList.add("lockedElement");
            }
            else {
                btn.classList.remove("lockedElement");
            }
        }
    }

}

// Constructors ( tables , quest , chair , other elements)
function RoundTable(chairsCount = 2, sides = 1, rotation = 0) {
    this.rotation = rotation;
    this.chairs = [];
    this.sides = sides;
    this.centerX = 150 + appWindow.scrollLeft;
    this.centerY = 150 + appWindow.scrollTop;
    this.maxChairs = 16;

    for (let startChairs = 0; startChairs < chairsCount; startChairs++) {
        let chair = new Chair(this);
        this.chairs.push(chair);
    }

    let multiper = this.sides * 1.9;
    this.size = (this.chairs.length * (2 + multiper)) + 20;

    this.render = function (ctx) {
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.size / 2, 0, 2 * Math.PI);
        ctx.fill();
        if (this.locked) ctx.stroke();
        this.countChairsPositions(ctx);
    };

    this.countChairsPositions = function (ctx) {
        let step = (360 / this.sides) / this.chairs.length;
        let angle = this.rotation;
        let distance = (this.size + 5) - (this.chairs.length * 2);
        for (let chair of this.chairs) {
            let radians = angle * Math.PI / 180;
            newX = this.centerX + (Math.sin(radians) * distance);
            newY = this.centerY + (Math.cos(radians) * distance);
            chair.centerX = newX;
            chair.centerY = newY;
            chair.radians = radians;
            chair.render(ctx)
            angle += step;
        }
    };

    this.recalculate = function () {
        clearContext(ctx2);
        let multiper = this.sides * 1.9;
        this.size = (this.chairs.length * (2 + multiper)) + 20;
        this.render(ctx2);

    };
};

function SquareTable(chairsCount = 2, sides = 2, rotation = 0) {
    this.rotation = rotation;
    this.chairs = [];
    this.sides = sides;
    this.width = 20 + (20 * this.sides);
    this.centerX = 150 + appWindow.scrollLeft;
    this.centerY = 150 + appWindow.scrollTop;
    this.maxChairs = 100;
    this.corners = {
        p1: null,
        p2: null,
        p3: null,
        p4: null,
        center1: null,
        center2: null,
    }

    for (let startChairs = 0; startChairs < chairsCount; startChairs++) {
        let chair = new Chair(this);
        this.chairs.push(chair);
    }

    this.size = ((this.chairs.length / (this.sides * 2)) * 40) + 20;

    this.render = function (ctx) {
        this.calculateCorenrs();
        ctx.beginPath();
        ctx.moveTo(this.corners.p1.x, this.corners.p1.y);
        ctx.lineTo(this.corners.p2.x, this.corners.p2.y);
        ctx.lineTo(this.corners.p3.x, this.corners.p3.y);
        ctx.lineTo(this.corners.p4.x, this.corners.p4.y);
        ctx.lineTo(this.corners.p1.x, this.corners.p1.y);
        ctx.fill();
        if (this.locked) ctx.stroke();
        this.countChairsPositions(ctx);
    };


    this.countCorner = function (x, y, size, start = 0) {
        let radians = (this.rotation + start) * Math.PI / 180;
        let x1 = x + Math.sin(radians) * size;
        let y1 = y + Math.cos(radians) * size;
        return { x: x1, y: y1, ad: [x1, y1] };
    };


    this.calculateCorenrs = function () {
        let buffor = this.countCorner(this.centerX, this.centerY, this.width / 2, 270)
        this.corners.p1 = this.countCorner(buffor.x, buffor.y, this.size / 2, 180);
        this.corners.p2 = this.countCorner(this.corners.p1.x, this.corners.p1.y, this.size);
        this.corners.p3 = this.countCorner(this.corners.p2.x, this.corners.p2.y, this.width, 90);
        this.corners.p4 = this.countCorner(this.corners.p1.x, this.corners.p1.y, this.width, 90);
        this.corners.center2 = this.countCorner(this.centerX, this.centerY, this.width / 2, 90)
        this.corners.center1 = buffor;
    }

    this.countChairsPositions = function (ctx) {
        let oneSide = Math.ceil(this.chairs.length / this.sides);
        let step = this.size / oneSide;
        let margin = step / 2;
        for (let i = 0; i < this.chairs.length; i++) {
            let chair = this.chairs[i];
            if (i < oneSide) {
                let distance = margin + (step * i);
                let point = this.countCorner(this.corners.p1.x, this.corners.p1.y, distance, 0);
                point = this.countCorner(point.x, point.y, 20, -90);
                chair.centerX = point.x;
                chair.centerY = point.y;
            }
            else {
                let distance = margin + step * (i - oneSide);
                let point = this.countCorner(this.corners.p4.x, this.corners.p4.y, distance, 0);
                point = this.countCorner(point.x, point.y, 20, 90);
                chair.centerX = point.x;
                chair.centerY = point.y;
            }
            chair.render(ctx)
        }
    };

    this.recalculate = function () {
        clearContext(ctx2);
        this.size = ((this.chairs.length / (this.sides * 2)) * 40) + 20;
        this.width = 20 + (20 * this.sides);
        this.render(ctx2);

    };
};

function Chair(parent) {
    this.occupied = false;
    this.quest = false;
    this.parent = parent;
    this.size = 22;
    this.centerX;
    this.centerY;
    this.radians = 0;
    allChairs.push(this);

    this.render = function (ctx) {
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.size / 2, 0, 2 * Math.PI);
        let lastColor = ctx.fillStyle;
        if (this != selectedObject) {
            if (this.occupied == true) {
                ctx.fillStyle = "#f73434";
            }
            else {
                ctx.fillStyle = "#89b52b";
            }
        }
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.fillText(allChairs.indexOf(this) + 1, this.centerX - 8, this.centerY + 3);
        ctx.fillStyle = lastColor;

        if (this.locked) ctx.stroke();
    };

    this.disinfectAfterQuest = function () {
        this.quest = false;
        this.occupied = false;
        this.render(ctx);
    };
};

function Quest(name, lastName) {
    if (!this.nextID) Quest.prototype.nextID = 0;
    this.name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    this.lastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
    this.fullName = this.name + " " + this.lastName;
    this.seat;

    this.id = `q-${this.nextID}`;
    Quest.prototype.nextID++;

    this.element = document.createElement("button");
    this.element.classList.add("quest-btn");
    this.element.value = this.id;

    this.searchOption = document.createElement("option");
    this.searchOption.value = this.fullName;

    this.refresh = function () {
        this.name = this.name.charAt(0).toUpperCase() + this.name.slice(1).toLowerCase();
        this.lastName = this.lastName.charAt(0).toUpperCase() + this.lastName.slice(1).toLowerCase();
        this.fullName = this.name + " " + this.lastName;
        this.element.innerHTML = this.fullName;
        this.searchOption.value = this.fullName;
    };

    this.hide = function () {
        this.element.classList.add("quest-hidden");
    }

    this.show = function () {
        this.element.classList.remove("quest-hidden");
    }

    this.takeSeat = function () {
        if (selectedObject.constructor == Chair) {
            if (!selectedObject.occupied && !this.seat) {
                selectedObject.occupied = true;
                selectedObject.quest = this;
                this.seat = selectedObject;
            }
        }
    };

    this.leaveSeat = function () {
        if (this.seat) {
            this.seat.disinfectAfterQuest();
            this.seat = false;
        }
    };

    this.leaveParty = function () {
        this.leaveSeat();
        this.element.outerHTML = "";
        this.searchOption.outerHTML = "";
    };


};

// Base Functions
function checkStringsSimilarity(s1,s2){
    s1 = s1.toUpperCase();
    s2 = s2.toUpperCase();
    let result = 0;
    let weight = 1/s1.length;
    for(let i = 0; i < s1.length; i++){
        let orgChar = s1.charAt(i);
        let char1 = s2.charAt(i-1);
        let char2 = s2.charAt(i);
        let char3 = s2.charAt(i+1);
        
        if(orgChar == char2 || orgChar == char1 || orgChar == char3){
            result += weight;
        }
    }
    return result;
};

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
};

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

function selectObject(lists) {
    for (let list of lists) {
        for (let object of list) {
            if (object.constructor != SquareTable) {
                let a = Math.abs(cursor.x - object.centerX);
                let b = Math.abs(cursor.y - object.centerY);
                let distance = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
                if (distance <= object.size / 2) return object;

            }
            else {
                let res = isPointInsideRectangle(cursor.x, cursor.y, [object.centerX, object.centerY], object.corners.p1.ad, object.corners.p4.ad, object.corners.p3.ad, object.corners.p2.ad)
                if (res) {
                    return object
                }
            }
        }
    }
}

function mouseDown() {
    let object = selectObject([allTables, allChairs]);
    if (object) {
        selectedObject = object;
        if (!selectedObject.locked) {
            draggingTool.startDrag(object);
        }
        else {
            selectedObject.render(ctx2)
            renderAll();
        }

    }
    else if (selectedObject) {
        popupsMenager.disablePopup();
        selectedObject = false;
        clearContext(ctx2);
        renderAll();
        dragScroll.start();
    }
    else{
        dragScroll.start();
    }
}

function mouseUp() {
    if (selectedObject) {
        padlock.refresh();
        draggingTool.endDrag();
        if (selectedObject.constructor != Chair) {
            tableTools.show(selectedObject);
        }
        else {
            chairTools.show(selectedObject);
        }
    }
    dragScroll.end();

}

// Table tools \/

function removeTable() {

    for (let chair of selectedObject.chairs) {
        if (chair.locked) {
            systemMessenger.show(msg_Error03);
            return false;
        }
    }

    let index = allTables.indexOf(selectedObject);
    allTables.splice(index, 1);
    for (let chair of selectedObject.chairs) {
        if (chair.occupied) {
            chair.quest.leaveSeat() = false;
        }
        let index = allChairs.indexOf(chair);
        allChairs.splice(index, 1);
    }
    selectedObject = false;
    clearContext(ctx2);
    renderAll();
}

function rotateTable(event) {
    let direction = event.target.getAttribute("value");
    clearContext(ctx2);
    selectedObject.rotation += (10 * direction);
    if (selectedObject.rotation > 360) { selectedObject.rotation = 0; }
    else if (selectedObject.rotation < 0) { selectedObject.rotation = 360; }
    selectedObject.render(ctx2);
}

function copyTable() {
    let table = new selectedObject.constructor(selectedObject.chairs.length, selectedObject.sides, selectedObject.rotation);
    table.centerX = selectedObject.centerX - 3;
    table.centerY = selectedObject.centerY - 3;
    allTables.push(table);
    renderAll();
}

function changeTableMode() {
    (selectedObject.sides == 2) ? selectedObject.sides = 1 : selectedObject.sides = 2;
    selectedObject.recalculate();
}

function replaceChair(newTable) {
    let index = selectedObject.parent.chairs.indexOf(selectedObject);
    selectedObject.parent.chairs.splice(index, 1);
    selectedObject.parent.recalculate();
    selectedObject.parent = newTable;
    newTable.chairs.push(selectedObject);
    newTable.recalculate();
    renderAll();
}

function selectChairToRemove() {
    let NoLocked = [];
    for (let chair of selectedObject.chairs) {
        if (!chair.occupied && !chair.locked) {
            return chair;
        }
        else if (!chair.locked) {
            NoLocked.push(chair);
        }
    }
    return NoLocked[0]; // if no found free chair remove first busy but not locked
};

function removeChair(chair) {
    clearContext(ctx2);
    if (chair.occupied) {
        chair.quest.leaveSeat();
    }
    let index = chair.parent.chairs.indexOf(chair)
    chair.parent.chairs.splice(index, 1);
    chair.parent.recalculate();
    allChairs.splice(allChairs.indexOf(chair), 1);
};

// Event Listeners & prepare object's
canvas2.addEventListener("mousedown", mouseDown);
canvas2.addEventListener("mousemove", cursor.tracking.bind(cursor));
canvas2.addEventListener("mouseup", mouseUp);
appWindow.addEventListener("mouseleave",()=>{
    draggingTool.endDrag();
    dragScroll.end();
});
document.getElementById("change-mode-btn").addEventListener("click", changeTableMode);
document.getElementById("copy-table-btn").addEventListener("click", copyTable);
document.getElementById("add-quest-btn").addEventListener("click", questsList.add.bind(questsList));
document.getElementById("quest-edit-list").addEventListener("click", questsList.EnableEditMode.bind(questsList));
document.getElementById("quest-seat-list").addEventListener("click", questsList.DisableEditMode.bind(questsList));
document.getElementById("accept-quest-edit").addEventListener("click", questsList.editQuest.bind(questsList));
document.getElementById("remove-last-name-mode").addEventListener("input", questsList.switchNameClearing.bind(questsList));
document.getElementById("search-quest-btn").addEventListener("click", questsList.search.bind(questsList));
document.getElementById("system-message-btn").addEventListener("click", systemMessenger.accept.bind(systemMessenger));
document.getElementById("disable-message-btn").addEventListener("click", systemMessenger.reject.bind(systemMessenger));

appWindow.addEventListener("mousemove",()=>{
    draggingTool.drag();
    dragScroll.scroll();
});

document.getElementById("add-square-table").addEventListener("click", () => {
    let table = new SquareTable();
    allTables.push(table);
    table.render(ctx);
});

document.getElementById("add-round-table").addEventListener("click", () => {
    let table = new RoundTable();
    allTables.push(table);
    table.render(ctx);
});

document.getElementById("add-chair-btn").addEventListener("click", () => {
    if (selectedObject.chairs.length < selectedObject.maxChairs) {
        let chair = new Chair(selectedObject);
        selectedObject.chairs.push(chair);
        selectedObject.recalculate();
    }
    else{
        systemMessenger.show(msg_TableFull);
    }

});

document.getElementById("remove-chair-btn").addEventListener("click", () => {
    if (selectedObject.chairs.length > 0) {
        let chair = selectChairToRemove();
        if (chair) {
            removeChair(chair);
        }
        else {
            systemMessenger.show(msg_Error02)
        }
    }
});

for (let btn of document.getElementsByName("rotate-table")) {
    btn.addEventListener("click", rotateTable);
};

for (let btn of document.getElementsByName("remove-selected-chair-btn")) {
    btn.addEventListener("click", () => {
        if (selectedObject.locked) {
            systemMessenger.show(msg_Error01);
            return false;
        }

        removeChair(selectedObject);
        selectedObject = false;
        popupsMenager.disablePopup();
        renderAll();
    })
}

for (let btn of document.getElementsByName("object-lock-btn")) {
    btn.addEventListener("click", padlock.lockObject.bind(padlock));
}

document.getElementById("remove-quest-btn").addEventListener("click", () => {
    systemMessenger.show(msg_BeforeRemove, questsList.removeQuest.bind(questsList));
});


document.getElementById("remove-table-btn").addEventListener("click", () => {
    if (selectedObject.locked) {
        systemMessenger.show(msg_Error01, popupsMenager.returnToLast);
    }
    else {
        systemMessenger.show(msg_BeforeRemove, removeTable);
    }

});

document.getElementById("edit-quest-on-chair-btn").addEventListener("click", () => {
    let quest = selectedObject.quest;
    questsList.EnableEditMode(quest);
    questsList.refreshEditWindow();
    popupsMenager.activeById("edit-quest-tool");

});

document.getElementById("kick-from-chair-btn").addEventListener("click", () => {
    selectedObject.quest.leaveSeat();
    chairTools.show(selectedObject);
});

popupsMenager.loadPopups();


// Canvas settings
ctx.strokeStyle = "#b84f4b";
ctx2.strokeStyle = "#b84f4b";
ctx.font = '12px monospace';
ctx2.font = '12px monospace';
ctx.fillStyle = "#c48545";
ctx2.fillStyle = "#9b6bb4";
ctx.shadowColor = '#8b8b8b85';
ctx.shadowBlur = 5;
ctx.shadowOffsetX = 2;
ctx.shadowOffsetY = 2;
ctx2.shadowColor = '#8b8b8b85';
ctx2.shadowBlur = 5;
ctx2.shadowOffsetX = 2;
ctx2.shadowOffsetY = 2;



// SYSTEM MESSAGES
const msg_BeforeRemove = {
    title: "Na pewno ?",
    content: "Operacji Usunięcia nie można już cofnąć czy jesteś pewny że chcesz to zrobić ?",
    button: "Tak usuń",
};

const msg_Error01 = {
    title: "Obiekt Zablokowany",
    content: "Nie można usunąc tego obiektu tak długo jak jest on zablokowany",
    button: "Rozumiem",
};

const msg_Error02 = {
    title: "Krzesła zablokowane",
    content: "Nie można usunąc kolejnych krzeseł ponieważ są one zablokowane",
    button: "Rozumiem",
};

const msg_Error03 = {
    title: "Krzesła zablokowane",
    content: "Nie można usunąc tego stołu ponieważ któreś z jego krzeseł jest zablokowane ",
    button: "Rozumiem",
};

const msg_TableFull = {
    title: "Stolik jest pełny !",
    content: "Nie da rady stworzyć większego stołu tego typu ! ( Najbardziej pojemny jest stół prostokątny )",
    button: "Rozumiem",
};

// Tutorial
const msg_Tutorial1 = {
    title: "Witamy w Planerze Ślubnym",
    content: "W tym narzędziu szybko zaplanujesz rozmieszczenie stołów , gości i atrakcji na swoim ślubie. Przygotujesz gotowe do druku Vinetki Dla każdej z dodanych osób a po rozmieszczeniu wszystkich gości szybko utworzysz wydruk planu stołów !",
    button: "Dalej",
};

let tutorialAcceptFunc_1 = function(){
    document.getElementById("quest-edit-list").classList.add("take-attention");
    systemMessenger.show(msg_Tutorial2,tutorialAcceptFunc_2,tutorialRejectFunc_2,false);
}


const msg_Tutorial2 = {
    title: "Wprowadzenie 1/3",
    content: "Klikając na zaznaczony przycisk przeniesiesz się do listy gości możesz tam łatwo dodawać i edytować gości.",
    button: "Dalej",
};

let tutorialAcceptFunc_2 = function(){
    document.getElementById("quest-edit-list").classList.remove("take-attention");
    document.querySelector("button[value=weeding-tools-menu]").classList.add("take-attention");
    systemMessenger.show(msg_Tutorial3,tutorialAcceptFunc_3,tutorialRejectFunc_3,false);
};

let tutorialRejectFunc_2 = function(){
    document.getElementById("quest-edit-list").classList.remove("take-attention");
};


const msg_Tutorial3 = {
    title: "Wprowadzenie 2/3",
    content: "Pod przyciskiem 'Narzędzia' znajdziesz wiele przydantych narzędzi takich jak kreator winetek, przygotowanie wydruku planu stołów i wiele innych ",
    button: "Dalej",
};

let tutorialRejectFunc_3 = function(){
    document.querySelector("button[value=weeding-tools-menu]").classList.remove("take-attention");
};

let tutorialAcceptFunc_3 = function(){
    document.querySelector("button[value=weeding-tools-menu]").classList.remove("take-attention");
    document.querySelector("button[value=add-table-menu]").classList.add("take-attention");
    systemMessenger.show(msg_Tutorial4,tutorialRejectFunc_4,tutorialRejectFunc_4,false);
};

const msg_Tutorial4 = {
    title: "Wprowadzenie 3/3",
    content: "Tutaj znajdziesz wszystkie dostępne rodzaje stołów kliknij na któryś aby dodać go do sali następnie kliknij na dodany obiekt aby rozwinąć więcej jego opcji !. Możesz również złapać i przeciągnąc obiekt w odpowiednie miejsce !",
    button: "Zaczynamy",
};

let tutorialRejectFunc_4 = function(){
    document.querySelector("button[value=add-table-menu]").classList.remove("take-attention");
};

systemMessenger.show(msg_Tutorial1,tutorialAcceptFunc_1,false,false);




let names = ["Aaran", "Aaren", "Aarez", "Aarman", "Aaron", "Aaron-James", "Aarron", "Aaryan", "Aaryn", "Aayan", "Aazaan", "Abaan", "Abbas", "Abdallah", "Abdalroof", "Abdihakim", "Abdirahman", "Abdisalam", "Abdul", "Abdul-Aziz", "Abdulbasir", "Abdulkadir", "Abdulkarem", "Abdulkhader", "Abdullah", "Abdul-Majeed", "Abdulmalik", "Abdul-Rehman", "Abdur", "Abdurraheem", "Abdur-Rahman", "Abdur-Rehmaan", "Abel", "Abhinav", "Abhisumant", "Abid", "Abir", "Abraham", "Abu", "Abubakar", "Ace", "Adain", "Adam", "Adam-James", "Addison", "Addisson", "Adegbola", "Adegbolahan", "Aden", "Adenn", "Adie", "Adil", "Aditya", "Adnan", "Adrian", "Adrien", "Aedan", "Aedin", "Aedyn", "Aeron", "Afonso", "Ahmad", "Ahmed", "Ahmed-Aziz", "Ahoua", "Ahtasham", "Aiadan", "Aidan", "Aiden", "Aiden-Jack", "Aiden-Vee", "Aidian", "Aidy", "Ailin", "Aiman", "Ainsley", "Ainslie", "Airen", "Airidas", "Airlie", "AJ", "Ajay", "A-Jay", "Ajayraj", "Akan", "Akram", "Al", "Ala", "Alan", "Alanas", "Alasdair", "Alastair", "Alber", "Albert", "Albie", "Aldred", "Alec", "Aled", "Aleem", "Aleksandar", "Aleksander", "Aleksandr", "Aleksandrs", "Alekzander", "Alessandro", "Alessio", "Alex", "Alexander", "Alexei", "Alexx", "Alexzander", "Alf", "Alfee", "Alfie", "Alfred", "Alfy", "Alhaji", "Al-Hassan", "Ali", "Aliekber", "Alieu", "Alihaider", "Alisdair", "Alishan", "Alistair", "Alistar", "Alister", "Aliyaan", "Allan", "Allan-Laiton", "Allen", "Allesandro", "Allister", "Ally", "Alphonse", "Altyiab", "Alum", "Alvern", "Alvin", "Alyas", "Amaan", "Aman", "Amani", "Ambanimoh", "Ameer", "Amgad", "Ami", "Amin", "Amir", "Ammaar", "Ammar", "Ammer", "Amolpreet", "Amos", "Amrinder", "Amrit", "Amro", "Anay", "Andrea", "Andreas", "Andrei", "Andrejs", "Andrew", "Andy", "Anees", "Anesu", "Angel", "Angelo", "Angus", "Anir", "Anis", "Anish", "Anmolpreet", "Annan", "Anndra", "Anselm", "Anthony", "Anthony-John", "Antoine", "Anton", "Antoni", "Antonio", "Antony", "Antonyo", "Anubhav", "Aodhan", "Aon", "Aonghus", "Apisai", "Arafat", "Aran", "Arandeep", "Arann", "Aray", "Arayan", "Archibald", "Archie", "Arda", "Ardal", "Ardeshir", "Areeb", "Areez", "Aref", "Arfin", "Argyle", "Argyll", "Ari", "Aria", "Arian", "Arihant", "Aristomenis", "Aristotelis", "Arjuna", "Arlo", "Armaan", "Arman", "Armen", "Arnab", "Arnav", "Arnold", "Aron", "Aronas", "Arran", "Arrham", "Arron", "Arryn", "Arsalan", "Artem", "Arthur", "Artur", "Arturo", "Arun", "Arunas", "Arved", "Arya", "Aryan", "Aryankhan", "Aryian", "Aryn", "Asa", "Asfhan", "Ash", "Ashlee-jay", "Ashley", "Ashton", "Ashton-Lloyd", "Ashtyn", "Ashwin", "Asif", "Asim", "Aslam", "Asrar", "Ata", "Atal", "Atapattu", "Ateeq", "Athol", "Athon", "Athos-Carlos", "Atli", "Atom", "Attila", "Aulay", "Aun", "Austen", "Austin", "Avani", "Averon", "Avi", "Avinash", "Avraham", "Awais", "Awwal", "Axel", "Ayaan", "Ayan", "Aydan", "Ayden", "Aydin", "Aydon", "Ayman", "Ayomide", "Ayren", "Ayrton", "Aytug", "Ayub", "Ayyub", "Azaan", "Azedine", "Azeem", "Azim", "Aziz", "Azlan", "Azzam", "Azzedine", "Babatunmise", "Babur", "Bader", "Badr", "Badsha"];

for(let name of names){
    questsList.nameInput.value = name;
    questsList.add();
}
