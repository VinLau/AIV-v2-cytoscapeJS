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
        checkINTACTServerStatus();
        checkBIOGRIDServerStatus();
        enableInteractionsCheckbox();
        setPNGExport(AIVref);
        setJSONexport(AIVref);
        filterSwitchFunctionality(AIVref);
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
    }

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
                var tempInput = document.createElement('textarea');
                tempInput.value = JSONStringified;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand("Copy");
                tempInput.style.display = 'none';
            });
        });
    }

    /**
     * @function filterSwitchFunctionality - add event listener to checkbox to visually filter out non-form gene nodes and edges
     * @param {object} AIVObj - reference to the AIV namespace object
     */
    function filterSwitchFunctionality(AIVObj) {
        document.getElementById('filterCheckbox').addEventListener('change', function(event){
            AIVObj.cy.$('node[!searchGeneData][id ^= "Protein"]').toggleClass('filteredChildNodes');
        });
    }

    function localizationLayoutEventListener(AIVObj) {
        document.getElementById('localizationLayout').addEventListener('click', function(event){
            $('#cerebralBackground').remove(); //remove the canvas underlay from localization layout
            AIVObj.removeLocalizationCompoundNodes();
            AIVObj.cy.reset();
            AIVObj.cy.layout(AIVObj.getCyCerebralLayout()).run();
        });
    }

    function spreadLayoutEventListener(AIVObj) {
        document.getElementById('spreadLayout').addEventListener('click', function(event){
            $('#cerebralBackground').remove(); //remove the canvas underlay from localization layout
            AIVObj.removeLocalizationCompoundNodes();
            AIVObj.cy.layout(AIVObj.getCySpreadLayout()).run();
        });
    }

    function coseCompoundLayoutEventListener(AIVObj) {
        document.getElementById('coseCompoundLayout').addEventListener('click', function(event){
            $('#cerebralBackground').remove(); //remove the canvas underlay from localization layout
            if (AIVObj.SUBA4LoadState && !AIVObj.coseParentNodesOnCyCore) { //only run if SUBA4 data loaded and if parent nodes are not already added
                AIVObj.addLocalizationCompoundNodes();
                AIVObj.removeAndAddNodesForCompoundNodes();
            }
            AIVObj.cy.layout(AIVObj.getCyCOSEBilkentLayout()).run();
        });
    }

    function zoomInEventListener(AIVObj){
        document.getElementById('zoomIn').addEventListener('click', function(event){
            AIVObj.cy.zoom({
                level: AIVObj.cy.zoom()*2,
                renderedPosition: { x: AIVObj.cy.height()/2, y: AIVObj.cy.width()/2},
            });
        });
    }

    function zoomOutEventListener(AIVObj){
        document.getElementById('zoomOut').addEventListener('click', function(event){
            AIVObj.cy.zoom({
                level: AIVObj.cy.zoom()*0.5,
                renderedPosition: { x: AIVObj.cy.height()/2, y: AIVObj.cy.width()/2},
            });
        });
    }

    function resetEventListener(AIVObj){
        document.getElementById('zoomReset').addEventListener('click', function(event){
            AIVObj.cy.zoom(AIVObj.defaultZoom);
            AIVObj.cy.pan(AIVObj.defaultPan);
        });
    }

    function panLeft(AIVObj){
        document.getElementById('panLeft').addEventListener('click', function(){
            AIVObj.cy.panBy({ x: -100, y: 0});
        });
    }

    function panRight(AIVObj){
        document.getElementById('panRight').addEventListener('click', function(){
            AIVObj.cy.panBy({ x: 100, y: 0});
        });
    }

    function panUp(AIVObj){
        document.getElementById('panUp').addEventListener('click', function(){
            AIVObj.cy.panBy({ x: 0, y: 100});
        });
    }

    function panDown(AIVObj){
        document.getElementById('panDown').addEventListener('click', function(){
            AIVObj.cy.panBy({ x: 0, y: -100});
        });
    }

})(window, jQuery, cytoscape);