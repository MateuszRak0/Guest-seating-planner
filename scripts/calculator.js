let marriageCalculator = {
    twoDays:false,

    elements:{
        countBtn:document.getElementById("calculator-start"),
        checkBoxes:document.getElementsByClassName("calculatorCheckBox"),
        inputs:document.getElementsByClassName("calculatorInput"),
        additionalForms:document.getElementsByClassName("calculator-optional-forms"),
    },

    results:{
        alcoholTable:document.getElementById("suggested-alcohol-list"),
        price1:document.getElementById("calc-result-1"),
        price2:document.getElementById("calc-result-2"),
        price3:document.getElementById("calc-result-3"),
        sumPrice:document.getElementById("calc-result-4")
    },

    values:{
        priceFull:0,
        priceHalf:0,
        fullPriceQuests:0,
        halfPriceQuests:0,
        drinkingQuests:0,
        priceSecondDay:0,
        secondDayQuests:0,
    },

    alcohols:{
        whiskey:true,
        vodka:true,
        wine:true,
        beer:true,
    },

    alcRateTable:{
        whiskey:.06,
        vodka:.5,
        wine:.24,
        beer:.27,
    },

    switchAlcoholType:function(key){
        (this.alcohols[key]) ? this.alcohols[key] = false : this.alcohols[key] = true;
    },

    updateValue:function(event){
        let key = event.target.name;
        let value = event.target.value;
        value = parseInt(value);
        if(isNaN(value)){
            value = 0;
        }
        else if(value < 0){
            event.target.value = value*-1; // Block minus values
            value = value*-1;
        }

        this.values[key] = value;
        this.checkValues();
    },

    checkValues:function(){
        let ready = true;
        if(!this.values.fullPriceQuests || !this.values.priceFull) ready=false ;
        if(this.values.halfPriceQuests && !this.values.priceHalf) ready=false ;
        if(this.twoDays){
            if(!this.values.priceSecondDay || !this.values.secondDayQuests) ready = false;
        }
        (ready) ? this.enableBtn() : this.disableBtn();
    },

    disableBtn:function(){
        this.elements.countBtn.disabled = true;
    },

    enableBtn:function(){
        this.elements.countBtn.disabled = false;
    },

    switchWeddingLength:function(){
        (this.twoDays) ? this.twoDays = false : this.twoDays = true;
        for(let element of this.elements.additionalForms){
            if(element.classList.contains("element-hidden")){
                element.classList.remove("element-hidden");
            }
            else{
                element.classList.add("element-hidden");
            }
        }
        this.checkValues();
    },

    calculate:function(){
        let price1 = this.values.fullPriceQuests * this.values.priceFull;
        let price2 = this.values.halfPriceQuests * this.values.priceHalf;
        let price3 = (this.twoDays) ? this.values.secondDayQuests * this.values.priceSecondDay : 0 ;
        this.results.price1.innerHTML = price1;
        this.results.price2.innerHTML = price2;
        this.results.price3.innerHTML = price3;
        this.results.sumPrice.innerHTML = price1 + price2 + price3;
        this.predictAlcoholCount();
    },

    predictAlcoholCount:function(){
        this.results.alcoholTable.innerHTML = "";
        for(let alcohol in this.alcohols){
            if(this.alcohols[alcohol]){
                let rateValue = this.alcRateTable[alcohol]
                let suggestedCount = this.values.drinkingQuests * rateValue;
                if(this.twoDays) suggestedCount *= 1.5; // Addintional 50% to alcohol when 2 days of party
                this.results.alcoholTable.innerHTML += `<div> <p> ${alcohol}  </p> ${suggestedCount.toFixed(1)}L </div>`;
            };
        };
    },
};


for(let checkBox of marriageCalculator.elements.checkBoxes){
    checkBox.addEventListener("input",(e)=>{
        marriageCalculator.switchAlcoholType(e.target.value);
    })
};

for(let input of marriageCalculator.elements.inputs){
    input.addEventListener("input",marriageCalculator.updateValue.bind(marriageCalculator));
};

marriageCalculator.elements.countBtn.addEventListener("click",marriageCalculator.calculate.bind(marriageCalculator));
document.getElementById("calculator-twoDays-option").addEventListener("click",marriageCalculator.switchWeddingLength.bind(marriageCalculator));