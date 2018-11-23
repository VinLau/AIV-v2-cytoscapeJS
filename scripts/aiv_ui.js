/**
 * @fileOverview AIV2, Arabidopsis Interactions Viewer Two User Interface Options. Supplementary JS file that powers most of the front-end options (filtering nodes, expression overlays) of AIV 2.0.
 * @version 2.0, Jan2018
 * @author Vincent Lau <vincente.lau@mail.utoronto.ca>
 */

(function(window, $, cytoscape, ClipboardJS, alertify, undefined) {
    'use strict';

    //DOM ready;
    $(function() {
        if (typeof window.aivNamespace.AIV !== 'undefined') { // only run if we have initialized cytoscape app
            let AIV = window.aivNamespace.AIV;
            // below functions should bind to AIV is they're more app-level features
            AIV.mapManDropDown = mapManDropDown;
            AIV.filterAllElistener = filterAllElistener;
            runUIFunctions(AIV);
        }
        else { // if not loaded, try again after 1 second
            setTimeout(function(){
                let AIV = window.aivNamespace.AIV;
                AIV.mapManDropDown = mapManDropDown;
                AIV.filterAllElistener = filterAllElistener;
                runUIFunctions(AIV);
            }, 1000);
        }
    });

    /**
     * @function runUIFunctions - run UI functions, much like a main() function
     * @param {object} AIVref - reference to global namespace AIV object, with access to cytoscape methods
     */
    function runUIFunctions(AIVref) {
        validateGeneForm();
        effectorDropdownSelect2();
        enableInteractionsCheckbox();
        addExampleEListener();
        showFormOnLoad();
        addResetEListener();
        showModals();
        uploadJSON(AIVref);
        checkINTACTServerStatus();
        checkBIOGRIDServerStatus();
        rerunLocalizationSVG(AIVref);
        getXMLSourcesModifyDropdown();
        getXMLTissuesFromConditionAJAX(AIVref);
        tissueDropdownChangeSelectColor(AIVref);
        expressionOverlayEListener(AIVref);
        thresholdSwitchEListener(AIVref);
        exprThresholdInputEListener(AIVref);
        exprModeRadioEListener(AIVref);
        setTableFilter(AIVref);
        setCSVExport();
        setPNGExport(AIVref);
        setJSONexport(AIVref);
        filterNonQueryGenes(AIVref);
        restrictUIInputsNumRange();
        filterExperimentalPPIsSwitch(AIVref);
        filterExperimentalPPIsInputEListener(AIVref);
        showReferenceChkboxes();
        filterEdgesByRefEListener(AIVref);
        filterPredictedPPIsSwitch(AIVref);
        filterPredictedPPIsInputsEListener(AIVref);
        localizationLayoutEventListener(AIVref);
        spreadLayoutEventListener(AIVref);
        coseCompoundLayoutEventListener(AIVref);
        zoomInEventListener(AIVref);
        resetPanZoomEventListener(AIVref);
        zoomOutEventListener(AIVref);
        panLeft(AIVref);
        panRight(AIVref);
        panUp(AIVref);
        panDown(AIVref);
        highlightNodes(AIVref);
        hideUnhideMapMan(AIVref);
        hideUnhideDonuts(AIVref);
        hideUnhideDNA(AIVref);
        qTipsUI();
    }

    /** @function showFormOnLoad - show gene form upon load so we can get user started immediately*/
    function showFormOnLoad(){
        $('#formModal').modal('show');
    }

    /** @function addExampleEListener - example form*/
    function addExampleEListener() {
        $('#example').click(function() {
            $('#genes').val("At2g34970\nAt1g04880\nAt1g25420\nAt5g43700");
            resetForm();
            document.getElementById('queryBAR').click();
            document.getElementById('queryDna').click();
        });
    }

    /** @function addResetEListener - reset form event button listener */
    function addResetEListener(){
        document.getElementById('resetForm').addEventListener('click', function() {
            resetForm();
            $('#genes').val('');
        });
    }

    /** @function resetForm - reset the form*/
    function resetForm () {
        let nodeListCheckboxes = document.querySelectorAll('input:checked.form-chkbox'); // NodeList of checked form checkboxes
        if (nodeListCheckboxes.length > 0) { //reset form checkboxes
            [].forEach.call(nodeListCheckboxes, function(node){ //nodeList forEach hack (some browsers don't support NodeList.forEach
                node.click(); // turn off checkbox, setting .checked DOES not fire certain events!
            });
        }
    }

    /** @function uploadJSON - upload functionality - allow upload of cytoscape JSON compatible file to our web app, also highlight the sample code block
     * @param {object} AIVObj - reference to global namespace AIV object, with access to cytoscape methods
     */
    function uploadJSON(AIVObj) {
        hljs.highlightBlock(document.getElementById('sampleJSON'));
        let file = document.getElementById('uploadJSON');
        file.addEventListener('change', function(event){
            if (file.files.length !== 0) {
                if (file.files[0].type === "application/json"){
                    let reader = new FileReader();
                    reader.onload = function(event) {
                        try {
                            let jsonObj = JSON.parse(event.target.result);
                            try {
                                console.log(jsonObj);
                                if (typeof AIVObj.cy !== "undefined"){
                                    AIVObj.cy.destroy();
                                    AIVObj.resetUI();
                                    AIVObj.resetState();
                                }
                                AIVObj.initializeCy(true); //initialize cytoscape
                                //set zooms and pans
                                AIVObj.defaultZoom = jsonObj.zoom;
                                AIVObj.defaultPan = jsonObj.pan;
                                //set compound nodes for cose-compound layout
                                jsonObj.elements.nodes.forEach(function(node){
                                    let majorityLoc = node.data.localization;
                                    if (AIVObj.locCompoundNodes.indexOf(majorityLoc) === -1 ){
                                        AIVObj.locCompoundNodes.push(majorityLoc); // append to our state variable which stores unique majority localizations, used to later make compound nodes
                                    }
                                });
                                AIVObj.cy.json(jsonObj);
                                AIVObj.effectorsLocHouseCleaning();
                                buildRefsFromCyData(AIVObj);
                                if (typeof jsonObj.AIV2JSON === 'undefined'){ //test if user inputed their own interaction data or it was an AIV2 JSON
                                    AIVObj.cy.layout(AIVObj.getCySpreadLayout()).run();
                                    AIVObj.cy.style(AIVObj.getCyStyle()).update();
                                    AIVObj.returnSVGandMapManThenChain();
                                    let userNodeAgiNames = [];
                                    AIVObj.parseProteinNodes((nodeID) => userNodeAgiNames.push(nodeID));
                                    AIVObj.fetchGeneAnnoForTable(userNodeAgiNames);
                                }
                                else { // only need these things for an AIV2 JSON upload
                                    AIVObj.addChrNodeQtips();
                                    AIVObj.addPPIEdgeQtips();
                                }
                                AIVObj.addProteinNodeQtips();
                                AIVObj.addEffectorNodeQtips();
                            }
                            catch (err){
                                alertify.logPosition("top right");
                                alertify.error("Valid JSON but error parsing some properties, check formatting and reupload!");
                            }
                        }
                        catch (err) {
                            alertify.logPosition("top right");
                            alertify.error("Invalid JSON error");
                            if (err instanceof SyntaxError){
                                alertify.error("JSON likely not in proper JSON notation! Fix and reupload!");
                            }
                        }
                        $('#uploadModal').modal('hide'); // hide modal
                    };
                    reader.readAsText(file.files[0]);
                    file.value = ""; //'hack' that resets the value of input so in case user reuploads the same file name - to enable 'change' event listener
                }
            }
        });

        /**
         * @function buildRefsFromCyData - Helper function to build Ref dropdown from JSON export by going inside the cytoscape app data (specifically the edges)
         * @param {object} AIVObj - reference to global namespace AIV object, with access to cytoscape methods
         */
        function buildRefsFromCyData(AIVObj){
            let arrOfPubs = [];
            AIVObj.cy.filter('edge[?reference]').forEach(function(edge){
                arrOfPubs.push(edge.data('reference'));
            });
            let arrOfPubsUnique = arrOfPubs.filter(function(item, index, selfArr){ // delete duplicates
                return index === selfArr.indexOf(item);
            });
            AIVObj.buildRefDropdown(arrOfPubsUnique);
        }
    }

    /** @function addResetEListener - modal functionality*/
    function showModals(){
        // Show Legend
        document.getElementById('showLegendModal').addEventListener('click', function(event) {
            event.preventDefault();
            $('#LegendModal').modal('show');
        });

        // Show Legend
        document.getElementById('showFormModal').addEventListener('click', function(event) {
            event.preventDefault();
            $('#formModal').modal('show');
        });

        // Show Upload
        document.getElementById('showUploadModal').addEventListener('click', function(event){
            event.preventDefault();
            $('#uploadModal').modal('show');
        });
    }

    /** @function validateGeneForm - restrict user input into the gene form*/
    function validateGeneForm(){
        let geneForm = document.getElementById('genes');
        geneForm.addEventListener('keypress', function handleKeypress(event){

            //remove outer event listener when user pastes own text
            geneForm.addEventListener('paste', function(event){
                geneForm.removeEventListener('keypress', handleKeypress);
            });

            let geneFormValue = geneForm.value;
            let geneFormValueLen = geneFormValue.length;
            let key = event.key;

            // Allow backspace, home, end,delete, ctrl, cmd, shift left arrow,right arrow, up arrow, down arrow
            if (key === "Backspace" ||
                key === "Home"      ||
                key === "End"       ||
                key === "ArrowLeft" ||
                key === "Left"      ||
                key === "ArrowRight"||
                key === "Right"     ||
                key === "ArrowUp"   ||
                key === "Up"        ||
                key === "ArrowDown" ||
                key === "Control"   ||
                event.metakey       || //'cmd' in Mac
                key === "Shift"     ||
                key === "Enter"     ||
                key === "Down") {
                return; //don't e.preventdefault()...
            }

            let latestEntryLen = geneFormValue.split('\n').pop().length;
            console.log(latestEntryLen);
            console.log(latestEntryLen % 10);

            if (latestEntryLen % 10 === 0 && (key === "a" || key === "A")){
                geneForm.value += "A";
            }
            else if ((latestEntryLen % 10 === 1) && (key === "t" || key === "T")){
                geneForm.value += "t";
            }
            else if ((latestEntryLen % 10 === 2) && key.match(/[1-5]/)){
                geneForm.value += key;
            }
            else if ((latestEntryLen % 10 === 3) && key.match(/[gmc]/i)){
                geneForm.value += key;
            }
            else if ((latestEntryLen % 10 === 4) ||
                     (latestEntryLen % 10 === 5) ||
                     (latestEntryLen % 10 === 6) ||
                     (latestEntryLen % 10 === 7) ||
                     (latestEntryLen % 10 === 8) &&
                     key.match(/\d/)){
                geneForm.value += key;
            }

            if (latestEntryLen % 10 === 9){ //automatically add new lines after a person has entered 'At2g10000'
                geneForm.value += "\n";
            }

            event.preventDefault();
        });
    }

    function rerunLocalizationSVG(AIVOBJ){
        document.getElementById('exprPredLocDiv').addEventListener('click', function(event){
            $("#exprPredLocEye").toggleClass('fa-eye fa-eye-slash');
            AIVOBJ.returnSVGandMapManThenChain();
        });
    }

    /***
     * @function getXMLSourcesModifyDropdown- perform AJAX to get the experimental conditions for our XML data
     */
    function getXMLSourcesModifyDropdown(){
        $.ajax({
            url: "http://bar.utoronto.ca/~asher/vincent/getXML.php?species=arabidopsis",
            type: "GET"
        })
            .then((res)=>{
                let options = "";
                for (let conditions of Object.keys(res)){
                    options += `<option>${res[conditions]}</option>`;
                }

                //append the HTML and also enable the dropdown
                $('#dropdownSource').append(options).prop('disabled', false);
            });
    }

    /**
     * @function getXMLTissuesFromConditionAJAX - When a user clicks on an experimental condition outside of the
     * 'Select Condition' we will then populate and enable the tissue dropdown and overlay expression checkbox
     */
    function getXMLTissuesFromConditionAJAX(AIVObj){
        document.getElementById('dropdownSource').addEventListener('change', function(event){
            let secondDropdown = $('#dropdownTissues');
            if (event.target.value === "Select Source"){
                return;
            }
            $.ajax({
               url: "http://bar.utoronto.ca/~asher/vincent/getTissues.php?species=arabidopsis&dataSource=" + event.target.value,
               type: "GET",
            })
                .then((res) =>{
                    let options = "";
                    for (let i = 0; i < res.length; i++) {
                        if (i === 0 ){ //change colour of second dropdown
                            secondDropdown.css({
                                backgroundColor : `${res[i].colour}`,
                                color           : "black",
                            });
                        }
                        options += `<option style="background-color: ${res[i].colour}; color: black">${res[i].tissue}</option>`;
                    }
                    secondDropdown.removeClass('not-allowed').html(options).prop('disabled', false);
                    document.getElementById("exprnOverlayChkAndLabel").classList.remove('not-allowed');
                    document.getElementById("exprnOverlayChkbox").disabled = false;
                    $('#exprnOverlayChkAndLabel').qtip('disable', true);
                    AIVObj.exprLoadState = {absolute: false, relative: false};
                    if (document.getElementById('exprnOverlayChkbox').checked) {                    overlayExpression(AIVObj, false);
                    } //only run cb when expr overlay turned on
                });
        });
    }

    /**
     * @function tissueDropdownChangeSelectColor - simple event listener that will change the options
     * node's background colour to the according dropdown menu choice
     * @param {object} AIVObj - reference to global namespace AIV object, with access to cytoscape methods
     */
    function tissueDropdownChangeSelectColor(AIVObj){
        document.getElementById('dropdownTissues').addEventListener('change', function(event){
            let dropdown = event.target;
            dropdown.style.backgroundColor = dropdown[dropdown.selectedIndex].style.backgroundColor;
            AIVObj.exprLoadState = {absolute: false, relative: false};
            if (document.getElementById('exprnOverlayChkbox').checked) {
                overlayExpression(AIVObj, false);
            }
        });
    }

    function expressionOverlayEListener(AIVObj){
        document.getElementById('exprnOverlayChkbox').addEventListener('change', function(event){
            // console.log("exprnOverlayChkbox");
            let exprLimChkbox = document.getElementById('exprLimitChkbox');
            let exprnOverlayChkd = event.target.checked;
            if (exprLimChkbox.checked){
                if (!exprnOverlayChkd) {
                    // console.log("expr overlay unchecked");
                    exprLimChkbox.click(); //turn off the threshold if turning off expr overlay
                }
                overlayExpression(AIVObj, true);
            }
            else {
                overlayExpression(AIVObj, false);
            }
            if (!exprnOverlayChkd){
                document.getElementById("exprGradientCanvas").getContext("2d").clearRect(0, 0, 70, 300);
                retnExprCSSLoadGradient(AIVObj).update(); // update node CSS to baseline stylesheet
            }
        });
    }

    function exprModeRadioEListener(AIVObj) {
        $('input[type=radio][name=expression_mode]').on('change', function(){
            let exprThr = document.getElementById('exprThreshold');
            exprThr.value = "";
            if ($(this).val() === "absolute"){
                exprThr.placeholder = "Limit expression val";
            }
            else {
                exprThr.placeholder = "Limit Log 2 ratio";
            }
            if (document.getElementById('exprnOverlayChkbox').checked) {
                overlayExpression(AIVObj, true);
            }
        });
    }

    function thresholdSwitchEListener(AIVObj) {
        document.getElementById('exprLimitChkbox').addEventListener('click', function(){
            console.log('exprLimitChkbox e listener');
            if (document.getElementById('exprnOverlayChkbox').checked){ // check if current mode state loaded so we avoid premature loading with the wrong button
                console.log('run?');
                overlayExpression(AIVObj, true);
            }
        });
    }

    function exprThresholdInputEListener(AIVObj) {
        let timeout = null; // initialize timer closure variable for listening when user stops typing
        document.getElementById('exprThreshold').addEventListener('keypress', function (event) {
            if (event.key === "-") {event.preventDefault(); return;} // prevent negative numbers
            if (!document.getElementById('exprnOverlayChkbox').checked) {return;} //only run cb when expr overlay turned on
            clearTimeout(timeout);
            timeout = setTimeout(function(){ // rerun the expr overlay typing stopped for 0.8s
                overlayExpression(AIVObj, true);
            }, 800);
        });
        document.getElementById('exprThreshold').addEventListener('paste', function (event) {
            if (!document.getElementById('exprnOverlayChkbox').checked) {return;} //only run cb when expr overlay turned on
            let clipboardData = event.clipboardData || window.clipboardData;
            let pastedData = clipboardData.getData('Text');
            if (pastedData.toString().match(/^\d+$/)){
                overlayExpression(AIVObj, true);
                return;
            }
            event.preventDefault(); //prevent pasting in weird non numbers
        });
    }

    function overlayExpression (AIVObj, resetSoftBounds){
        let inputMode = document.querySelector('input[name=expression_mode]:checked').value;
        let exprLdStateAbsOrRel = AIVObj.exprLoadState[inputMode];
        // console.log("load state", AIVObj.exprLoadState);
        if (!exprLdStateAbsOrRel){ // i.e. initial load of the expression data of either absolute or relative
            // console.log('initial load');
            let geneList = [];
            AIVObj.cy.filter("node[name ^= 'At']").forEach(function(node){
                let nodeID = node.data('name');
                if (nodeID.match(/^AT[1-5MC]G\d{5}$/i)){ //only get ABI IDs, i.e. exclude effectors
                    geneList.push(nodeID);
                }
            });
            let firstDropdown = document.getElementById('dropdownSource');
            let secondDropdown = document.getElementById('dropdownTissues');
            let postObject = {
                geneIDs: geneList,
                species: "arabidopsis",
                inputMode:  inputMode,
                dataSource: firstDropdown.options[ firstDropdown.selectedIndex ].text,
                tissue: secondDropdown.options[ secondDropdown.selectedIndex ].text,
                tissuesCompare: "",
            };
            // console.log(postObject);
            createExpressionAJAX(postObject, inputMode, AIVObj);
        }
        else if (exprLdStateAbsOrRel) { // if data alread loaded for that datamode, i.e. relative or absolute
            if (resetSoftBounds){
                console.log('resetThresholdOnly conditional');
                retnExprCSSLoadGradient(AIVObj, inputMode, exprLdStateAbsOrRel.lowerBd, exprLdStateAbsOrRel.upperBd, true).update();
            }
            else {
                console.log('redrawing cached canvas');
                document.getElementById("exprGradientCanvas").getContext("2d").drawImage(exprLdStateAbsOrRel.cache.canvas, 0, 0);
                retnExprCSSLoadGradient(AIVObj, inputMode, exprLdStateAbsOrRel.lowerBd , exprLdStateAbsOrRel.upperBd, false).update();
            }
        }
    }

    function createExpressionAJAX(listOfAGIsAndExprsnModes, mode, AIVObj) {
        return $.ajax({
            url: "http://bar.utoronto.ca/~asher/vincent/getSample.php",
            type: "POST",
            data: JSON.stringify( listOfAGIsAndExprsnModes ),
            contentType : 'application/json',
            dataType: 'json'
        })
            .then((res)=>{
                parseExprData(res, AIVObj, mode);
            })
            .catch((err)=>{

            });

        function parseExprData(resData, AIVRef, absOrRel){
            let absMode = absOrRel === "absolute";
            let maxThreshold = 0;
            for (let geneExpKey of Object.keys(resData)){
                let geneExp = resData[geneExpKey];
                let expressionVal = geneExp.mean || geneExp.log_2_value || 0; //for abs, '0' in the JSON becomes 'undefined'
                let testMaxExprVal = Math.abs(expressionVal); //include this expression for negative log numbers
                if (absMode){
                    AIVRef.cy.$id(`Protein_${geneExpKey}`)
                        .data({
                            absExpMn : expressionVal,
                            absExpSd : geneExp.sd
                        });
                }
                else {
                    AIVRef.cy.$id(`Protein_${geneExpKey}`)
                        .data({
                            relExpLog2 : expressionVal,
                            relExpFold : geneExp.fold_change
                        });
                }
                if (testMaxExprVal > maxThreshold){
                    maxThreshold = testMaxExprVal; // Iterate N times to find max expression level
                }
            }
            let minThreshold = absMode ? 0 : -Math.abs(maxThreshold);
            // console.log(maxThreshold, "max", minThreshold, "min");
            retnExprCSSLoadGradient(AIVRef, absOrRel, minThreshold, maxThreshold, true).update();
        }
    }

    function retnExprCSSLoadGradient (AIVObj, mode, lowerBound, upperBound, initLoad) {
        let lowerColor, middleColor;
        let decimalPlaces = 0;
        let upperColor = "rgb(255, 0, 0)";
        let loadState = AIVObj.exprLoadState;
        let userSetLimit= document.getElementById('exprLimitChkbox').checked;
        let userThreshold = Number(document.getElementById('exprThreshold').value) || 0;
        // having the below 2 base CSS selectors is especially helpful in case we don't get an expr value for an AGI such that the previous colour won't still be there
        let baseCSSObj = AIVObj.cy.style()
            .selector('node[id ^= "Protein_At"]')
                .css({
                    'background-color': AIVObj.nodeDefaultColor,
                })
            .selector('node[?queryGene]')
                .css({
                    'background-color': AIVObj.searchNodeColor,
                });
        console.log("return expr gradient canvas wants limit yes or no?", userSetLimit);
        let softUpperBound = userSetLimit && userThreshold > 0 ? userThreshold : upperBound;
        let softLowerBound;
        if (mode === "absolute"){
            softLowerBound = 0;
            lowerColor = "rgb(255, 255, 0)";
            baseCSSObj
                .selector('node[absExpMn > 0]') //exclude nodes with nonzero expression
                .css({
                    'background-color' : `mapData(absExpMn, ${softLowerBound}, ${softUpperBound}, ${lowerColor}, ${upperColor})`,
                });
        }
        else if (mode === "relative"){
            softLowerBound = userSetLimit && userThreshold > 0 ? -Math.abs(userThreshold) : lowerBound;
            decimalPlaces = 2;
            lowerColor = 'rgb(0, 0, 255)';
            middleColor = 'rgb(255, 255, 0)';
            AIVObj.parseProteinNodes(function(protein){
                // console.log(protein.data('name'));
                protein.data('relExpColor', retRelExpColor(softUpperBound, softLowerBound, protein.data('relExpLog2')));
            }, true);
            baseCSSObj
                .selector('node[relExpLog2]') //exclude nodes with nonzero expression
                .css({
                    'background-color' : "data(relExpColor)",
                });
        }
        // console.log('softupperbound', softUpperBound, 'softlowerbound', softLowerBound);
        if (initLoad){
            // Below line: cache the canvas ctx and also use it as a truthy value if user chooses to turn the expr overlay switch on and off repeatedly so we don't need to redraw (perf boost)
            loadState[mode] = {
                cache : createExprGradient(softLowerBound.toFixed(decimalPlaces), softUpperBound.toFixed(decimalPlaces), lowerColor, upperColor, mode.substring(0, 3), middleColor),
                upperBd : upperBound,
                lowerBd : lowerBound,
            };
            // console.log('what is this?', loadState[mode]);
            document.getElementById("exprGradientCanvas").getContext("2d").drawImage(loadState[mode].cache.canvas, 0, 0);
        }
        return baseCSSObj;
    }

    function retRelExpColor (softUpperBd, softLowerBd, relGeneLogExpr){
        // console.log(relGeneLogExpr, "gene expr", softLowerBd, "lowerbd", softUpperBd, "upperbd");
        if (relGeneLogExpr === 0) { // no expression, i.e. "N/A"/grey, probably don't need this as we have a non-zero CSS selector
            return 'rgb(205, 205, 205)';
        }
        else if (relGeneLogExpr > 0){ // yellow to red, up-expression
            let green = 255 * ( 1 - Math.abs(relGeneLogExpr/softUpperBd));
            if (green < 0) { //prevent rgb from going > 255 for when limit exceeded, i.e. user sets threshold
                green = 255;
            }
            // console.log(green, 'green');
            return `rgb(255, ${green} ,0)`;
        }
        else { // yellow to blue, down-expression
            let ratio = Math.abs(relGeneLogExpr/softLowerBd);
            let redGreen = 255 * (1 - ratio);
            if (redGreen < 0){ //prevent rgb from going < 0 for when limit exceeded, i.e. user sets threshold
                redGreen = 0;
            }
            let blue = 255 * ratio;
            if (blue > 255){
                blue = 255;
            }
            return `rgb(${redGreen}, ${redGreen}, ${blue})`;
        }
    }

    function createExprGradient(lowerBound, upperBound, lowerColor, upperColor, mode, intermediateColor){
        let canvasTemp = document.createElement("canvas");
        canvasTemp.width = 70;
        canvasTemp.height = 300;
        let ctx = canvasTemp.getContext("2d");
        ctx.font="bold 10pt Verdana";
        let grd = ctx.createLinearGradient(0, 0, 0, 250);
        grd.addColorStop(0, upperColor);
        if (mode === "rel"){
            grd.addColorStop(0.5, intermediateColor);
        }
        grd.addColorStop(1, lowerColor);
        ctx.fillStyle = grd;
        ctx.fillRect(10, 10, 60, 250);
        ctx.fillStyle = "#cdcdcd";
        ctx.fillRect(10, 270, 60, 300);
        ctx.fillStyle = "black";
        ctx.fillText("▲" + upperBound, 10, 25);
        ctx.fillText(mode, 25, 130);
        ctx.fillText("exp", 25, 145);
        if (mode === "rel"){
            ctx.fillText("(Log2)", 15, 165);
        }
        ctx.fillText("▼" + lowerBound, 10, 255);
        ctx.fillText("N/A", 17, 290);
        return ctx;
    }

    /**
     * @function checkBIOGRIDServerStatus - Check BIOGRID webservice status
     */
    function checkBIOGRIDServerStatus(){
        $.ajax({
            url: "https://cors-anywhere.herokuapp.com/www.ebi.ac.uk/Tools/webservices/psicquic/intact/webservices/current/search/query/species:human?firstResult=0&maxResults=1", //TODO: change to our proxy
            type: "GET"
        })
            .then(()=>{
                document.getElementById("spinnerBioGrid").style.display = 'none';
                $("<img src='images/activeServer.png'/>").insertAfter("#BioGridSpan");
                document.getElementById("queryBioGrid").parentNode.classList.remove('not-allowed');
                document.getElementById("queryBioGrid").disabled = false;
            })
            .catch(()=>{
                document.getElementById("spinnerBioGrid").style.display = 'none';
                $("<img src='images/inactiveServer.png'/>").insertAfter("#BioGridSpan");
            });
    }

    /**
     * @function checkServerStatus - Check PSICQUIC INTACT status
     */
    function checkINTACTServerStatus(){
        $.ajax({
            url: "https://cors-anywhere.herokuapp.com/tyersrest.tyerslab.com:8805/psicquic/webservices/current/search/interactor/arf7", //TODO: change to our proxy
            type: "GET"
        })
            .then(()=>{
                document.getElementById("spinnerIntAct").style.display = 'none';
                $("<img src='images/activeServer.png'/>").insertAfter("#IntActSpan");
                document.getElementById("queryIntAct").parentNode.classList.remove('not-allowed');
                document.getElementById("queryIntAct").disabled = false;
            })
            .catch(()=>{
                document.getElementById("spinnerIntAct").style.display = 'none';
                $("<img src='images/inactiveServer.png'/>").insertAfter("#IntActSpan");
            });
    }

    /**
     * @function effectorDropdownSelect2 - UI functionality for adding the dropdown list of effectors in our database
     */
    function effectorDropdownSelect2() {
        $.ajax({
            url: "http://bar.utoronto.ca/~asher/vincent/get_effectors.php",
            type: "GET"
        })
            .then((res)=>{
                if (res.status === "success"){
                    let effectorSelect$ = $('#effectorSelect');
                    effectorSelect$.empty();
                    for (let i = 0; i < res.data.length; i++){
                        let option = res.data[i];
                        let element = document.createElement('option');
                        element.textContent = option;
                        element.value = option;
                        document.getElementById('effectorSelect').appendChild(element);
                    }
                    effectorSelect$.select2({
                        dropdownParent: $('#formModal')
                    });
                    document.getElementById('addEffectorButton').addEventListener('click', function(e){
                        let latestFormEntry = document.getElementById('genes').value.split('\n').pop();
                        console.log(latestFormEntry);
                        if (latestFormEntry.match(/^AT[1-5MC]G\d{5}$/i) || res.data.indexOf(latestFormEntry) >= 0){
                            document.getElementById('genes').value += "\n" + effectorSelect$.val();
                        }
                        else if (latestFormEntry === "\n" || latestFormEntry === ""){
                            document.getElementById('genes').value += effectorSelect$.val();
                        }
                        else{
                            $('#formErrorModal').modal('show');
                        }
                    });
                }
                else {
                    throw new Error('loading effectors failed');
                }
            })
            .catch((err)=>{
                document.getElementById('loadingEffectors').innerText = "Error loading effectors";
            });
    }

    /**
     * @function enableInteractionsCheckbox - make recursive checkbox only work when BAR PPI is selected
     */
    function enableInteractionsCheckbox(){
        let barPPICheckbox = document.getElementById('queryBAR');
        barPPICheckbox.addEventListener('change', function(){
            var recursiveCheckbox = document.getElementById("recursive");
            var dnaCheckbox = document.getElementById("queryDna");
            if (barPPICheckbox.checked) {
                recursiveCheckbox.disabled = false;
                recursiveCheckbox.parentNode.classList.remove('not-allowed');
                dnaCheckbox.disabled = false;
                dnaCheckbox.parentNode.classList.remove('not-allowed');
            }
            else {
                recursiveCheckbox.parentNode.classList.add('not-allowed');
                recursiveCheckbox.disabled = true;
                recursiveCheckbox.checked = false;
                dnaCheckbox.parentNode.classList.add('not-allowed');
                dnaCheckbox.disabled = true;
                dnaCheckbox.checked = false;
            }
        });
    }

    /**
     * @function setTableFilter - add event listener to button to show filtered table
     * @param {object} AIVObj - reference to the AIV namespace object
     */
    function setTableFilter(AIVObj){
        document.getElementById('showCSVModal').addEventListener('click', function(event){
            if (! $(".inf")[0]) { // only create a new table filter row if one doesn't exist
                let filtersConfig = {
                    base_path: 'https://unpkg.com/tablefilter@latest/dist/tablefilter/',
                    auto_filter: {
                        delay: 500 //milliseconds
                    },
                    paging: {
                        results_per_page: ['Interactions Per Page:', [10, 25, 50, 100, 99999]]
                    },
                    filters_row_index: 1,
                    state: true,
                    alternate_rows: true,
                    rows_counter: true,
                    btn_reset: true,
                    status_bar: true,
                    msg_filter: 'Filtering...',

                    col_types: [
                        'string',
                        'string',
                        'string',
                        'string',
                        'string',
                        'formatted-number',
                        'formatted-number',
                        'string',
                        'string',
                        'string',
                        'string',
                    ],

                    extensions: [{ name: 'sort' }]
                };
                let tf = new TableFilter('csvTable', filtersConfig);
                tf.init();
            }

            $('#CSVModal').modal('show');
        });
    }

    /**
     * @function setCSVExport - add event listener to button to allow for CSV download/export
     */
    function setCSVExport(){
        document.getElementById('exportCSV').addEventListener('click', function(event){
            event.preventDefault();
            $('#csvTable').TableCSVExport({delivery: 'download', filename: 'aiv-interaction-data.csv'});
        });
    }

    /**
     * @function setPNGExport - add event listener to button, use native cytoscape png method
     * @param {object} AIVObj - reference to the AIV namespace object
     */
    function setPNGExport(AIVObj){
        document.getElementById('showPNGModal').addEventListener('click', function(event){
            $('#PNGModal').modal('show');
            document.getElementById('png-export').setAttribute('src', AIVObj.cy.png());
        });
    }

    /**
     * @function setJSONexport - add event listener to button, use native cytoscape JSON method
     * @param {object} AIVObj - reference to the AIV namespace object
     */
    function setJSONexport(AIVObj){
        new ClipboardJS('#copy-to-clipboard', { //Copy to Clipboard functionality
            container: document.getElementById('#JSONModal')
        });
        document.getElementById('showJSONModal').addEventListener('click', function(event){
            $('#JSONModal').modal('show');
            let cyJSON = AIVObj.cy.json();
            cyJSON.AIV2JSON = true; // custom property that this JSON originated from this app... will be exploited later for an if clause when uploading
            document.getElementById('json-export').innerText = JSON.stringify( cyJSON, null, '    ' );
            hljs.highlightBlock(document.getElementById('json-export'));
        });
    }

    /**
     * @function filterNonQueryGenes - add event listener to checkbox to visually filter out non-form gene nodes and edges
     * @param {object} AIVObj - reference to the AIV namespace object
     */
    function filterNonQueryGenes(AIVObj) {
        document.getElementById('filterNonQueryEyeDiv').addEventListener('click', function(event){
            $("#filterNonQueryEye").toggleClass('fa-eye fa-eye-slash');
            AIVObj.cy.startBatch();
            AIVObj.cy.$('node[!queryGene][id ^= "Protein"], node[!queryGene][id ^= "Effector"]').toggleClass('filteredChildNodes');
            AIVObj.cy.endBatch();
        });
    }

    /**
     * @function pearsonFilterEPPIonEles - Take filter value and use it to find edges with R more than that
     * value. Then find those nodes that connect to such edges. Within these nodes, filter again by comparing
     * how many total edges(degree) it has to how many edges connected to it fit the filter. If they're equal
     * hide the node. This later logic is useful for when we having interactions between interactions.
     * I had to do this because if you just hide the edges they'll leave the nodes left on the app
     * Lastly hide all the edges that fit the filter as a failsafe (because when you hide nodes, they hide the
     * edges).
     * @param {object} AIVObjReference - reference to the AIV namespace object
     */
    function pearsonFilterEPPIonEles(AIVObjReference){
        let filterValue = document.getElementById('EPPICorrThreshold').value;
        let selector = `edge[pearsonR <= ${filterValue}][?published][target ^= 'Protein']`;
        let edges = AIVObjReference.cy.$(selector);
        edges.connectedNodes('node[!queryGene][id ^="Protein"]').forEach(function(ele){
            // console.log(ele.data(), "data, degree", ele.degree());
            if (ele.connectedEdges(selector).size() === ele.degree()){
                ele.addClass('pearsonfilterEPPI');
            }
        });
        edges.addClass('pearsonfilterEPPI');
    }

    /**
     * @function filterExperimentalPPIsSwitch - add switch/checkbox functionality to filter EPPIs
     * @param {object} AIVObj - reference to the AIV namespace object
     */
    function filterExperimentalPPIsSwitch(AIVObj) {
        document.getElementById('filterEPPIsCheckbox').addEventListener('change', function(event){
            // when checkbox is off, remove filter, when checkbox is on remove them and add them back on...
            AIVObj.cy.$('.pearsonfilterEPPI').removeClass('pearsonfilterEPPI');
            AIVObj.cy.$('.filterByReference').removeClass('filterByReference');
            // below logic is for cleaner UI to disable filters when switch is off
            if (event.target.checked){
                document.getElementById('EPPICorrThreshold').removeAttribute("disabled");
                document.getElementById('overSelect').classList.remove('not-allowed');
                document.getElementById('pseudo-select').classList.remove('not-allowed');
                // add filters back on
                pearsonFilterEPPIonEles(AIVObj);
                filterEdgesByRefFunctionality(AIVObj);
            }
            else {
                document.getElementById('EPPICorrThreshold').setAttribute("disabled", "");
                document.getElementById('overSelect').classList.add('not-allowed');
                document.getElementById('pseudo-select').classList.add('not-allowed');
            }
        });
    }

    /***
     * @function filterEdgesByRefFunctionality - The function for filtering edges by references to be referenced in the event listener
     * @description - TODO I feel like this function is a little too convulated and perhaps inefficient, there are many ways to solve the 'filtering' edges problem but the issue is:
     * 1) We want desire when a person selects a filter that it only filters out an edge that no longer has any 'checked' filters that support it, meaning we can't do a simple substring/search for an edge
     * 2) The performance of this function is contigent on whether the user decides to filter an intermediate amount; we don't have user testing data to know if that's true
     * The performance of this function roughly is (num of unchecked boxes) * (edges that do not have a filter) * (num of delimited refs per edge) * (num of checkboxes); thankfully all of these terms are small (for ex, rarely does an edge more than 4 references).
     * The best way to solve this is to likely use cytoscapeJS's filtering selectors but I haven't been able to think of a clever selector other than all possible combinations of the checked boxes
     * @param AIVObj - reference to the AIV namespace object
     */
    function filterEdgesByRefFunctionality(AIVObj){
        let uncheckedRefsArr = [];
        [].forEach.call(document.querySelectorAll('input:not(:checked).ref-checkbox'), function(node){ //nodelist hack for unsupported browsers
            uncheckedRefsArr.push(node.value);
        });
        let checkedRefsArr = [];
        [].forEach.call(document.querySelectorAll('input:checked.ref-checkbox'), function(node) { //nodelist hack for unsupported browsers
            checkedRefsArr.push(node.value);
        });
        if (checkedRefsArr.length > 0){ document.getElementById('allCheck').checked = false; } // if user filters all of the checkboxes and then clicks a filter, change its check status
        uncheckedRefsArr.forEach(function(refValue){
            let selector = `edge[reference *= '${refValue}']`;
            let edges = AIVObj.cy.$(selector);

            let filteredEdges = edges.filter(function (edge){
                if (edge.hasClass('filterByReference')) {
                    return false; // only continue our operation on an edge if we haven't already filtered it
                }

                let edgeRefData = edge.data('reference'); // string of refs delimited by newlines
                let returnBool = true;
                for (let refCheckedValue of checkedRefsArr){
                    if (edgeRefData.includes(refCheckedValue)){
                        returnBool = false;
                        break;
                    }
                }
                return returnBool;
            });

            filteredEdges.connectedNodes('node[!queryGene][id ^="Protein"], node[!queryGene][id ^="Effector"]').forEach(function(ele){
                if (ele.connectedEdges(selector).size() === ele.degree()) {
                    ele.addClass('filterByReference');
                }
            });
            filteredEdges.addClass('filterByReference'); // hide the edge now
        });
    }

    /**
     * @function filterAllElistener - filter all of the references by clicking through all the checked checkboxes if checked, if #allCheck is unchecked, recheck all references
     * @description - note that I decided NOT to click through all the checkboxes as that would be much slower and user-unfriendly; the cost is that I am taking the risk that all of the checkboxes filtered are pubmeds/dois/AI-1
     */
    function filterAllElistener(AIVObj){
        document.getElementById('allCheck').addEventListener('click',function(event){
            if (event.target.checked) {
                let nodeListChkdCheckboxes = document.querySelectorAll('input:checked.ref-checkbox');
                AIVObj.cy.edges('[reference *= "pubmed"], [reference *= "doi"], [reference *= "AI-1"]').addClass('filterByReference');
                if (nodeListChkdCheckboxes.length > 0) { //reset form checkboxes
                    [].forEach.call(nodeListChkdCheckboxes, function(node){
                        node.checked = false;
                    });
                }
            }
            else {
                let nodeListUnchkdCheckboxes = document.querySelectorAll('input:not(:checked).ref-checkbox');
                if (nodeListUnchkdCheckboxes.length > 0) { //reset form checkboxes
                    AIVObj.cy.$('.filterByReference').removeClass('filterByReference');
                    [].forEach.call(nodeListUnchkdCheckboxes, function(node){
                        node.checked = true;
                    });
                }
            }
        });
    }

    /**
     * @function filterEdgesByRefEListener - add switch/checkbox functionality to filter EPPIs...
     * If you are confused about the logic go to function desc in pearsonFilterEPPIonEles
     * @param {object} AIVObj - reference to the AIV namespace object
     */
    function filterEdgesByRefEListener(AIVObj){
        document.getElementById('refCheckboxes').addEventListener('change', function(e){
            AIVObj.cy.$('.filterByReference').removeClass('filterByReference');
            filterEdgesByRefFunctionality(AIVObj);
        });
    }

    /**
     * @function showReferenceChkboxes - add event listener to a pseudo element (an anchor for relative positioning) to show the 'hidden checkboxes'
     */
    function showReferenceChkboxes() {
        let expanded = false;
        let checkboxes = $("#refCheckboxes");
        document.getElementById('pseudo-select-box').addEventListener('click', function(e){
            if (!document.getElementById('filterEPPIsCheckbox').checked){
                return; // exit immediately if user doesnt have filter on
            }

            if (!expanded) {
                checkboxes.css('display', 'block');
                expanded = true;
            }
            else {
                checkboxes.css('display', 'none');
                expanded = false;
            }
            // Below is a 'hack' to remove the text selection that seldom happens with this multi select hack :P
            if (window.getSelection) {window.getSelection().removeAllRanges();}
            else if (document.selection) {document.selection.empty();}
        });

        document.addEventListener('click', function(e){ //event listener to handle clicks outside of dropdown
            let multiSelectDiv = $("#multi-select");

            // if the target of the click isn't the container nor a descendant of the container
            if (!multiSelectDiv.is(e.target) && multiSelectDiv.has(e.target).length === 0) {
                checkboxes.css('display', 'none');
                expanded = false;
            }
        });
    }


    /**
     * @function filterExperimentalPPIsInputEListener - add event listeners to the EPPI thersholds (correlation coefficients)
     * @param {object} AIVObj - reference to the AIV namespace object
     */
    function filterExperimentalPPIsInputEListener(AIVObj){
        document.getElementById('EPPICorrThreshold').addEventListener('change', function(event){
            if ( document.getElementById('filterEPPIsCheckbox').checked ){
                AIVObj.cy.$('.pearsonfilterEPPI').removeClass('pearsonfilterEPPI');
                pearsonFilterEPPIonEles(AIVObj);
            }
        });
    }

    /**
     * @function pearsonAndInterologFilterPPPIonEles - Similar logic to pearsonFilterEPPIonEles function but with additonal logic for the interlog confidence threshold (uses an OR cytoscapejs selector)
     * @param {object} AIVObjReference - reference to the AIV namespace object
     */
    function pearsonAndInterologFilterPPPIonEles(AIVObjReference){
        let filterRValue = Number(document.getElementById('PPPICorrThreshold').value);
        let filterInterlogConf = Number(document.getElementById('PPPIConfThreshold').value);
        let selector = `edge[pearsonR <= ${filterRValue}][!published][target ^= 'Protein'], edge[interologConfidence >= 1][interologConfidence <= ${filterInterlogConf}][!published][target ^= 'Protein']`;
        let edges = AIVObjReference.cy.$(selector); // OR selector
        edges.connectedNodes('node[!queryGene][id ^="Protein"]').forEach(function(ele){
            // console.log(ele.data(), "data, degree", ele.degree());
            if (ele.connectedEdges(selector).size() === ele.degree()){
                ele.addClass('pearsonAndInterologfilterPPPI');
            }
        });
        edges.addClass('pearsonAndInterologfilterPPPI');
    }

    /**
     * @function hideUnhideMapMan - add switch/checkbox functionality to filter PPPIs
     * @param {object} AIVObj - reference to the AIV namespace object
     */
    function filterPredictedPPIsSwitch(AIVObj) {
        document.getElementById('filterPPPIsCheckbox').addEventListener('change', function(event){
            // when checkbox is off, remove filter, when checkbox is on remove them and add them back on...
            AIVObj.cy.$('.pearsonAndInterologfilterPPPI').removeClass('pearsonAndInterologfilterPPPI');
            // below logic is for cleaner UI to disable filters when switch is off
            if (event.target.checked){
                document.getElementById('PPPICorrThreshold').removeAttribute("disabled");
                document.getElementById('PPPIConfThreshold').removeAttribute("disabled");
                pearsonAndInterologFilterPPPIonEles(AIVObj);
            }
            else {
                document.getElementById('PPPICorrThreshold').setAttribute("disabled", "");
                document.getElementById('PPPIConfThreshold').setAttribute("disabled", "");
            }
        });
    }

    /**
     * @function hideUnhideMapMan - add event listeners to the PPPI thersholds (confidence and correlation coefficients)
     * @param {object} AIVObj - reference to the AIV namespace object
     */
    function filterPredictedPPIsInputsEListener(AIVObj){
        function eListener (event){
            if ( document.getElementById('filterPPPIsCheckbox').checked ){
                AIVObj.cy.$('.pearsonAndInterologfilterPPPI').removeClass('pearsonAndInterologfilterPPPI');
                pearsonAndInterologFilterPPPIonEles(AIVObj);
            }
        }
        document.getElementById('PPPICorrThreshold').addEventListener('change', eListener);
        document.getElementById('PPPIConfThreshold').addEventListener('change', eListener);
    }

    /**
     * @function restrictUIInputsNumRange - restrict the threshold values
     */
    function restrictUIInputsNumRange() {
        function restrictRRange (event){
            let value = Number(event.target.value);
            if ( value < -1.0){ event.target.value = -1.0;}
            else if (value > 1.0) {event.target.value = 1.0;}
        }
        document.getElementById('PPPICorrThreshold').addEventListener('input', restrictRRange);
        document.getElementById('EPPICorrThreshold').addEventListener('input', restrictRRange);
        document.getElementById('PPPIConfThreshold').addEventListener('input', function(event){
            let value = Number(event.target.value);
            if ( value < -0){ event.target.value = 0;}
            else if (value > 90) {event.target.value = 90;}
        });
    }

    /**
     * @function hideUnhideMapMan - event listener binding function for hiding mapman donut centres
     * @param {object} AIVObj - reference to the AIV namespace object
     */
    function hideUnhideMapMan(AIVObj) {
        document.getElementById('hideMapManDiv').addEventListener('click', function(event){
            AIVObj.hideMapMan($("#hideMapManEye").hasClass('fa-eye'));
            $("#hideMapManEye").toggleClass('fa-eye fa-eye-slash');
        });
    }

    /**
     * @function hideUnhideDonuts - event listener binding function for hiding pie chart donuts
     * @param {object} AIVObj - reference to the AIV namespace object
     */
    function hideUnhideDonuts(AIVObj) {
        document.getElementById('hideDonutDiv').addEventListener('click', function(event){
            AIVObj.hideDonuts($("#hideDonutEye").hasClass('fa-eye'));
            $("#hideDonutEye").toggleClass('fa-eye fa-eye-slash');
        });
    }

    /**
     * @function hideUnhideDNA - event listener binding function for hiding DNA nodes
     * @param {object} AIVObj - reference to the AIV namespace object
     */
    function hideUnhideDNA(AIVObj) {
        document.getElementById('hideDNADiv').addEventListener('click', function(event){
            AIVObj.cy.$('node[id ^= "DNA"]').toggleClass('DNAfilter', $("#hideDNAEye").hasClass('fa-eye'));
            $("#hideDNAEye").toggleClass('fa-eye fa-eye-slash');
        });
    }

    /**
     * @function changeLayoutCyHouseCleaning - Helper function that will be run before a new layout is executed
     * @param {object} AIVObjReference - reference to global namespace AIV object, with access to cytoscape methods
     * @param {boolean} coseOrNot - boolean to determine if this is a cose layout change or not
     */
    function changeLayoutCyHouseCleaning(AIVObjReference, coseOrNot){
        $('#cerebralBackground').remove(); //remove the canvas underlay from localization layout
        AIVObjReference.cy.removeListener('zoom pan', window.cerebralNamespace.zoomPanCerebralEListener); // remove the canvas resizing event listener when the user selected cerebral layout
        AIVObjReference.cy.removeListener('zoom pan', window.cerebralNamespace.resizeCerebralElistener); // remove the canvas resizing event listener when the browser resizes
        AIVObjReference.cy.reset(); //resets pan and zoom positions
        if (!coseOrNot){
            AIVObjReference.removeLocalizationCompoundNodes();
        }
    }

    /**
     * @function spreadLayoutEventListener - change to cerebral/layered layout
     * @param {object} AIVObj - reference to global namespace AIV object, with access to cytoscape methods
     */
    function localizationLayoutEventListener(AIVObj) {
        document.getElementById('localizationLayout').addEventListener('click', function(event){
            changeLayoutCyHouseCleaning(AIVObj, false);
            AIVObj.cy.reset();
            AIVObj.cy.layout(AIVObj.getCyCerebralLayout()).run();
        });
    }

    /**
     * @function spreadLayoutEventListener - change to spread layout
     * @param {object} AIVObj - reference to global namespace AIV object, with access to cytoscape methods
     */
    function spreadLayoutEventListener(AIVObj) {
        document.getElementById('spreadLayout').addEventListener('click', function(event){
            changeLayoutCyHouseCleaning(AIVObj, false);
            AIVObj.cy.layout(AIVObj.getCySpreadLayout()).run();
        });
    }

    /**
     * @function coseCompoundLayoutEventListener - change to cose compound layout, after doing some checks
     * @param {object} AIVObj - reference to global namespace AIV object, with access to cytoscape methods
     */
    function coseCompoundLayoutEventListener(AIVObj) {
        document.getElementById('coseCompoundLayout').addEventListener('click', function(event){
            changeLayoutCyHouseCleaning(AIVObj, true);
            if (!AIVObj.coseParentNodesOnCyCore) { //only run if parent nodes are not already added //took out AIVObj.SUBA4LoadState && check
                AIVObj.addLocalizationCompoundNodes();
                AIVObj.removeAndAddNodesForCompoundNodes();
            }
            AIVObj.cy.layout(AIVObj.getCyCOSEBilkentLayout()).run();
        });
    }

    /**
     * @function resetPanZoomEventListener - zoom in e listener
     * @param {object} AIVObj - reference to global namespace AIV object, with access to cytoscape methods
     */
    function zoomInEventListener(AIVObj){
        document.getElementById('zoomIn').addEventListener('click', function(event){
            AIVObj.cy.zoom({
                level: AIVObj.cy.zoom()*2,
                renderedPosition: { x: AIVObj.cy.height()/2, y: AIVObj.cy.width()/2},
            });
        });
    }

    /**
     * @function zoomOutEventListener - zoom out e listener
     * @param {object} AIVObj - reference to global namespace AIV object, with access to cytoscape methods
     */
    function zoomOutEventListener(AIVObj){
        document.getElementById('zoomOut').addEventListener('click', function(event){
            AIVObj.cy.zoom({
                level: AIVObj.cy.zoom()*0.5,
                renderedPosition: { x: AIVObj.cy.height()/2, y: AIVObj.cy.width()/2},
            });
        });
    }

    /**
     * @function resetPanZoomEventListener - reset zoom and pan
     * @param {object} AIVObj - reference to global namespace AIV object, with access to cytoscape methods
     */
    function resetPanZoomEventListener(AIVObj){
        document.getElementById('zoomReset').addEventListener('click', function(event){
            AIVObj.cy.zoom(AIVObj.defaultZoom);
            AIVObj.cy.pan(AIVObj.defaultPan);
        });
    }

    /**
     * @function panLeft - simple UI function to pan left 100 pixels on cy core
     * @param {object} AIVObj - reference to global namespace AIV object, with access to cytoscape methods
     */
    function panLeft(AIVObj){
        document.getElementById('panLeft').addEventListener('click', function(){
            AIVObj.cy.panBy({ x: -100, y: 0});
        });
    }

    /**
     * @function panRight - simple UI function to pan right 100 pixels on cy core
     * @param {object} AIVObj - reference to global namespace AIV object, with access to cytoscape methods
     */
    function panRight(AIVObj){
        document.getElementById('panRight').addEventListener('click', function(){
            AIVObj.cy.panBy({ x: 100, y: 0});
        });
    }

    /**
     * @function panUp - simple UI function to pan up 100 pixels on cy core
     * @param {object} AIVObj - reference to global namespace AIV object, with access to cytoscape methods
     */
    function panUp(AIVObj){
        document.getElementById('panUp').addEventListener('click', function(){
            AIVObj.cy.panBy({ x: 0, y: 100});
        });
    }

    /**
     * @function panDown - simple UI function to pan down 100 pixels on cy core
     * @param {object} AIVObj - reference to global namespace AIV object, with access to cytoscape methods
     */
    function panDown(AIVObj){
        document.getElementById('panDown').addEventListener('click', function(){
            AIVObj.cy.panBy({ x: 0, y: -100});
        });
    }

    /**
     * @function highlightNodes - Functionality for search bar to search for particular AGI protein nodes by adding a class to them; also has the clear functionality
     * @param {object} AIVObj - reference to global namespace AIV object, with access to cytoscape methods
     */
    function highlightNodes(AIVObj){
        document.getElementById('highlightNodes').addEventListener('click', function(event) {
            let genes = AIVObj.formatAGI($.trim(document.getElementById('highlightNodesAGIs').value.split(" ").join(""))); // format to exclude whitespaces between and outside of string
            genes = "#Protein_" + genes.split(',').join(',#Protein_');
            console.log(genes);
            AIVObj.cy.$(genes).addClass('highlighted');
        });
        document.getElementById('cancelHighlight').addEventListener('click', function(event) {
            AIVObj.cy.$('.highlighted').removeClass('highlighted');
            document.getElementById('highlightNodesAGIs').value = "";
        });
    };

    /**
     * @function mapManDropDown -
     * @param {object} AIVObj - reference to global namespace AIV object, with access to cytoscape methods
     */
    function mapManDropDown(AIVObj){
        $('#mmDropdown').on({ //hack to prohibit the dropdown from closing when you click outside, credits to https://stackoverflow.com/questions/19740121/keep-bootstrap-dropdown-open-when-clicked-off/19797577#19797577
            "shown.bs.dropdown": function() { this.closable = false; },
            "click":             function() { this.closable = true; },
            "hide.bs.dropdown":  function() { return this.closable; }
        });

        $('#bootstrapDropDownMM a').on( 'click', function( event ) {
            let inputChild = $(event.target).children("input");
            inputChild.prop('checked', !inputChild.is(':checked'));
            hideMapManNodes($(event.target).data("value"));
            return false;
        });

        function hideMapManNodes(mapManNum){
            console.log(mapManNum);
            AIVObj.cy.startBatch();
            AIVObj.cy.$(`node[mapManOverlay = '${mapManNum}'][id ^= "Protein"]`).toggleClass('hideMapManNodes');
            AIVObj.cy.endBatch();
        };
    }

    /**
     * @function qTipsUI - bind qTips to HTML elements which have the title attribute
     */
    function qTipsUI(){
        $('#copy-to-clipboard[title]').qtip({
            style: {classes: 'qtip-light'},
            position: {
                my: 'bottom center',
                at: 'top center',
            }
        });

        $('#exportCSV').qtip({
            style: {classes: 'qtip-light'},
            position: {
                my: 'bottom center',
                at: 'top center',
            }
        });

        $('#exprnOverlayChkAndLabel[title]').qtip({
            style: {classes: 'qtip-light'},
            position: {
                my: 'top center',
                at: 'bottom center'
            },
            hide: {
                event: 'unfocus mouseleave'
            }
        });

        $('#about-sppi[title]').qtip({
            style: {classes: 'qtip-light'},
            position: {
                my: 'bottom center',
                at: 'top center',
            }
        });

        $('.aboutPSICQUIC[title]').qtip({
            style: {classes: 'qtip-light'},
            position: {
                my: 'bottom center',
                at: 'top center',
            }
        });

        $('#aboutCircle[title]').qtip({
            style: {classes: 'qtip-light'},
            position: {
                my: 'bottom center',
                at: 'top center',
            }
        });
    }

})(window, jQuery, cytoscape, ClipboardJS, alertify);