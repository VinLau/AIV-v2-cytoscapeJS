/**
 * @fileOverview AIV2, Arabidopsis Interactions Viewer Two User Interface Options. Supplementary JS file that powers most of the front-end options (filtering nodes, changing server statuses) of AIV 2.0.
 * @version 2.0, Jan2018
 * @author Vincent Lau <vincente.lau@mail.utoronto.ca>
 */

(function(window, $, cytoscape, undefined) {
    'use strict';

    //DOM ready;
    $(function() {
        if (typeof window.aivNamespace.AIV !== 'undefined') { // only run if we have initialized cytoscape app
            let AIV = window.aivNamespace.AIV;
            runUIFunctions(AIV);
        }
        else { // if not loaded, try again after 1 second
            setTimeout(function(){
                let AIV = window.aivNamespace.AIV;
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
        enableInteractionsCheckbox();
        addExampleEListener();
        showFormOnLoad();
        addResetEListener();
        showModals();
        checkINTACTServerStatus();
        checkBIOGRIDServerStatus();
        getXMLSourcesModifyDropdown();
        getXMLTissuesFromConditionAJAX(AIVref);
        tissueDropdownChangeSelectColor(AIVref);
        expressionQtip();
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
        filterEdgesByRefFunctionality(AIVref);
        filterPredictedPPIsSwitch(AIVref);
        filterPredictedPPIsInputsEListener(AIVref);
        localizationLayoutEventListener(AIVref);
        spreadLayoutEventListener(AIVref);
        coseCompoundLayoutEventListener(AIVref);
        zoomInEventListener(AIVref);
        resetEventListener(AIVref);
        zoomOutEventListener(AIVref);
        panLeft(AIVref);
        panRight(AIVref);
        panUp(AIVref);
        panDown(AIVref);
        hideUnhideMapMan(AIVref);
        hideUnhideDonuts(AIVref);
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
            document.getElementById('predSUBA').click();
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

    /** @function addResetEListener - modal functionality*/
    function showModals(){
        // Show Legend
        $('#showLegendModal').click(function(e) {
            e.preventDefault();
            $('#LegendModal').modal('show');
        });

        // Show Legend
        $('#showFormModal').click(function(e) {
            e.preventDefault();
            $('#formModal').modal('show');
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

            if (geneFormValueLen % 10 === 0 && (key === "a" || key === "A")){
                geneForm.value += "A";
            }
            else if ((geneFormValueLen % 10 === 1) && (key === "t" || key === "T")){
                geneForm.value += "t";
            }
            else if ((geneFormValueLen % 10 === 2) && key.match(/[1-5]/)){
                geneForm.value += key;
            }
            else if ((geneFormValueLen % 10 === 3) && key.match(/[gmc]/i)){
                geneForm.value += key;
            }
            else if ((geneFormValueLen % 10 === 4) ||
                     (geneFormValueLen % 10 === 5) ||
                     (geneFormValueLen % 10 === 6) ||
                     (geneFormValueLen % 10 === 7) ||
                     (geneFormValueLen % 10 === 8) &&
                     key.match(/\d/)){
                geneForm.value += key;
            }

            if (geneForm.value.length % 10 === 9){ //automatically add new lines after a person has entered 'At2g10000'
                geneForm.value += "\n";
            }

            event.preventDefault();
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

    function expressionQtip () {
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
    }

    function expressionOverlayEListener(AIVObj){
        document.getElementById('exprnOverlayChkbox').addEventListener('change', function(event){
            console.log("exprnOverlayChkbox");
            let exprLimChkbox = document.getElementById('exprLimitChkbox');
            let exprnOverlayChkd = event.target.checked;
            if (exprLimChkbox.checked){
                console.log("I am here?");
                if (!exprnOverlayChkd) {
                    console.log("expr overlay unchecked");
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
                exprThr.placeholder = "raw#";
            }
            else {
                exprThr.placeholder = "log2";
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
        let expLdState = AIVObj.exprLoadState;
        let exprLdStateAbsOrRel = AIVObj.exprLoadState[inputMode];
        console.log("load state", expLdState);
        if (!exprLdStateAbsOrRel){ // i.e. initial load of the expression data of either absolute or relative
            console.log('initial load conditional');
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
            console.log(postObject);
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
                let expressionVal = geneExp.mean || Math.abs(geneExp.log_2_value);
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
                            absExpLog2 : expressionVal,
                            absExpFold : geneExp.fold_change
                        });
                }
                if (expressionVal > maxThreshold){
                    maxThreshold = expressionVal; // Iterate N times to find max expression level
                }
            }
            let minThreshold = absMode ? 0 : -Math.abs(maxThreshold);
            console.log(maxThreshold, "max", minThreshold, "min");
            retnExprCSSLoadGradient(AIVRef, absOrRel, minThreshold, maxThreshold, true).update();
        }
    }

    function retnExprCSSLoadGradient (AIVObj, mode, lowerBound, upperBound, initLoad) {
        let lowerColor;
        let decimalPlaces = 0;
        let upperColor = "red";
        let loadState = AIVObj.exprLoadState;
        let userSetLimit= document.getElementById('exprLimitChkbox').checked;
        let userThreshold = Number(document.getElementById('exprThreshold').value) || 0;
        // having the below 2 base CSS selectors is especially helpful in case we don't get an expr value for an AGI such that the previous colour won't still be there
        let baseCSSObj = AIVObj.cy.style()
            .selector('node[id ^= "Protein_At"]')
                .css({
                    'background-color': AIVObj.nodeDefaultColor,
                })
            .selector('node[?searchGeneData]')
                .css({
                    'background-color': AIVObj.searchNodeColor,
                });
        console.log("return expr gradient canvas wants limit yes or no?", userSetLimit);
        let softUpperBound = userSetLimit && userThreshold > 0 ? userThreshold : upperBound;
        let softLowerBound = userSetLimit && userThreshold > 0 ? -Math.abs(userThreshold) : lowerBound;
        console.log('softupperbound', softUpperBound, 'softlowerbound', softLowerBound);
        if (mode === "absolute"){
            lowerColor = "yellow";
            baseCSSObj
                .selector('node[?absExpMn]')
                .css({
                    'background-color' : `mapData(absExpMn, ${softLowerBound}, ${softUpperBound}, ${lowerColor}, ${upperColor})`,
                });
        }
        else if (mode === "relative"){
            decimalPlaces = 2;
            lowerColor = 'green';
            baseCSSObj
                .selector('node[?absExpLog2]')
                .css({
                    'background-color' : `mapData(absExpLog2, ${softLowerBound}, ${softUpperBound}, ${lowerColor}, ${upperColor})`,
                });
        }
        if (initLoad){
            // Below line: cache the canvas ctx and also use it as a truthy value if user chooses to turn the expr overlay switch on and off repeatedly so we don't need to redraw (perf boost)
            loadState[mode] = {
                cache : createExprGradient(softLowerBound.toFixed(decimalPlaces), softUpperBound.toFixed(decimalPlaces), lowerColor, upperColor, mode.substring(0, 3), AIVObj),
                upperBd : upperBound,
                lowerBd : lowerBound,
            };
            console.log('what is this?', loadState[mode]);
            document.getElementById("exprGradientCanvas").getContext("2d").drawImage(loadState[mode].cache.canvas, 0, 0);
        }
        return baseCSSObj;
    }

    function createExprGradient(lowerBound, upperBound, lowerColor, upperColor, mode){
        let canvasTemp = document.createElement("canvas");
        canvasTemp.width = 70;
        canvasTemp.height = 300;
        let ctx = canvasTemp.getContext("2d");
        ctx.font="bold 10pt Verdana";
        let grd = ctx.createLinearGradient(0, 0, 0, 250);
        grd.addColorStop(0, upperColor);
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
     * @function enableInteractionsCheckbox - make recursive checkbox only work when BAR PPI is selected
     */
    function enableInteractionsCheckbox(){
        let barPPICheckbox = document.getElementById('queryBAR');
        barPPICheckbox.addEventListener('change', function(){
            var recursiveCheckbox = document.getElementById("recursive");
            if (barPPICheckbox.checked) {
                recursiveCheckbox.disabled = false;
                recursiveCheckbox.parentNode.classList.remove('not-allowed');
            }
            else {
                recursiveCheckbox.parentNode.classList.add('not-allowed');
                recursiveCheckbox.disabled = true;
                recursiveCheckbox.checked = false;
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
        document.getElementById('showJSONModal').addEventListener('click', function(event){
            $('#JSONModal').modal('show');
            var JSONStringified = JSON.stringify( AIVObj.cy.json(), null, '    ' );
            document.getElementById('json-export').innerText = JSONStringified;
            hljs.highlightBlock(document.getElementById('json-export'));
            //JSON Copy to Clipboard
            document.getElementById('copy-to-clipboard').addEventListener('click', function(event){
                //make a hidden input to select text from for copying
                let tempInput = document.createElement('textarea');
                tempInput.textContent = JSONStringified;
                document.body.appendChild(tempInput);
                let selection = document.getSelection();
                let range = document.createRange();
                range.selectNode(tempInput);
                selection.removeAllRanges();
                selection.addRange(range);
                document.execCommand("Copy");
                selection.removeAllRanges();
                tempInput.style.display = 'none';
            });
        });
    }

    /**
     * @function filterNonQueryGenes - add event listener to checkbox to visually filter out non-form gene nodes and edges
     * @param {object} AIVObj - reference to the AIV namespace object
     */
    function filterNonQueryGenes(AIVObj) {
        document.getElementById('filterNonQueryCheckbox').addEventListener('change', function(event){
            AIVObj.cy.startBatch();
            AIVObj.cy.$('node[!searchGeneData][id ^= "Protein"]').toggleClass('filteredChildNodes');
            AIVObj.cy.$('node[id ^= "Effector"]').toggleClass('filteredChildNodes');
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
        edges.connectedNodes('node[!searchGeneData][id ^="Protein"]').forEach(function(ele){
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
            // below logic is for cleaner UI to disable filters when switch is off
            if (event.target.checked){
                document.getElementById('EPPICorrThreshold').removeAttribute("disabled");
                document.getElementById('overSelect').classList.remove('not-allowed');
                document.getElementById('pseudo-select').classList.remove('not-allowed');
                pearsonFilterEPPIonEles(AIVObj);
            }
            else {
                document.getElementById('EPPICorrThreshold').setAttribute("disabled", "");
                document.getElementById('overSelect').classList.add('not-allowed');
                document.getElementById('pseudo-select').classList.add('not-allowed');

                // below logic will recheck every checkbox in the reference box
                let uncheckedBoxes = document.querySelectorAll('input:not(:checked).ref-checkbox');
                [].forEach.call(uncheckedBoxes, function(node) { //nodelist hack for unsupported browsers
                    node.click(); //recheck
                });
            }
        });
    }

    /**
     * @function filterEdgesByRefFunctionality - add switch/checkbox functionality to filter EPPIs...
     * If you are confused about the logic go to function desc in pearsonFilterEPPIonEles
     * @param {object} AIVObj - reference to the AIV namespace object
     */
    function filterEdgesByRefFunctionality(AIVObj){
        document.getElementById('ref-checkboxes').addEventListener('change', function(e){
            AIVObj.cy.$('.filterByReference').removeClass('filterByReference');
            let uncheckedBoxes = document.querySelectorAll('input:not(:checked).ref-checkbox');

            [].forEach.call(uncheckedBoxes, function(node){ //nodelist hack for unsupported browsers
                console.log(node.value);
                // get PPIs with the value in the dropdown menu and hide any nodes if the edges fit the filter
                let selector = `edge[reference = '${node.value}']`;
                let edges = AIVObj.cy.$(selector);
                edges.connectedNodes('node[!searchGeneData][id ^="Protein"], node[!searchGeneData][id ^="Effector"]').forEach(function(ele){
                    if (ele.connectedEdges(selector).size() === ele.degree()) {
                        ele.addClass('filterByReference');
                        console.log("HIDDEN!");
                    }
                });
                edges.addClass('filterByReference'); // hide the edge now
            });

        });
    }

    /**
     * @function showReferenceChkboxes - add event listener to a pseudo element (an anchor for relative positioning) to show the 'hidden checkboxes'
     */
    function showReferenceChkboxes() {
        let expanded = false;
        let checkboxes = $("#ref-checkboxes");
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
        edges.connectedNodes('node[!searchGeneData][id ^="Protein"]').forEach(function(ele){
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
        document.getElementById('hideMapMan').addEventListener('change', function(event){
            AIVObj.hideMapMan(event.target.checked);
        });
    }

    /**
     * @function hideUnhideDonuts - event listener binding function for hiding pie chart donuts
     * @param {object} AIVObj - reference to the AIV namespace object
     */
    function hideUnhideDonuts(AIVObj) {
        document.getElementById('hideDonut').addEventListener('change', function(event){
            AIVObj.hideDonuts(event.target.checked);
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
        let nodeListCheckboxes = document.querySelectorAll('input:checked.filter-switch'); // NodeList of checked UI checkboxes (not form checkboxes)
        if (nodeListCheckboxes.length > 0) { //reset UI checkboxes
            [].forEach.call(nodeListCheckboxes, function(node){ //nodeList forEach hack (some browsers don't support NodeList.forEach
                node.click(); // turn off checkbox, setting .checked DOES not fire events!
            });
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
            if (AIVObj.SUBA4LoadState && !AIVObj.coseParentNodesOnCyCore) { //only run if SUBA4 data loaded and if parent nodes are not already added
                AIVObj.addLocalizationCompoundNodes();
                AIVObj.removeAndAddNodesForCompoundNodes();
            }
            AIVObj.cy.layout(AIVObj.getCyCOSEBilkentLayout()).run();
        });
    }

    /**
     * @function resetEventListener - zoom in e listener
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
     * @function resetEventListener - reset zoom and pan
     * @param {object} AIVObj - reference to global namespace AIV object, with access to cytoscape methods
     */
    function resetEventListener(AIVObj){
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
    }

})(window, jQuery, cytoscape);