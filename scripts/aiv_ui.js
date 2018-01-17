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
        checkINTACTServerStatus();
        checkBIOGRIDServerStatus();
        enableInteractionsCheckbox();
        setPNGExport(AIVref);
        setJSONexport(AIVref);
        filterSwitchFunctionality(AIVref);
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
            AIVObj.cy.$('.childGene').toggleClass('filteredChildNodes');
        });
    }


})(window, jQuery, cytoscape);