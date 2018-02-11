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
        setPNGExport(AIVref);
        setJSONexport(AIVref);
        filterNonQueryGenes(AIVref);
        restrictUIInputsNumRange();
        filterExperimentalPPIsSwitch(AIVref);
        filterExperimentalPPIsInputEListener(AIVref);
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
            addResetEListener();
            $('#genes').val("AT2G34970\nAT1G04880\nAT1G25420\nAT5G43700");
            document.getElementById('queryBAR').click();
            document.getElementById('predSUBA').click();
        });
    }

    /** @function addResetEListener - reset form*/
    function addResetEListener(){
        document.getElementById('resetForm').addEventListener('click', function() {
            let nodeListCheckboxes = document.querySelectorAll('input:checked.form-chkbox'); // NodeList of checked form checkboxes
            if (nodeListCheckboxes.length > 0) { //reset form checkboxes
                [].forEach.call(nodeListCheckboxes, function(node){ //nodeList forEach hack (some browsers don't support NodeList.forEach
                    node.click(); // turn off checkbox, setting .checked DOES not fire events!
                });
            }
            $('#genes').val('');
        });
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

    /** @function checkBIOGRIDServerStatus - Check BIOGRID webservice status*/
    function checkBIOGRIDServerStatus(){
        $.ajax({
            url: "https://cors-anywhere.herokuapp.com/www.ebi.ac.uk/Tools/webservices/psicquic/intact/webservices/current/search/query/species:human?firstResult=0&maxResults=1", //TODO: change to our proxy
            type: "GET"
        })
            .then(()=>{
                document.getElementById("spinnerBioGrid").style.display = 'none';
                $("<img src='images/activeServer.png'/>").insertAfter("#BioGridSpan");
                document.getElementById("queryBioGrid").parentNode.classList.remove('can-be-disabled');
                document.getElementById("queryBioGrid").disabled = false;
            })
            .catch(()=>{
                document.getElementById("spinnerBioGrid").style.display = 'none';
                $("<img src='images/inactiveServer.png'/>").insertAfter("#BioGridSpan");
            });
    }

    /** @function checkServerStatus - Check PSICQUIC INTACT status*/
    function checkINTACTServerStatus(){
        $.ajax({
            url: "https://cors-anywhere.herokuapp.com/tyersrest.tyerslab.com:8805/psicquic/webservices/current/search/interactor/arf7", //TODO: change to our proxy
            type: "GET"
        })
            .then(()=>{
                document.getElementById("spinnerIntAct").style.display = 'none';
                $("<img src='images/activeServer.png'/>").insertAfter("#IntActSpan");
                document.getElementById("queryIntAct").parentNode.classList.remove('can-be-disabled');
                document.getElementById("queryIntAct").disabled = false;
            })
            .catch(()=>{
                document.getElementById("spinnerIntAct").style.display = 'none';
                $("<img src='images/inactiveServer.png'/>").insertAfter("#IntActSpan");
            });
    }

    /** @function enableInteractionsCheckbox - make recursive checkbox only work when BAR PPI is selected */
    function enableInteractionsCheckbox(){
        let barPPICheckbox = document.getElementById('queryBAR');
        barPPICheckbox.addEventListener('change', function(){
            var recursiveCheckbox = document.getElementById("recursive");
            if (barPPICheckbox.checked) {
                recursiveCheckbox.disabled = false;
                recursiveCheckbox.parentNode.classList.remove('can-be-disabled');
            }
            else {
                recursiveCheckbox.parentNode.classList.add('can-be-disabled');
                recursiveCheckbox.disabled = true;
                recursiveCheckbox.checked = false;
            }
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
        document.getElementById('filterCheckbox').addEventListener('change', function(event){
            AIVObj.cy.$('node[!searchGeneData][id ^= "Protein"]').toggleClass('filteredChildNodes');
            AIVObj.cy.$('node[id ^= "Effector"]').toggleClass('filteredChildNodes');
        });
    }

    /**
     * @function pearsonFilterEPPIonEles - Take filter value and use it to find edges with R more than that
     * value. Then find those nodes that connect to such edges. Within these nodes, filter again by comparing
     * how many total edges(degree) it has to how many edges connected to it fit the filter. If they're equal
     * hide the node. This later logic is useful for when we having interactions between interactions.
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
            if (event.target.checked){
                document.getElementById('EPPICorrThreshold').removeAttribute("disabled");
                pearsonFilterEPPIonEles(AIVObj);
            }
            else {
                document.getElementById('EPPICorrThreshold').setAttribute("disabled", "");
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
                target: $('#copy-to-clipboard')
            }
        });
    }

})(window, jQuery, cytoscape);