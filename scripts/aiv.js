/**
 * @fileOverview AIV2, Arabidopsis Interactions Viewer Two. Main JS file that powers the front-end of AIV 2.0. Shows PPIs and PDIs and additional API data for a given gene(s).
 * @version 2.0, Jul2018
 * @author Vincent Lau (major additions, AJAX, polishing, CSS, SVGs, UX/UI, filters, exports, tables, tooltips) <vincente.lau@mail.utoronto.ca>
 * @author Asher Pasha (prototype base app, some logic of adding nodes & edges)
 * @copyright see MIT license on GitHub
 * @description please note that I seldom intentionally used data properties to nodes instead of classes as we cannot ( to my knowledge), select nodes by NOT having a class
 */
(function(window, $, _, cytoscape, alertify, undefined) {
    'use strict';

    /** @namespace {object} AIV */
    var AIV = {};

    /**
     * @namespace {object} AIV - Important hash tables to store state data and styling global data
     * @property {object} chromosomesAdded - Object property for 'state' of how many PDI chromosomes exist
     * @property {boolean} mapManLoadState - Boolean property representing if mapMan AJAX call was successful
     * @property {boolean} SUBA4LoadState - Boolean property representing if SUBA4 AJAX call was successful
     * @property {object} exprLoadState - State of the expression values the user has loaded for the current query genes
     * @property {number} nodeSize - "Global" default data such as default node size
     * @property {number} DNANodeSize - Important for adjusting the donut sizes
     * @property {number} searchNodeSize - Size for search genes
     * @property {string} nodeDefaultColor - hexcode for regular nodes by default (no expression data)
     * @property {string} searchNodeColor - hexcode for search genes background
     * @propery {object} locColorAssignments - the corresponding hexcodes for the localizations in the object keys
     * @property {Array.<string>} locCompoundNodes - this node will hopefully be filled with the parent nodes for localizations that exist on the app currently
     * @propery {boolean} coseParentNodesOnCyCore - state variable that stores whether compound nodes have been loaded onto the cy core app
     * @property {number} defaultZoom - contains a number for how much graph has been zoomed (after a layout has been ran)
     * @property {object} defaultPan - contains x and y properties for where the graph has been panned, useful for layouts
     * @property {object} miFilter - a list of unuseful mi terms that ideally would be filled out if a PPI/PDI does not have another meaningful name
     * @property {object} miTerms - a dictionary of frequently occuring (needs to be curated manually as EMBL doesn't have an API) MI terms that come from our dapseq ppi webservice
     * @property {object} mapManDefinitions - a dictionary of of MapMan terms (first number/hierarchical category)
     * @property {object} mapManOnDom - state variable dictionary that stores which MapMan BINs are in the app; used for when adding to the dropdown
     */
    AIV.chromosomesAdded = {};
    AIV.mapManLoadState = false;
    AIV.SUBA4LoadState = false;
    AIV.exprLoadState = {absolute: false, relative: false};
    AIV.nodeSize = 35;
    AIV.DNANodeSize = 55;
    AIV.searchNodeSize = 65;
    AIV.nodeDefaultColor = '#cdcdcd';
    AIV.searchNodeColor = '#ffffff';
    AIV.locColorAssignments = {
        cytoskeleton : "#572d21",
        cytosol      : "#e0498a",
        "endoplasmic reticulum" : "#d1111b",
        extracellular: "#ffd672",
        golgi        : "#a5a417",
        mitochondrion: "#41abf9",
        nucleus      : "#0032ff",
        peroxisome   : "#650065",
        "plasma membrane" : "#edaa27",
        plastid      : "#13971e",
        vacuole      : "#ecea3a",
    };
    AIV.locCompoundNodes = [];
    AIV.coseParentNodesOnCyCore  = false;
    AIV.defaultZoom = 1;
    AIV.defaultPan = {x: 0, y:0};
    AIV.miFilter =["0469" , "0463", "0467", "0190", "1014", "0915", "0914", "0407", "0686", "0045", "0462"];
    AIV.miTerms =
    {
        "0004" : "affinity chromotography technology",
        "0007" : "anti tag co-immunoprecipitation",
        "0018" : "two hybrid",
        "0019" : "coimmunoprecipitation",
        "0030" : "cross-linking study",
        "0045" : "experimental interaction detection",
        "0047" : "far western blotting",
        "0055" : "fluorescent resonance energy transfer",
        "0064" : "interologs mapping",
        "0065" : "isothermal titration calorimetry",
        "0067" : "tandem affinity purification",
        "0071" : "molecular sieving",
        "0084" : "phage display",
        "0085" : "phylogenetic profile",
        "0096" : "pull down",
        "0112" : "ubiquitin reconstruction",
        "0190" : "reactome",
        "0217" : "phosphorylation reaction",
        "0364" : "inferred by curator",
        "0397" : "two hybrid array",
        "0407" : "direct interaction",
        "432"  : "one hybrid", // error in the database, not a 4 digit num
        "0432" : "one hybrid",
        "0437" : "protein three hybrid",
        "0462" : "bind",
        "0463" : "biogrid",
        "0467" : "reactome",
        "0469" : "intact",
        "0686" : "unspecified method",
        "0809" : "bimolecular fluorescence complementation",
        "0914" : "association",
        "0915" : "physical association",
        "1014" : "string",
        "1178" : "sequence based prediction of binding of transcription factor to transcribed gene regulatory elements",
        "2189" : "avexis"
    };
    AIV.mapManDefinitions =
    {
        "0" : "Control",
        "1" : "PS",
        "2" : "Major CHO metabolism",
        "3" : "Minor CHO metabolism",
        "4" : "Glycolysis",
        "5" : "Fermentation",
        "6" : "Gluconeogensis",
        "7" : "OPP",
        "8" : "TCA/org. transformation",
        "9" : "Mitochondrial electron transport",
        "10": "Cell wall",
        "11": "Lipid Metabolism",
        "12": "N-metabolism",
        "13": "Amino acid metabolism",
        "14": "S-assimilation",
        "15": "Metal handling",
        "16": "Secondary metabolism",
        "17": "Hormone metabolism",
        "18": "Co-factor and vitamin metabolism",
        "19": "Tetrapyrrole synthesis",
        "20": "Stress",
        "21": "Redox",
        "22": "Polyamine metabolism",
        "23": "Nucleotide metabolsim",
        "24": "Biodegradation of xenobiotics",
        "25": "C1-metabolism",
        "26": "Misc.",
        "27": "RNA",
        "28": "DNA",
        "29": "Protein",
        "30": "Signalling",
        "31": "Cell",
        "32": "Micro RNA, natural antisense etc.",
        "33": "Development",
        "34": "Transport",
        "35": "Not assigned",
        "991": "Mineral nutrition"
    };
    AIV.mapManOnDom = {};

    /**
     * @namespace {object} AIV
     * @function initialize - Call bindUIEvents as the DOM has been prepared and add namespace variable
     */
    AIV.initialize = function() {
        // Set AIV namespace in window
        window.aivNamespace = {};
        window.aivNamespace.AIV = AIV;
        // Bind User events
        this.bindSubmit();
    };

    /**
     * @namespace {object} AIV
     * @function bindSubmit - Add functionality to buttons when DOM is loaded
     */
    AIV.bindSubmit = function() {
        // Submit button
        $('#submit').click(function(e) {
            // Stop system submit, unless needed later on
            e.preventDefault();

            // Get the list of genes
            let genes = $.trim($('#genes').val());
            let geneArr = genes.split('\n');
            let effectorArr = [...document.getElementById('effectorSelect').options].map(option => option.value);

            for (let i = 0; i < geneArr.length; i++) { // gene form input verification
                if(!geneArr[i].match(/^AT[1-5MC]G\d{5}$/i) && effectorArr.indexOf(geneArr[i]) === -1){
                    document.getElementById('errorModalBodyMsg').innerText = "Please check form value before adding effectors/submission! Genes should be delimited by newlines and follow the AGI format.";
                    $('#formErrorModal').modal('show');
                    throw new Error('wrong submission');
                }
            }

            genes = AIV.formatAGI(genes); //Format to keep "At3g10000" format when identifying unique nodes, i.e. don't mixup between AT3G10000 and At3g10000 and add a node twice

            if (genes !== '' && $('.form-chk-needed:checked').length > 0) {
                document.getElementById('loading').classList.remove('loaded'); //remove previous loading spinner
                let iconNode = document.createElement("i");
                iconNode.classList.add('fa');
                iconNode.classList.add('fa-spinner');
                iconNode.classList.add('fa-spin');
                document.getElementById('loading').appendChild(iconNode); // add loading spinner

                $('#formModal').modal('hide'); // hide modal

                AIV.genesList = geneArr;

                // Clear existing data
                AIV.resetUI();
                if (typeof AIV.cy !== 'undefined') {
                    AIV.cy.destroy(); //destroy cytoscape app instance
                    AIV.cy.contextMenus('get').destroy(); // delete bound right-click menus
                    AIV.resetState();
                }
                // cy.destroy() removes all child nodes in the #cy div, unfortunately we need one for the expr gradient, so reinstate it manually
                $('#cy').append('<canvas id="exprGradientCanvas" width="70" height="300"></canvas>');
                AIV.initializeCy(false);

                AIV.loadData();
            }
            else if ($('.form-chk-needed:checked').length <= 0) {
                document.getElementById('errorModalBodyMsg').innerText = "Please check a protein database!"
                $('#formErrorModal').modal('show');
                throw new Error('wrong submission');
            }
        });

    };

    /**
     * @namespace {object} AIV
     * @function resetState - Reset existing built-in state data from previous query
     */
    AIV.resetState = function() {
        this.chromosomesAdded = {};
        this.mapManLoadState = false;
        this.SUBA4LoadState = false;
        this.exprLoadState = {absolute: false, relative: false};
        this.coseParentNodesOnCyCore = false;
        this.locCompoundNodes = [];
        this.mapManOnDom = {};
        // clear memoized memory
        AIV.memoizedSanRefIDs.cache = new _.memoize.Cache;
        AIV.memoizedRetRefLink.cache = new _.memoize.Cache;
        AIV.memoizedPDITable.cache = new _.memoize.Cache;
    };

    /**
     * @namespace {object} AIV
     * @function resetUI - Reset UI features that are run once a query was executed
     */
    AIV.resetUI = function() {
        // reset the buttons
        $('.submit-reset').prop('checked', false);
        $(".fa-eye-slash").toggleClass('fa-eye fa-eye-slash');
        // Remove prior mapman definitions for that app state
        $('#bootstrapDropDownMM').empty();

        //remove existing interactions table except headers
        $("#csvTable").find("tr:gt(0)").remove();
        $(".inf").remove();

        //reset the reference filters for the next query
        $("#refCheckboxes").empty();
    };

    /**
     * @namespace {object} AIV
     * @function formatAGI - helper function that takes in a capitalized AGI into the one we use i.e. AT3G10000 to At3g10000
     * @param {string} AGI
     * @returns {string} - formmated AGI, i.e. At3g10000
     */
    AIV.formatAGI = function (AGI){
        AGI = AGI.replace(/T/g,'t');
        AGI = AGI.replace(/G/g, 'g');
        AGI = AGI.replace(/a/g, 'A');
        return AGI;
    };

    /**
     * @namespace {object} AIV
     * @function getCySpreadLayout - Returns spread layout for Cytoscape
     */
    AIV.getCySpreadLayout = function() {
        let layout = {};
        layout.name = 'cose';
        layout.nodeDimensionsIncludeLabels = true;
        // layout.padding = 1;
        if (AIV.cy.nodes().length > 750 && document.getElementById('circleLyChkbox').checked){
            layout.name = 'circle';
        }
        else if (AIV.cy.nodes().length < 375){
            layout.boundingBox = {x1:0 , y1:0, w:this.cy.width(), h: (this.cy.height() - this.DNANodeSize) }; //set boundaries to allow for clearer PDIs (DNA nodes are locked to start at x:50,y:0)
        }
        layout.stop = function(){ //this callback gets ran when layout is finished
            AIV.defaultZoom = AIV.cy.zoom();
            AIV.defaultPan = Object.assign({}, AIV.cy.pan()); //make a copy instead of takign reference
        };
        return layout;
    };

    /**
     * @namespace {object} AIV
     * @function getCyCOSEBilkentLayout - Returns layout for Cytoscape
     */
    AIV.getCyCOSEBilkentLayout = function(){
        let layout = {};
        layout.name = 'cose-bilkent';
        layout.padding = 5;
        layout.animate = 'end';
        layout.fit = true;
        layout.stop = function(){ //this callback gets ran when layout is finished
            AIV.defaultZoom = AIV.cy.zoom();
            AIV.defaultPan = Object.assign({}, AIV.cy.pan()); //make a copy instead of takign reference
            AIV.cy.style() // see removeAndAddNodesForCompoundNodes for rationale of re-updating stylesheet
                .selector('.filterByReference').style({'display': 'none'})
                .selector('.pearsonfilterEPPI').style({'display': 'none'})
                .selector('.pearsonAndInterologfilterPPPI').style({'display': 'none'})
                .update();
        };
        return layout;
    };

    /**
     * @namespace {object} AIV
     * @function getCyCerebralLayout - Returns layout for Cytoscape
     */
    AIV.getCyCerebralLayout = function (){
        AIV.defaultZoom = 1; // reset zoom
        AIV.defaultPan = {x: 0, y:0}; // reset pan
        return window.cerebralNamespace.options;
    };

    /**
     * @namespace {object} AIV
     * @function getCyStyle - Returns initial stylesheet of Cytoscape
     */
    AIV.getCyStyle = function() {
        return (
            cytoscape.stylesheet()
            .selector('node')
                .style({
                    'label': 'data(name)', //'label' is alias for 'content'
                    'font-size': 10,
                    'min-zoomed-font-size': 8,
                    'background-color': this.nodeDefaultColor,
                    "text-wrap": "wrap", //mulitline support
                    'height': this.nodeSize,
                    'width': this.nodeSize,
                    'border-style' : 'solid',
                    'border-width' : '1px',
                    'border-color' : '#979797'
                })
            .selector('node[?queryGene]') //If same properties as above, override them with these values for search genes
                .style({
                    'font-size': 14,
                    'min-zoomed-font-size': 0.00000000001,
                    'z-index': 100,
                    'height' : this.searchNodeSize,
                    'width'  : this.searchNodeSize,
                    'background-color': this.searchNodeColor,
                })
            .selector('.filteredChildNodes') //add/(remove) this class to nodes to (un)filter display
                .style({
                    'display' : 'none',
                })
            .selector('.hideMapManNodes') //add/(remove) this class to nodes to (un)display MapMan nodes with a specific MapMan number
                .style({
                    'display' : 'none',
                })
            .selector('.pearsonfilterEPPI') //to hide/unhide experimentally determined elements
                .style({
                    'display' : 'none',
                })
            .selector('.filterByReference') //to hide/unhide published elements via reference
                .style({
                    'display' : 'none',
                })
            .selector('.pearsonAndInterologfilterPPPI') //to hide/unhide predicted determined elements
                .style({
                    'display' : 'none',
                })
            .selector('.DNAfilter') // hide chromosomes
                .style({
                    'display' : 'none',
                })
            .selector('edge')
                .style({
                    'haystack-radius': 0,
                    'width': '11', // default, should be only for published interactions
                    'opacity': 0.666,
                    'line-style': 'dashed',
                })
            .selector('node[id ^= "DNA"]')
                .style({
                    'background-color': '#D3D3D3',
                    'font-size': '1.1em',
                    'min-zoomed-font-size': 0.00000000001,
                    "text-valign": "center",
                    "text-halign": "center",
                    "border-style": "solid",
                    "border-color": "#000000",
                    "border-width": "5px",
                    'shape': 'square',
                    'z-index': 101,
                    'height': this.DNANodeSize,
                    'width': this.DNANodeSize,
                })
            .selector('node[id ^= "Effector"]')
                .style({
                    'shape': 'hexagon',
                    'background-color': '#00FF00'
                })
            .selector('[?compoundNode]') //select for ALL compound nodes
                .style({
                    'shape': 'roundrectangle',
                    'font-size' : 18,
                    'font-family' : "Verdana, Geneva, sans-serif",
                })
            .selector('#cytoskeleton') //for compound nodes
                .style({
                    'background-color': '#e8e5e5',
                })
            .selector('#cytosol') //for compound nodes
                .style({
                    'background-color': '#ffe7ff',
                })
            .selector('[id="endoplasmic reticulum"]') //for compound nodes
                .style({
                    'background-color': '#ff8690',
                })
            .selector('#extracellular') //for compound nodes
                .style({
                    'background-color': '#ffffdb',
                })
            .selector('#golgi') //for compound nodes
                .style({
                    'background-color': '#ffff8f',
                })
            .selector('#mitochondrion') //for compound nodes
                .style({
                    'background-color': '#dfffff',
                })
            .selector('#nucleus') //for compound nodes
                .style({
                    'background-color': '#4f81ff',
                })
            .selector('#peroxisome') //for compound nodes
                .style({
                    'background-color': '#ce69ce',
                })
            .selector('[id="plasma membrane"]') //for compound nodes
                .style({
                    'background-color': '#ffd350',
                })
            .selector('#plastid') //for compound nodes
                .style({
                    'background-color': '#8bff96',
                })
            .selector('#vacuole') //for compound nodes
                .style({
                    'background-color': '#ffff70',
                })
            .selector('#unknown') //for compound nodes
                .style({
                    'background-color': '#fff',
                })
            .selector('.highlighted')
                .style({
                    'border-color' : '#979797',
                    'min-zoomed-font-size': 0.00000000001,
                    "text-background-opacity": 1,
                    "text-background-color": "yellow",
                    "text-background-shape": "roundrectangle",
                    "text-border-color": "#000",
                    "text-border-width": 1,
                    "text-border-opacity": 1,
                    "z-index": 102,
                    "font-size": 16
                })
            .selector('edge[target *= "Protein"]')
                .style({
                    'line-color' : '#acadb4'
                })
            .selector('edge[pearsonR > 0.5 ], edge[pearsonR < -0.5 ]')
                .style({
                    'line-color' : '#f5d363'
                })
            .selector('edge[pearsonR > 0.6 ], edge[pearsonR < -0.6 ]')
                .style({
                    'line-color' : '#ea801d'
                })
            .selector('edge[pearsonR > 0.7 ], edge[pearsonR < -0.7 ]')
                .style({
                    'line-color' : '#da4e2f'
                })
            .selector('edge[pearsonR > 0.8 ], edge[pearsonR < -0.8 ]')
                .style({
                    'line-color' : '#ac070e'
                })
            .selector('edge[?published]') // This is going to affect effectors too since they're all published
                .style({
                    'line-color' : '#99cc00',
                    'line-style' : 'solid'
                })
            .selector('edge[target *= "DNA"]')
                .style({
                    'line-color' : '#333435',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'unbundled-bezier',
                    'control-point-distances' : '50', // only for unbunlded-bezier edges (DNA edges)
                    'control-point-weights'   : '0.65',
                    'target-arrow-color' : '#333435',
                })
            .selector('edge[target *= "DNA"][interologConfidence = 0]') //i.e. published PDI
                .style({
                    'line-color' : '#557e00',
                    'target-arrow-color' : '#557e00',
                })
            .selector('edge[interologConfidence <= 2][interologConfidence > 0], edge[interologConfidence > -7203][interologConfidence <= -9605]')
                .style({
                    'width' : '1'
                })
            .selector('edge[interologConfidence > 2], edge[interologConfidence > -4802][interologConfidence <= -7203]')
                .style({
                    'width' : '3'
                })
            .selector('edge[interologConfidence > 5], edge[interologConfidence > -2401][interologConfidence <= -4802]')
                .style({
                    'width' : '5'
                })
            .selector('edge[interologConfidence > 10], edge[interologConfidence >= -1][interologConfidence <= -2401]')
                .style({
                    'width' : '7'
                })
        );
    };


    /**
     * @namespace {object} AIV
     * @function initializeCy - initialize Cytoscape with some default settings
     * @param {boolean} upload - boolean to determine how to initialize stylesheet based on if user is entering their own JSON
     */
    AIV.initializeCy = function(upload) {
        this.cy = cytoscape({
            container: document.getElementById('cy'),

            boxSelectionEnabled: false,

            autounselectify: true,

            style: upload ? [] : this.getCyStyle(),

            layout: {name: 'null'} //the init layout has 0 nodes so it doesn't matter what the layout is
        });
    };

    /**
     * @namespace {object} AIV
     * @function getWidth - Get PPI edge width based on interolog confidence
     * @description - not currently used, see stylesheet
     * @param {number} interolog_confidence - expects a interolog confidence value from the GET request
     */
    AIV.getWidth = function(interolog_confidence) {
        if (interolog_confidence > 10 || (interolog_confidence >= -1 && interolog_confidence <= -2401)){
            return '7';
        } else if (interolog_confidence > 5 || (interolog_confidence > -2401 && interolog_confidence <= -4802)) {
            return '5';
        } else if (interolog_confidence > 2 || (interolog_confidence > -4802 && interolog_confidence <= -7203)) {
            return '3';
        } else if (interolog_confidence <= 2 && interolog_confidence > 0 || (interolog_confidence > -7203 && interolog_confidence <= -9605)) {
            return '1';
        } else { //i.e. interlog confidence of '0',
            return '11';
        }
    };

    /**
     * @namespace {object} AIV
     * @function getEdgeColor - return the edge colour if the edge is a PDI/PPI, publish status and interolog confidence/correlation coefficient.
     * @description NOT USED CURRENTLY, chose to use cytoscape selectors instead
     * @param {number} correlation_coefficient
     * @param {boolean} published
     * @param {string} index
     * @param {number} interolog_confidence
     * @returns {string} - hexcode for color
     */
    AIV.getEdgeColor = function(correlation_coefficient, published, index, interolog_confidence) {
        correlation_coefficient = Math.abs(parseFloat(correlation_coefficient)); // Make the value positive
        if (index === '2') { //PDIs
            if (interolog_confidence === 0){
                return '#557e00'; // if e PDI, return dark green
            }
            else {
                return '#333435'; // if p PDI, return greyish
            }
        } else if (published) { //published PPIs but not published PDIs
            return '#99cc00';
        } else if (correlation_coefficient > 0.8) {
            return '#ac070e';
        } else if (correlation_coefficient > 0.7) {
            return '#da4e2f';
        } else if (correlation_coefficient > 0.6) {
            return '#ea801d';
        } else if (correlation_coefficient > 0.5) {
            return '#f5d363';
        } else {
            return '#acadb4';
        }
    };

    /**
     * @namespace {object} AIV
     * @function addNode - generic add nodes to cy core helper function
     * @param {string} node - as the name of the node, i.e. "At3g10000"
     * @param {string} type - as the type of node it is, i.e. "Protein"
     * @param {boolean} [searchGene=false] - optional parameter that signifies node is a search query gene, will be used directly as a true false value into the data properties of the node
     */
    AIV.addNode = function(node, type, searchGene = false) {
        let node_id = type + '_' + node;

        // Add the node
        this.cy.add([
            { group: "nodes", data: {id: node_id, name: node, queryGene : searchGene}} //nodes now have a property 'id' denoted as Protein_At5g20920 (if user inputed 'At5g20920' in the textarea)
        ]);
    };

    /**
     * @function addCompoundNode - generic function to add compound nodes to the cy core
     * @param idOfParent - id of compound node, 'id', example "nucleus"
     */
    AIV.addCompoundNode = function(idOfParent){
        AIV.cy.add({
            group: "nodes",
            data: {
                id : idOfParent,
                name: idOfParent,
                compoundNode: true, //data property used instead of a class because we cannot select nodes by NOT having a class
            },
        });
    };

    /**
     * @function addLocalizationCompoundNodes - specifically add compound nodes to cy core by going into our localization state variable
     */
    AIV.addLocalizationCompoundNodes = function(){
        for (let i = 0; i < this.locCompoundNodes.length; i++) {
            // console.log(this.locCompoundNodes[i]);
            this.addCompoundNode(this.locCompoundNodes[i]);
        }
        AIV.coseParentNodesOnCyCore = true; // we have added compound nodes, change the state variable
    };

    /**
     * @function removeLocalizationCompoundNodes - Remove compound nodes from cy core so we can make a nicer layout after the users clicks on cose-bilkent layout and then goes back to the spread layout for example.
     */
    AIV.removeLocalizationCompoundNodes = function(){
        if (!this.coseParentNodesOnCyCore){return} // exit if compound nodes not added yet
        this.cy.$('node[!compoundNode]').move({ parent : null }); //remove child nodes from parent nodes before removing parent nodes
        this.cy.$("node[?compoundNode]").remove();
        this.coseParentNodesOnCyCore = false;
    };

    /**
     * @function removeAndAddNodesForCompoundNodes - Unfortuantely cytoscapejs cannot add compound nodes on the fly so we have to remove old nodes and add them back on with a parent property, hence this function
     */
    AIV.removeAndAddNodesForCompoundNodes = function(){
        // console.log("removeAndAddNodesForCompoundNodes 1", this.cy.elements('node[ id ^= "Protein_"]').size());
        let oldEdges = this.cy.elements('edge');
        oldEdges.remove();
        let oldNodes = this.cy.elements('node[ id ^= "Protein_"], node[ id ^= "Effector_"]');
        oldNodes.remove();

        let newNodes = [];

        // the reasoning behind having this style being updated and then removed again in the layout.stop when the cose-bilkent layout is finished is because running the layout with hidden nodes does NOT manuever the nodes around nicely (i.e. they're all in one spot); this is a workaround
        this.cy.style()
            .selector('.filterByReference')
            .style({'display': 'element'})
            .selector('.pearsonfilterEPPI')
            .style({'display': 'element'})
            .selector('.pearsonAndInterologfilterPPPI')
            .style({'display': 'element'})
            .update(); // update the elements in the graph with the new style

        // console.log("removeAndAddNodesForCompoundNodes 2", oldNodes.size());
        oldNodes.forEach(function(oldNode){
            let newData = Object.assign({}, oldNode.data()); // let us make a copy of the previous object not directly mutate it. Hopefully the JS garbage collector will clear the memory "https://stackoverflow.com/questions/37352850/cytoscape-js-delete-node-from-memory"

            let filterClasses = "";
            if (oldNode.hasClass('filterByReference')){filterClasses += "filterByReference";}
            if (oldNode.hasClass('pearsonfilterEPPI')){filterClasses += " pearsonfilterEPPI ";}
            if (oldNode.hasClass('pearsonAndInterologfilterPPPI')){filterClasses += " pearsonAndInterologfilterPPPI";}
            newData.parent = oldNode.data("localization");
            newNodes.push({
                group: "nodes",
                data: newData,
                classes: filterClasses,
            });
        });

        this.cy.add(newNodes);
        oldEdges.restore();
    };

    /**
     * @namespace {object} AIV
     * @function addDNANodesToAIVObj - Take in an object (interaction) data and add it to the 'global' state
     * @param {object} DNAObjectData - as the interaction data as it comes in the GET request i.e.
     *                                 {source: .., target:.., index: 2, ..}
     */
    AIV.addDNANodesToAIVObj = function(DNAObjectData) {
        var chrNum = DNAObjectData.target.charAt(2).toUpperCase(); //if it was At2g04880 then it'd '2'
        var name = chrNum; // Just for 'm' and 'c'

        if (chrNum === "M") {
            name = "Mitochondria";
        }
        else if (chrNum === "C"){
            name = "Chloroplast";
        }

        // console.log("addDNANodes", DNAObjectData, "chrNum");
        if (AIV.chromosomesAdded.hasOwnProperty(chrNum)){
            AIV.chromosomesAdded[chrNum].push(DNAObjectData);
        }
        else { // Adding chromosome to DOM as it does not exist on app yet
            AIV.addChromosomeToCytoscape(DNAObjectData, chrNum, name);
            AIV.chromosomesAdded[chrNum] = [];
            AIV.chromosomesAdded[chrNum].push(DNAObjectData); /*NB: The DNA data edge is stored here in the AIV object property (for each chr) instead of storing it in the edges themselves*/
        }
    };

    /**
     * This will add the chromosome nodes (that represent 1+ gene in them) to the cy core
     *
     * @param {object} DNAObject - as the JSON data in object form i.e. {source: .., target:.., index: 2, ..}
     * @param {string} chrNumber - as the chromosomal number i.e. "2" or "M"
     * @param {string} chrName - as the name of the chromsome i.e. "2" or "Mitochondria"
     */
    AIV.addChromosomeToCytoscape = function(DNAObject, chrNumber, chrName) {
        this.cy.add(
            {
                group: "nodes",
                data:
                    {
                        id: "DNA_Chr" + chrNumber,
                        name: "Chr-" + chrName,
                        localization: "nucleus"
                    },
                classes: 'DNA'
            }
        );
    };

    /**
     * @namespace {object} AIV
     * @function addEdges - Add edges to the cy core, need many params here to determine the edgestyling via some of these params
     * @param {string} source - as the source protein i.e. "At2g34970"
     * @param {string} typeSource - as the type of protein it is, i.e. "effector" or "protein"
     * @param {string} target - as the target protein i.e. "At3g05230"
     * @param {string} typeTarget - as the type of protein it is, i.e. "effector" or "protein"
     * @param {string} reference - as (if it exists) a published string of the DOI or Pubmed, etc. i.e. " "doi:10.1038/msb.2011.66"" or "None"
     * @param {boolean} published - to whether this is published interaction data i.e. true
     * @param {number | string} interologConfidence  - interolog confidence number, can be negative to positive, or zero (means experimentally validated prediction) i.e. -2121
     * @param {string} databaseSource - where did this edge come from ? i.e. "BAR"
     * @param {number | string | null} R - the correlation coefficient of the coexpression data (microarray)
     * @param {string} miTermsString - string of miTerms, can be delimited by a '|'
     */
    AIV.addEdges = function(source, typeSource, target, typeTarget, reference, published, interologConfidence, databaseSource, R, miTermsString) {
        // let edge_id = typeSource + '_' + source + '_' + typeTarget + '_' + target;
        source = typeSource + '_' + source;
        target = typeTarget + '_' + target;
        let edge_id = source + '_' + target;
        // process and format mi terms, specifically, look up via dictionary the annotations
        let mi = [];
        // console.log(target);
        // console.log(miTermsString);
        // need to do a check for where the database came from as it is parsed differently and that INTACT/BIOGRID already come with MI term annotations
        if (miTermsString !== null && miTermsString !== undefined && databaseSource === "BAR"){
            let miArray = miTermsString.split('|');
            miArray.forEach(function(miTerm){
                if (AIV.miTerms[miTerm] !== undefined){
                    mi.push(`${miTerm} (${AIV.miTerms[miTerm]})`);
                }
            });
        }
        else if (databaseSource === "INTACT" || databaseSource === "BioGrid") {
            mi.push(miTermsString.replace('"', ' ')); // replace for " inside '0018"(two hybrid)'
        }
        this.cy.add([
            {
                group: "edges",
                data:
                {
                    id: edge_id,
                    source: source,
                    target: target,
                    published: published,
                    reference: published ? reference : false,
                    interologConfidence: interologConfidence,
                    pearsonR: R,
                    miAnnotated: mi,
                },
            }
        ]);
    };

    /**
     * @namespace {object} AIV
     * @function addNumberOfPDIsToNodeLabel - This function will take the name property of a DNA Chr node and parse it nicely for display on the cy core
     */
    AIV.addNumberOfPDIsToNodeLabel = function () {
        for (let chr of Object.keys(this.chromosomesAdded)) {
            let prevName = this.cy.getElementById(`DNA_Chr${chr}`).data('name');
            this.cy.getElementById(`DNA_Chr${chr}`)
                .data('name', `${prevName + "\n" + this.chromosomesAdded[chr].length + "\n"} PDIs`);
        }
    };

    /**
     * @namespace {object} AIV
     * @function setDNANodesPosition - Lock the position of the DNA nodes at the bottom of the cy app
     */
    AIV.setDNANodesPosition = function () {
        let xCoord = 50;
        let viewportWidth = this.cy.width();
        this.cy.$("node[id ^='DNA_Chr']:locked").unlock(); //if locked (for example during hide settings, unlock)
        let numOfChromosomes = Object.keys(this.chromosomesAdded).length; //for A. th. the max would be 7
        for (let chr of Object.keys(this.chromosomesAdded)) {
            let chrNode = this.cy.getElementById(`DNA_Chr${chr}`);
            chrNode.position({x: xCoord, y: this.cy.height() - (this.DNANodeSize/2 + 5) });
            chrNode.lock(); //hardset the position of chr nodes to bottom
            xCoord += viewportWidth/numOfChromosomes;
        }
    };

    /**
     * @namespace {object} AIV
     * @function resizeEListener - Resize UI listener when app is loaded, i.e. reposition the chr nodes if the browser size changes
     */
    AIV.resizeEListener = function () {
        this.cy.on('resize', this.setDNANodesPosition.bind(AIV));
    };

    /**
     * @namespace {object} AIV
     * @function createPDITable - We need to return a nicely formatted HTML table to be shown in the DNA tooltip. Take in an array of DNA interactions to be parsed and put appropriately in table tags
     * @param {Array.<Object>} arrayPDIdata - array of interaction data i.e. [ {source: .., target:.., index: 2, ..}, {}, {}]
     * @returns {string} - a nicely parsed HTML table
     */
    AIV.createPDItable = function (arrayPDIdata) {
        console.log(arrayPDIdata);
        let queryPDIsInChr = {};
        let targets = [];
        let pubmedRefHashTable = {};
        let pValueHashTable = {};
        let htmlTABLE = "<div class='pdi-table-scroll-pane'><table><tbody><tr><th></th>";
        arrayPDIdata.forEach(function(PDI){ //populate local data to be used in another loop
            // console.log("looping through each element of PDI array", PDI);
            if (!queryPDIsInChr.hasOwnProperty(PDI.source)) {
                queryPDIsInChr[PDI.source] = []; //create property with name of query/source gene
            }
            queryPDIsInChr[PDI.source].push(PDI.target);
            if (targets.indexOf(PDI.target) === -1) {//To not repeat PDI for two queries with same PDI
                targets.push(PDI.target);
            }
            pubmedRefHashTable[`${PDI.source}_${PDI.target}`] = PDI.reference;
            pValueHashTable[`${PDI.source}_${PDI.target}`] = PDI.interolog_confidence;
        });
        for (let protein of Object.keys(queryPDIsInChr)) { //add query proteins to the header of table
            htmlTABLE += `<th>${protein}<br>(${queryPDIsInChr[protein].length} PDIs)</th>`;
        }
        htmlTABLE += "</tr>";
        targets.forEach(function(targetDNAGene){ //process remaining rows for each target DNA gene
            htmlTABLE += `<tr><td>${targetDNAGene}</td>`;
            for (let queryGene of Object.keys(queryPDIsInChr)) { //recall the keys are the source (i.e. query genes)
                if (queryPDIsInChr[queryGene].indexOf(targetDNAGene) !== -1) { //indexOf returns -1 if not found
                    let cellContent = "<td>";
                    let fontawesome = '';
                    if (pValueHashTable[queryGene + '_' + targetDNAGene] === 0){ //i.e. experimental PDI
                       cellContent = "<td class='experimental-pdi-cell'>";
                       fontawesome = 'flask';
                    }
                    else if (pValueHashTable[queryGene + '_' + targetDNAGene] > 0){ // i.e. predicted PDI
                        cellContent = "<td class='predicted-pdi-cell'>";
                        fontawesome = 'terminal';
                    }
                    AIV.memoizedSanRefIDs(pubmedRefHashTable[queryGene + '_' + targetDNAGene]).forEach(function(ref){
                        cellContent += AIV.memoizedRetRefLink(ref, targetDNAGene).replace(/("_blank">).*/, "$1") + /* replace innerHTML text returned */
                            `<i class="fas fa-${fontawesome} fa-lg"></i>` +
                            '</a>';
                    });
                    htmlTABLE += cellContent + '</td>';
                }
                else {
                    htmlTABLE += '<td></td>';
                }
            }
            htmlTABLE += "</tr>";
        });
        htmlTABLE += "</tbody></table></div>";
        // console.log("finished createPDITable function execution", queryPDIsInChr);
        return htmlTABLE;
    };

    /**
     * @namespace {object} AIV
     * @function addChrNodeQTips -  Add qTips (tooltips) to 'Chromosome' Nodes
     * Note we have to run a for loop on this to check where to add the qTips.
     * Moreover the text is created from another function which will nicely return a HTML table
     */
    AIV.addChrNodeQtips = function () {
        let that = this;
        AIV.memoizedPDITable = _.memoize(this.createPDItable);
        for (let chr of Object.keys(this.chromosomesAdded)){
            // console.log(this.chromosomesAdded[chr], `chr${chr}`);
            this.cy.on('mouseover', `node[id^='DNA_Chr${chr}']`, function(event){
                var chrNode = event.target;
                chrNode.qtip(
                    {
                        content:
                            {
                                title :
                                    {
                                        text :`Chromosome ${chr}`,
                                        button: 'Close' //close button
                                    },
                                text: AIV.memoizedPDITable(that.chromosomesAdded[chr])
                            },
                        style    : { classes : 'qtip-light qtip-dna'},
                        show:
                            {
                                solo : true, //only one qTip at a time
                                event: `${event.type}`, // Same show event as triggered event handler
                                ready: true, // Show the tooltip immediately upon creation
                            },
                        hide : false // Don't hide on any event except close button
                    }
                );
            });
        }
    };

    /**
     * @namespace {object} AIV
     * @function - addProteinNodeQtips Add qTips (tooltips) to the protein nodes.
     *
     * Note the function definition as the text. This means that this function will be run when hovered
     * Namely we check the state of the AJAX call for that particular protein to decide whether to
     * make another AJAX call or to simply load the previously fetched data
     */
    AIV.addProteinNodeQtips = function() {
        this.cy.on('mouseover', 'node[id^="Protein"]', function(event) {
            let protein = event.target;
            let agiName = protein.data("name");
            let exprOverlayChkbox = document.getElementById('exprnOverlayChkbox');
            protein.qtip(
                {
                    overwrite: false, //make sure tooltip won't be overriden once created
                    content  : {
                                    title :
                                        {
                                            text : "Protein " + agiName,
                                            button: 'Close'
                                        },
                                    text :
                                        function(event, api) {
                                            let HTML = "";
                                            HTML += AIV.showDesc(protein);
                                            HTML += AIV.showSynonyms(protein);
                                            HTML += `<p>${AIV.showMapMan(protein)}</p>`;
                                            HTML += `<p>${AIV.displaySUBA4qTipData(protein)}</p>`;
                                            if (AIV.exprLoadState.absolute && exprOverlayChkbox.checked){
                                                HTML += `<p>Mean Expr: ${protein.data('absExpMn')}</p>
                                                         <p>SD Expr:   ${protein.data('absExpSd')}</p>`;
                                            }
                                            if (AIV.exprLoadState.relative && exprOverlayChkbox.checked){
                                                HTML += `<p>Log2 Expr: ${protein.data('relExpLog2')}</p>
                                                         <p>Fold Expr: ${protein.data('relExpFold')}</p>`;
                                            }
                                            return HTML;
                                        }
                                },
                    style    : { classes : 'qtip-light qtip-protein-node'},
                    show:
                        {
                            solo : true,
                            event: `${event.type}`, // Use the same show event as triggered event handler
                            ready: true, // Show the tooltip immediately upon creation
                            delay: 300 // Don't hammer the user with tooltips as s/he is scrollin over the graph
                        },
                    hide : false
                }
            );
        });
    };

    /**
     * @function parseProteinNodes - parse through every protein (non-effector) node that exists in the DOM and perform the callback function on each node
     * @param {function} cb -  callback function
     * @param {boolean} [needNodeRef=false] - optional boolean to determine if callback should be performed on node object reference
     */
    AIV.parseProteinNodes = function(cb, needNodeRef=false){
        this.cy.filter("node[id ^= 'Protein_At']").forEach(function(node){
            let nodeID = node.data('name');
            if (nodeID.match(/^AT[1-5MC]G\d{5}$/i)) { //only get AGI IDs, i.e. exclude effectors
                if (needNodeRef){
                    cb(node);
                }
                else{
                    cb(nodeID);
                }
            }
        });
    };

    /**
     * @function showALias - helper function to decide whether or not to show desc on protein qTip
     * @param {object} protein - reference to the particular protein which we are adding a qTip
     * @returns {string} - a nicely formmated HTML string
     */
    AIV.showDesc = function(protein) {
        let desc = protein.data('desc');
        if (!desc){ return ""; } //exit if undefined
        return `<p>Annotation: ${desc}</p>`;
    };

    /**
     * @function showSynonyms - helper function to decide whether or not to show alias on protein qTip
     * @param {object} protein - reference to the particular protein which we are adding a qTip
     * @returns {string} - a nicely formmated HTML string
     */
    AIV.showSynonyms = function(protein) {
        let syns = protein.data('synonyms');
        if (!syns){ return ""; } //exit if undefined
        return `<p>Synoynms: ${syns}</p> <hr>`;
    };

    /**
     * @function showMapMan - helper function to decide whether or not to show MapMan on protein qTip
     * @param {object} protein - reference to the particular protein which we are adding a qTip
     * @returns {string} - a nicely formmated HTML string of its mapman codes
     */
    AIV.showMapMan = function(protein) {
        let mapManNums = protein.data('numOfMapMans');
        if (!mapManNums){ return ""; } //exit if undefined
        let baseString = "";
        for (let i = 1; i < ( mapManNums + 1 ) ; i++) {
            baseString += `<p> MapMan Code ${i} : ` + protein.data('MapManCode' + i) + '</p>' + `<p> MapMan Annotation ${i} : ` + protein.data('MapManName' + i) + '</p>';
        }
        baseString += "<hr>";
        // console.log(baseString);
        return baseString;
    };

    /**
     * @function displaySUBA4qTipData - helper function to decide whether or not to show SUBA4 html table on protein qTip, if so it will add a data property to a node such that it will be ready for display via qTip
     * @param {object} protein - reference to the particular protein which we are adding a qTip
     * @returns {string} - a nicely formmated HTML string of a node's localizations in PCT form
     */
    AIV.displaySUBA4qTipData = function(protein) {
        let locData = protein.data('localizationData');
        if (!locData) {return "";} //exit if undefined
        let baseString = "";
        for (let i = 0; i < locData.length ;i++){
            let locPercent = Object.values(locData[i])[0];
            if (locPercent > 0) {
                baseString += `<p>${Object.keys(locData[i])[0]}: ${(locPercent*100).toFixed(1)}%</p>`;
            }
        }
        return baseString;
    };

    /**
     * @namespace {object} AIV
     * @function addEffectorNodeQtips - Add qTips (tooltips) to effector nodes, this should simply just show the name when hovered over
     */
    AIV.addEffectorNodeQtips = function() {
        this.cy.on('mouseover', 'node[id^="Effector"]', function(event) {
            var effector = event.target;
            effector.qtip(
                {
                    overwrite: false, //make sure tooltip won't be overriden once created
                    content  : {
                        title :
                            {
                                text : "Effector " + effector.data("name"),
                                button: 'Close'
                            },
                        text: " "
                    },
                    style    : { classes : 'qtip-light qtip-effector-node'},
                    show:
                        {
                            solo : true,
                            event: `${event.type}`, // Use the same show event as triggered event handler
                            ready: true, // Show the tooltip immediately upon creation
                        },
                    hide : false
                }
            );
        });
    };


    /**
     * @namespace {object} AIV
     * @function createPPIEdgeText - decides whether to show the docker link or not based on the interolog confidence (based on whether it is IFF the interolog confidence is negative). Then use the 3 params to create an external link elsewhere on the BAR.
     *
     * @param {string} source - as the source protein in ABI form i.e. "At3g10000"
     * @param {string} target - as the target protein in ABI form i.e. "At4g40000"
     * @param {string} reference - string of DOI or PMIDs, delimited by \n, i.e. "doi:10.1126/science.1203659 \ndoi:10.1126/science.1203877".. whatever came through the GET request via 'reference' prop
     * @param {number|string} interologConf - represents the interolog confidence value of the PPI, can be "NA" if the edge is from INTACT/BioGrid
     */
    AIV.createPPIEdgeText = (source, target, reference, interologConf) => {
        let modifyProString = string => string.replace(/PROTEIN_/gi, '').toUpperCase();

        var refLinks = "";
        if (reference) { //non-falsy value (we may have changed it to false in the addEdges() call)
            AIV.memoizedSanRefIDs( reference ).forEach(function(ref){
                refLinks += '<p> Ref: ' + AIV.memoizedRetRefLink(ref, target) + '</p>';
            });
        }

        if (interologConf >= 0 ) {
            return refLinks; //can be "" or have a bunch of links..., "NA" should return ""
        }
        else { //if interlog confidence is less than zero, show external docker link
            return "<p><a href='http://bar.utoronto.ca/protein_docker/?id1=" + modifyProString(source) + "&id2=" + modifyProString(target) + "' target='_blank'> " + "Predicted Structural Interaction " + "</a></p>" + refLinks;
        }
    };


    /**
     * @namespace {object} AIV
     * @function addPPIEdgeQtips - Add qTips (tooltips) to protein protein interaction edges, also adds qTips to protein-effector edges
     */
    AIV.addPPIEdgeQtips = function() {
        let that = this;
        this.cy.on('mouseover', 'edge[source^="Protein"][target^="Protein"], edge[source^="Protein"][target^="Effector"], edge[source^="Effector"][target^="Protein"]', function(event){
            let ppiEdge = event.target;
            let edgeData = ppiEdge.data();
            ppiEdge.qtip(
                {
                    content:
                        {
                            title:
                                {
                                    text: edgeData.source.replace("_", " ") + " to " + edgeData.target.replace("_", " "),
                                    button: "Close"
                                },
                            text : that.createPPIEdgeText( edgeData.source, edgeData.target, edgeData.reference, edgeData.interologConfidence ) +
                            (edgeData.interologConfidence >= 1 ? `<p>Interolog Confidence: ${edgeData.interologConfidence}</p>` : "") + //ternary operator return the interolog confidence value only not the SPPI rank
                            `<p>Correlation Coefficient: ${edgeData.pearsonR} </p>` +
                            (edgeData.miAnnotated.length > 0 ? `<p>MI Term(s): ${edgeData.miAnnotated.join(', ')} </p>` : ""),
                        },
                    style  : { classes : 'qtip-light qtip-ppi-edge' },
                    show:
                        {
                            solo : true,
                            event: `${event.type}`, // Use the same show event as triggered event handler
                            delay: 500
                        },
                    hide : false
                }
            );
        });
    };

    /**
     * @namespace {object} AIV
     * @function sanitizeReferenceIDs - Process the pubmed IDs and DOIs that come in from the interactions request. This will return an array of links (as strings). We have to check for empty strings before returning.
     *
     * @param {string} JSONReferenceString - as a string of links delimited by newlines "\n"
     */
    AIV.sanitizeReferenceIDs = function(JSONReferenceString) {
        let returnArray = JSONReferenceString.split("\n");
        returnArray = returnArray.filter(item => item !== '');
        // console.log("sanitized ,", returnArray);
        return returnArray;
    };

    /**
     * @namespace {object} AIV
     * @function memoizedSanRefIDs - memoized version of the sanitizeReferenceIDs pure function for performance
     * @param {Function} AIV.returnReferenceLink - sanitizeReferenceIDs function defintiion
     */
    AIV.memoizedSanRefIDs = _.memoize(AIV.sanitizeReferenceIDs);

    /**
     * @namespace {object} AIV
     * @function returnReferenceLink -
     * This function expects to receive a string which either 'references' a
     * 1) PubMedID (PubMed)
     * 2) MINDID (Membrane based Interacome Network) ** We use AGIIdentifier for this as MIND search query does not go by Id.. **
     * 3) AI-1 ID (Arabidopsis interactome project)
     * 4) DOI reference hotlink
     * 5) BioGrid interaction ID
     * 6) BINDID (Biomolecular Interaction Network Database, NOTE: Not live as of Nov 2017)
     * @param {string} referenceStr - as the link given to the function that could be any the of above or none
     * @param {string} AGIIdentifier - is used for the biodb link
     * @return {string} - a link from the above list
     */
    AIV.returnReferenceLink = function(referenceStr, AGIIdentifier) {
        let regexGroup; //this variable necessary to extract parts from the reference string param
        let db = referenceStr.match(/^([A-Z]+)-*/i)[1] + " - ";
        if ( (regexGroup = referenceStr.match(/PubMed[:]?(\d+)$/i)) ) { //assign and evaluate if true immediately
            return `<a href="https://www.ncbi.nlm.nih.gov/pubmed/${regexGroup[1]}" target="_blank"> ${db} PMID ${regexGroup[1]}</a>`;
        }
        else if ( (regexGroup = referenceStr.match(/Mind(\d+)$/i)) ){
            return `<a href="http://biodb.lumc.edu/mind/search_results.php?text=${AGIIdentifier}&SubmitForm=Search&start=0&count=25&search=all" target="_blank"> ${db} MIND ID ${regexGroup[1]}</a>`;
        }
        else if ( (regexGroup = referenceStr.match(/AI-1.*$/i)) ){
            return `<a href="http://interactome.dfci.harvard.edu/A_thaliana/index.php" target="_blank"> ${db} (A. th. Interactome) ${referenceStr} </a>`;
        }
        else if ( (regexGroup = referenceStr.match(/doi:(.*)/i)) ){
            return `<a href="http://dx.doi.org/${regexGroup[1]}" target="_blank"> ${db} DOI ${regexGroup[1]} </a>`;
        }
        else if ( (regexGroup = referenceStr.match(/biogrid:(.*)/i)) ){
            return `<a href="https://thebiogrid.org/interaction/${regexGroup[1]}" target="_blank"> ${db} BioGrid ${regexGroup[1]}</a>`;
        }
        else if ( (regexGroup = referenceStr.match(/(\d+)/)) ) { //for BIND database (now closed)
            return `<a href="https://academic.oup.com/nar/article/29/1/242/1116175" target="_blank"> ${db} BIND ID ${referenceStr}</a>`;
        }
    };

    /**
     * @namespace {object} AIV
     * @function memoizedRetRefLink - memoized version of the returnReferenceLink pure function for performance
     * @param {Function} AIV.returnReferenceLink - returnReferenceLink function defintiion
     */
    AIV.memoizedRetRefLink = _.memoize(AIV.returnReferenceLink);

    /**
     * @namespace {object} AIV
     * @function parseBARInteractionsData -
     * This function parses interactions for the BAR interactions API data, namely in these ways:
     * Create an outer for loop (run N times where N is the # of genes in the user form):
     * I  ) Assign dataSubset variable to be all the genes connected to a single form gene
     * II ) Then create an inner for loop to add the interacting nodes:
     * i  ) Add interactive node to the cy core.
     * ii ) Add the edges for all interactions
     * iia) Make sure not to double add edges and double add nodes
     * iib) Get the line styles, width and colours as well based on parameters such as correlation
     *      coefficient and interolog confidence that were returned in the request
     * iii) Filter based on the edges such to sort PDI and PPIs.
     * iv ) After all this is finished, we run a bunch of functions that add qTips and Styling
     * @param {object} data - response JSON we get from the get_interactions_dapseq PHP webservice at the BAR
     */
    AIV.parseBARInteractionsData = function(data) {
        let publicationsPPIArr = []; //local variable to store all unique publications that came from the JSON
        for (let geneQuery of Object.keys(data)) {

            let dataSubset = data[geneQuery]; //'[]' expression to access an object property

            // Add Nodes for each query
            for (let i = 0; i < dataSubset.length; i++) {
                let typeSource = '';
                let typeTarget = '';
                let width = '5'; // Default edge width
                let edgeData = dataSubset[i]; // Data from the PHP API comes in the form of an array of PPIs/PDIs hence this variable name
                let dbSrc = "BAR";

                let {index, source, target, reference, published, interolog_confidence, correlation_coefficient, mi} = edgeData;

                // Source, note that source is NEVER DNA
                if (source.match(/^AT[1-5MC]G\d{5}$/i)) {
                    typeSource = 'Protein';
                } else {
                    typeSource = 'Effector';
                }

                // Target
                if (target.match(/^AT[1-5MC]G\d{5}$/i)) {
                    if (index === '2') {
                        typeTarget = 'DNA';
                    } else {
                        typeTarget = 'Protein';
                    }
                } else {
                    typeTarget = 'Effector';
                }

                //Build publication array for dropdown later
                if (publicationsPPIArr.indexOf(reference) === -1){
                    if (typeTarget === 'Protein' || typeTarget === 'Effector'){
                        publicationsPPIArr.push(reference);
                    }
                }
                // reformat the reference string to have the database name preappended to it with '-', keep newline delimiter
                reference = reference.split('\n').map(x => dbSrc + "-" + x).join('\n');

                // Coerce scientific notation to fixed decimal point number
                interolog_confidence = scientificToDecimal(interolog_confidence);

                if (typeTarget === "Protein" || typeTarget === "Effector") {
                    if ( AIV.cy.getElementById(`${typeSource}_${source}`).empty()) { //only add source node if not already on app, recall our ids follow the format Protein_At2g10000
                        this.addNode(source, typeSource);
                    }
                    if ( AIV.cy.getElementById(`${typeTarget}_${target}`).empty()) {
                        this.addNode(target, typeTarget);
                    }
                } else { //i.e. typeTarget === "DNA"
                    this.addDNANodesToAIVObj(edgeData); //pass the DNA in the JSON format we GET on
                }

                if (index !== '2') { //i.e. PPI edge
                    let edgeSelector = `${typeSource}_${source}_${typeTarget}_${target}`;
                    if ( AIV.cy.$id(edgeSelector).empty() ) { //Check if edge already added from perhaps the PSICQUIC webservices
                        this.addEdges(source, typeSource, target, typeTarget, reference, published, interolog_confidence, dbSrc, correlation_coefficient, mi);
                    }
                    else { //PSICQUIC edges added first
                        if (mi !== null && mi !== undefined){
                            let tempMiArr = [];
                            let miArray = mi.split('|');
                            miArray.forEach(function(miTerm){
                                if (AIV.miTerms[miTerm] !== undefined){
                                    tempMiArr.push(`${miTerm} (${AIV.miTerms[miTerm]})`);
                                }
                            });
                            AIV.cy.$id(edgeSelector).data({'miAnnotated' : AIV.cy.$id(edgeSelector).data('miAnnotated').concat(tempMiArr)}); // append new miTerm to current arr
                        }
                        AIV.cy.$id(edgeSelector).data({
                            reference : reference,
                            interologConfidence : interolog_confidence,
                            pearsonR : correlation_coefficient,
                            published : true, // must be true if PSICQUIC edges loaded
                        });
                    }
                }
                else if ( index === '2') { // PDI edge
                    if (this.cy.getElementById(`${typeSource}_${source}_DNA_Chr${target.charAt(2)}`).length === 0){ // If we don't already have an edge from this gene to a chromosome
                        this.addEdges(source, typeSource, `Chr${target.charAt(2)}`, typeTarget /*DNA*/, reference, published, interolog_confidence, dbSrc, correlation_coefficient, mi);
                    }
                }
            }
        } //end of adding nodes and edges

        let filteredPubsArr = [].concat.apply([], publicationsPPIArr.map(function (innerArr) {
            return innerArr.split('\n').filter(function (item) {
                // if we have MIND/BIOGRID/BIND identifiers, filter them out as they're not really references for building our dropdown list
                if (!item.match(/biogrid:(.*)/i) && !item.match(/Mind(\d+)$/i) && !item.match(/^(\d+)$/i)){
                    return item;
                }
            });
        }));
        let uniquefilteredPubsArr = Array.from(new Set(filteredPubsArr)); // remove duplicates
        this.buildRefDropdown(uniquefilteredPubsArr);

        /**
         * @function scientificToDecimal - Helper function to turn scientific notation nums to integer form more nicely than using toFixed(), credits to https://gist.github.com/jiggzson/b5f489af9ad931e3d186
         * @param num - number
         * @return num - in integer form if num was originally in scientific notation
         */
        function scientificToDecimal(num) {
            //if the number is in scientific notation remove it
            if(/\d+\.?\d*e[\+\-]*\d+/i.test(num)) {
                let zero = '0',
                    parts = String(num).toLowerCase().split('e'), //split into coeff and exponent
                    e = parts.pop(),//store the exponential part
                    l = Math.abs(e), //get the number of zeros
                    sign = e/l,
                    coeff_array = parts[0].split('.');
                if(sign === -1) {
                    num = zero + '.' + new Array(l).join(zero) + coeff_array.join('');
                }
                else {
                    let dec = coeff_array[1];
                    if(dec) { l = l - dec.length }
                    num = coeff_array.join('') + new Array(l+1).join(zero);
                }
            }

            return num;
        }
    };

    /**
     * @namespace {object} AIV
     * @function buildRefDropdown - helper function that will build the dynamic reference dropdown, take in an array of PPI ref strings
     * @param arrayOfPubs - an array of publications for ex, ["None", "PubMed19095804", ...]
     */
    AIV.buildRefDropdown = function(arrayOfPubs){
        let tempArrPubs = arrayOfPubs;
        let whereNoneIs = tempArrPubs.indexOf('None');
        if (whereNoneIs !== -1){ //remove "None" from our list of publications...
            tempArrPubs.splice(whereNoneIs, 1);
        }
        let inputsLabelsHTML = "";
        tempArrPubs.forEach(function(ref){
            if (! document.getElementById(`${ref}-checkbox`)){ // check if DOM node exists before appending
                let bindIDText = "";
                if (ref.match(/^\d+$/)){
                    bindIDText = "BIND ID ";
                }
                inputsLabelsHTML +=
                    `
                    <label for="${ref}-checkbox">
                        <input type="checkbox" id="${ref}-checkbox" class="ref-checkbox" value="${ref}" checked>
                        ${bindIDText + ref}
                    </label>
                    `;
            }
        });
        $('#refCheckboxes').append(inputsLabelsHTML);
    };

    /**
     * @namespace {object} AIV
     * @function - parsePSICQUICInteractionsData - Take in non-BAR PSICQUICdata param which is the text response we get back from the AJAX call and parse it via regex (based on whether it is from INTACT or BioGrid). Then add unique edges and nodes. NOTE: PSICQUIC data can have more than one entry/evidence for a single edge (resulting in multiple lines for single the interacting protein)
     * @param {string} PSICQUICdata - should be a bunch of PSICQUIC formatted text
     * @param {string} queryGeneAsAGI - should be something like "At3g10000"
     * @param {string} INTACTorBioGrid - should either be "INTACT" or "BioGrid"
     */
    AIV.parsePSICQUICInteractionsData = function(PSICQUICdata, queryGeneAsAGI, INTACTorBioGrid){
        // INTACT and BioGrid PPIs are experimentally validated by default hence these 3 colors, style, width

        let regex;
        if (INTACTorBioGrid === "INTACT") {
            // example uniprotkb:(?!At3g18130)(At\d[gcm]\d{5})\(locus.*psi-mi:"MI:(\d+"\(.*?\)).*(pubmed:\d+) WITH GI flags!
            regex = new RegExp("uniprotkb:(?!" + queryGeneAsAGI +")(At\\d[gcm]\\d{5})\\(locus.*psi-mi:\"MI:(\\d+\"\\(.*?\\)).*(pubmed:\\d+)", "gi");
        }
        else if (INTACTorBioGrid === "BioGrid"){
            // example \|entrez gene\/locuslink:(?!At3g18130)(At\d[gcm]\d{5})[\t|].*psi-mi:"MI:(\d+"\(.*?\)).*(pubmed:\d+) WITH GI flags!
            regex = new RegExp("\\|entrez gene\\/locuslink:(?!" + queryGeneAsAGI + ")(At\\d[gcm]\\d{5})[\\t|].*psi-mi:\"MI:(\\d+\"\\(.*?\\)).*(pubmed:\\d+)", "gi");
        }

        let match;
        let arrPPIsProteinsRaw = []; // array will be populated with ABI identifiers of genes that interact with the queryGeneAsAGI via regex...
        let miTermPSICQUIC = []; // array to be populated with MI terms with their annotations i.e. ['0018"(two hybrid)', ...]
        let pubmedIdArr = []; // array to store string of pubmed IDs

        /*
        Do not place the regular expression literal (or RegExp constructor) within the while condition or it will create an infinite loop if there is a match due to the lastIndex
        property being reset upon each iteration. Also be sure that the global flag is set or a loop will occur here also.

        We are looping through the entire returned response text string (tab delimited PSICQUIC format) and looking for matches via the builtin regex.exec method. When we find a match, specifically
        the second capturing group, we will push to a state array for further processing
         */
        while ((match = regex.exec(PSICQUICdata)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (match.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            arrPPIsProteinsRaw.push( AIV.formatAGI ( match[1] ) ); // 1st captured group, i.e. "At2g10000"
            miTermPSICQUIC.push(match[2]); // push the 2nd group (i.e '0018"(two hybrid)', yes with '"'!)
            pubmedIdArr.push(match[3]); //look for third captured group (i.e. "23667124")
        }

        /*
        Loop through each PPI interaction and add the corresponding edge
        Need index to add PubMedID (as far as we know there is only one pubmed ID per interaction) so we can simply map out the index.
        Note we check if an edge already exists as there seems to be rarely a duplicate in the PSICQUIC response data
         */
        arrPPIsProteinsRaw.forEach(function(proteinItem, index){
            if ( AIV.cy.$id(`Protein_${proteinItem}`).empty()) { //Check if node already on cy core (don't need to do an array check as form nodes added in the then() after the Promise.all)
                AIV.addNode(proteinItem, "Protein");
            }

            let edgeSelector = `Protein_${queryGeneAsAGI}_Protein_${proteinItem}`;
            let preappendedRef = INTACTorBioGrid + "-" + pubmedIdArr[index];
            miTermPSICQUIC[index] = miTermPSICQUIC[index].replace('"', ' '); // replace for " inside '0018"(two hybrid)' to become '0018 (two hybrid)'
            if ( AIV.cy.$id(edgeSelector).empty() ) { //Check if edge already added from BAR
                    AIV.addEdges( queryGeneAsAGI, "Protein", proteinItem, "Protein", preappendedRef, true, 0, INTACTorBioGrid, null, miTermPSICQUIC[index] ); // 0 represents experimentally validated in our case and we leave R as null
            }
            else { // account for edges already added, we just have to edit some edge data (refs and miTERMs)
                let updatedRefData = AIV.cy.$id(edgeSelector).data('reference') + '\n' + preappendedRef;
                AIV.cy.$id(edgeSelector).data({
                    'reference': updatedRefData,
                    'published': true, // Note that we DON'T change the interolog confidence since the BAR actually has such data
                    'miAnnotated': AIV.cy.$id(edgeSelector).data('miAnnotated').concat([miTermPSICQUIC[index]]) // append new miTerm to current arr
                });
            }
        });

        let pubmedIdArrUnique = pubmedIdArr.filter(function(item, index, selfArr){ // delete duplicates
            return index === selfArr.indexOf(item);
        });
        this.buildRefDropdown(pubmedIdArrUnique);

    };

    /**
     * @function addTableRow - take in a bunch of params and add it to an HTML table row string, to be held in a state variable
     * @description - NO LONGER USED, here for reference as it was a base for the createTableFromEdges function
     * @param {string} intType - interaction type, protein-protein or protein-dna
     * @param {string} dbSource - database source, ex BAR
     * @param {string} sourceGene - AGI source gene
     * @param {string} targetGene - AGI target gene
     * @param {number|string} interoConf - interologconfidence, if it exists
     * @param {number|string} pearsonCC - pearson correlation coefficient
     * @param {string} ref - if a published interaction, pubmed or DOI or MIND etc
     * @param miTerm - MI term that describes what type of a experiment was performed
     */
    AIV.addTableRow = function(intType, dbSource, sourceGene, targetGene, interoConf, pearsonCC, ref, miTerm){
        //store in a state variable for performance boot rather than adding one row at a time to DOM

        /**
         * Some notes:
         * For interlog confidence it represents multiple things: FEMO score, interolog confidence, SPPI rank and experimentally determined
         * Talked with nick to represent '0' (experimentally determined) as 'N/A' hence the ternary operator
         * Parse mi terms for BAR/INTACT/BioGrid, then format nicely if more than one mi term
         * Also need a 'ppiOrPdi' to make ppis and pdis distinct for localization cells
         */
        let ppiOrPdi = "ppi";
        if (intType === "protein-DNA"){ ppiOrPdi = "pdi";}

        let referencesCleaned = "";
        this.memoizedSanRefIDs(ref).forEach(function(ref){
            referencesCleaned += `<p> ${AIV.memoizedRetRefLink(ref, targetGene)} </p>`;
        });

        let miFormattedHTML = "";
        if (miTerm !== null && miTerm !== undefined && dbSource === "BAR"){
            let miArray = miTerm.split('|');
            miArray.forEach(function(miTerm){
                if (AIV.miTerms[miTerm] !== undefined){
                    miFormattedHTML += `<p>${miTerm} (${AIV.miTerms[miTerm]})</p>`;
                }
            });
        }
        else if (dbSource === "INTACT" || dbSource === "BioGrid") {
            miFormattedHTML += `<p>${miTerm}</p>`;
        }

        this.tempHtmlTableStr +=
            `<tr>
                <td class="small-csv-column">${intType}</td>
                <td class="small-csv-column">${sourceGene}</td>
                <td class="small-csv-column">${targetGene}</td>
                <td class="${sourceGene}-annotate small-csv-column"></td>
                <td class="${targetGene}-annotate small-csv-column"></td>
                <td class="small-csv-column">${interoConf === 0 ? "N/A" : interoConf }</td>
                <td class="small-csv-column">${pearsonCC}</td>
                <td class="lg-csv-column">${referencesCleaned.match(/.*undefined.*/) ? "None" : referencesCleaned}</td>
                <td class="med-csv-column">${miFormattedHTML ? miFormattedHTML : "None"}</td>
                <td class="${sourceGene}-loc lg-csv-column">Fetching Data</td>
                <td class="${targetGene}-${ppiOrPdi}-loc lg-csv-column">${ppiOrPdi === "pdi" ? "Nucleus(assumed)" : "Fetching Data"}</td>
            </tr>`;
    };

    /**
     * @function createTableFromEdges - this funciton will scan through our recently added Cy PPI edges and then our state variable of chromosomes to build a neat HTML table to be appended to the #csvTable modal
     */
    AIV.createTableFromEdges = function (){
        let htmlString = "";

        // process PPI edges first
        this.cy.edges('[target *= "Protein"], [target *= "Effector"]').forEach(function(ppiEdge){
            let tempData = ppiEdge.data();

            let cleanRefs = "";
            let sourceGene = tempData.source.split('_')[1];
            let [typeTarget, targetGene] = tempData.target.split('_');
            if (tempData.reference){ //non-falsy value
                AIV.memoizedSanRefIDs(tempData.reference).forEach(function(ref){
                    cleanRefs += `<p> ${AIV.memoizedRetRefLink(ref, targetGene)} </p>`;
                });
            }

            htmlString +=
                `<tr>
                    <td class="small-csv-column">Protein-${typeTarget}</td>
                    <td class="small-csv-column">${sourceGene}</td>
                    <td class="small-csv-column">${targetGene}</td>
                    <td class="${sourceGene}-annotate small-csv-column"></td>
                    <td class="${targetGene}-annotate small-csv-column"></td>
                    <td class="small-csv-column">${tempData.interologConfidence === 0 ? "N/A" : tempData.interologConfidence }</td>
                    <td class="small-csv-column">${tempData.pearsonR}</td>
                    <td class="lg-csv-column">${cleanRefs.match(/.*undefined.*/) ? "None" : cleanRefs}</td>
                    <td class="med-csv-column">${tempData.miAnnotated}</td>
                    <td class="${sourceGene}-loc lg-csv-column">Fetching Data</td>
                    <td class="${targetGene}-ppi-loc lg-csv-column">Fetching Data</td>
                </tr>`;
        });

        // now process PDI edges (or rather the state data in memory)
        for (let chr of Object.keys(AIV.chromosomesAdded)) {
            for (let i = 0; i < AIV.chromosomesAdded[chr].length; i++) {
                let tempDNAData = AIV.chromosomesAdded[chr][i];

                let cleanRefs = "";
                let sourceGene = tempDNAData.source;
                let targetGene = tempDNAData.target;
                if (tempDNAData.reference){ //non-falsy value
                    AIV.memoizedSanRefIDs(tempDNAData.reference).forEach(function(ref){
                        cleanRefs += `<p> ${AIV.memoizedRetRefLink(ref, targetGene)} </p>`;
                    });
                }

                let miHTML = "";
                if (tempDNAData.mi !== null && tempDNAData.mi !== undefined){
                    let miArray = tempDNAData.mi.split('|');
                    miArray.forEach(function(miTerm){
                        if (AIV.miTerms[miTerm] !== undefined){
                            miHTML += `<p>${miTerm} (${AIV.miTerms[miTerm]})</p>`;
                        }
                    });
                }

                htmlString +=
                `<tr>
                    <td class="small-csv-column">Protein-DNA</td>
                    <td class="small-csv-column">${sourceGene}</td>
                    <td class="small-csv-column">${targetGene}</td>
                    <td class="${sourceGene}-annotate small-csv-column"></td>
                    <td class="${targetGene}-annotate small-csv-column"></td>
                    <td class="small-csv-column">${tempDNAData.interolog_confidence === 0 ? "N/A" : tempDNAData.interolog_confidence }</td>
                    <td class="small-csv-column">${tempDNAData.correlation_coefficient}</td>
                    <td class="lg-csv-column">${cleanRefs}</td>
                    <td class="med-csv-column">${miHTML}</td>
                    <td class="${sourceGene}-loc lg-csv-column">Fetching Data</td>
                    <td class="${targetGene}-pdi-loc lg-csv-column">Nucleus (assumed)</td>
                </tr>`;
            }
        }

        $('#csvTable').find("tbody").append(htmlString);
    };

    /**
     * @namespace {object} AIV
     * @function returnLocalizationPOSTJSON - Create and return SUBA URL string for AJAX call
     * @returns {Object} - an object with the string of AGIs and the predicted localizations
     */
    AIV.returnLocalizationPOSTJSON = function(){

        var reqJSON =
            {
                AGI_IDs : [],
            };
        this.parseProteinNodes(nodeID => reqJSON.AGI_IDs.push( nodeID ));

        reqJSON.include_predicted = $("#exprPredLocEye").hasClass('fa-eye');

        return reqJSON;
    };

    /**
     * @namespace {object} AIV
     * @function addLocalizationDataToNodes -
     * Run a forEach loop for every node with a valid ABI ID to attach SUBA data to the node to be later
     * shown via pie-chart background (built-in in cytoscapejs).
     * We chose to hard-code the cellular localizations versus checking them in the JSON structure as
     * the JSON structure does not return all cellular localizations when it does not have a score.
     * Also note that some of the property names had spaces in them...
     *
     * @param {object} SUBADATA as the response JSON we get from our SUBA4 backend (at the BAR)
     */
    AIV.addLocalizationDataToNodes = function(SUBADATA) {
        AIV.cy.startBatch();

        AIV.locCompoundNodes = [];

        Object.keys(SUBADATA).forEach(function(geneAGIName){
            let nodeID = geneAGIName; //AT1G04170 to At1g04170
            let geneSUBAData = SUBADATA[geneAGIName];
            if (Object.keys(geneSUBAData.data).length){ //For nodes with any localization data
                let majorityLoc = Object.keys(geneSUBAData.data[0])[0];
                AIV.cy.$('node[name = "' + nodeID + '"]')
                    .data({
                        predictedSUBA :  ( geneSUBAData.includes_predicted === "yes" ),
                        experimentalSUBA : ( geneSUBAData.includes_experimental === "yes" ),
                        localizationData: calcLocPcts( geneSUBAData.data),
                        localization : majorityLoc, //assign localization to highest loc score
                    });
                if (AIV.locCompoundNodes.indexOf(majorityLoc) === -1 ){
                    AIV.locCompoundNodes.push(majorityLoc); // append to our state variable which stores unique majority localizations, used to later make compound nodes
                }
            }
            else { //For nodes without any localization data
                AIV.cy.$('node[name = "' + nodeID + '"]')
                    .data({
                        predictedSUBA : false,
                        experimentalSUBA : false,
                        localizationData: [],
                        localization: "unknown"
                    });
                if (AIV.locCompoundNodes.indexOf("unknown") === -1 ){
                    AIV.locCompoundNodes.push("unknown"); // append to our state variable which stores unique majority localizations, used to later make compound nodes
                }
            }

        });

        AIV.cy.endBatch();

        function calcLocPcts(subaLocData){
            let retObj = [];
            let deno = 0;
            subaLocData.forEach(locScore => deno += Object.values(locScore)[0]); // use [0] because only one property is in the obj i.e. [{"nucleus": 20},{"cytosol": 10}]
            subaLocData.forEach(function(locScore){
                retObj.push({[Object.keys(locScore)[0]] : Object.values(locScore)[0]/deno});
            });
            return retObj;
        }
    };

    /**
     * @namespace {object} AIV
     * @function createSVGPIeDonutCartStr -
     * This function will take in all the location data properties that a node has (for example, 'nucleus')
     * to be used to create a SVG donut string which will be set as the background image. I intentionally
     * made this function based on the AIV.nodeSize property such that it can be more scalable (literally
     * and figuratively).
     *
     * @param {object} AGIGene - takes in a reference to a node, particularly a ABI gene to parse through its 'PCT' properties.
     *
     * Credits to: https://medium.com/@heyoka/scratch-made-svg-donut-pie-charts-in-html5-2c587e935d72
     */
    AIV.createSVGPieDonutCartStr = function(AGIGene) {
        let nodeData = AGIGene.data();
        let AGIGeneLocData = nodeData.localizationData ;
        let cyNodeSize = nodeData.queryGene ? this.searchNodeSize : this.nodeSize ;
        let SVGwidthheight = cyNodeSize + 10;
        let donutCxCy = SVGwidthheight/2;
        let radius, strokeWidth;
        radius = strokeWidth = cyNodeSize/2;
        let SVGstr = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg>';
        SVGstr += `<svg width="${SVGwidthheight}" height="${SVGwidthheight}" class="donut" xmlns="http://www.w3.org/2000/svg">`;
        SVGstr += `<circle class="donut-hole" cx="${donutCxCy}" cy="${donutCxCy}" r="${radius}" fill="transparent"></circle>`;

        //The below donut segment will appear for genes without SUBA data... it will be all grey
        SVGstr += `<circle class="donut-unfilled-ring" cx="${donutCxCy}" cy="${donutCxCy}" r="${radius}" fill="transparent" stroke="#56595b" stroke-width="${strokeWidth}" display="block"></circle>`;

        // Figure out which 'PCT' properties are greater than zero and then programatically add them
        // as donut-segments. Note that some calculations are involved based
        // on the set node size (the example given on the tutorial is based on a 100px C and 15.91 radius)
        var scaling = radius/15.91549430918952;
        var pctAndColorArray = [];

        if (AGIGeneLocData.length > 0){ // need check as nodes without loc data with crash app
            AGIGeneLocData.forEach(function(locPercentage){
                pctAndColorArray.push({
                    pct : (Object.values(locPercentage)[0] * 100), //convert to % for easier parsing later
                    color : AIV.locColorAssignments[Object.keys(locPercentage)[0]]
                });
            });
        }

        // Now have pre-sorted pctAndColorArray based on the value of the 'pct' property, order greatest to least
        // Result: Show pie chart values from greatest to least starting from 12 oclock

        var initialOffset = 25 * scaling; // Bypass default donut parts start at 3 o'clock instead of 12
        var allSegsLength = 0;

        // Based on the sorted array we created above, let's add some 'donut segments' to the SVG string
        pctAndColorArray.forEach(function(pctAndColor){
            SVGstr += `<circle class="donut-segment" cx="${donutCxCy}" cy="${donutCxCy}" r="${radius}"  fill="transparent" stroke="${pctAndColor.color}" stroke-width="${strokeWidth}" stroke-dasharray="${pctAndColor.pct * scaling} ${(100 - pctAndColor.pct) * scaling}" stroke-dashoffset="${initialOffset}" display="block"></circle>`;

            allSegsLength += pctAndColor.pct;

            // (Circumference − All preceding segments’ total length + First segment’s offset = Current segment offset ) * scaling factor
            initialOffset = (100 - allSegsLength + 25) * scaling; // increase offset as we have just added a slice

        });

        SVGstr += '</svg>';
        SVGstr = 'data:image/svg+xml;utf8,' + encodeURIComponent(SVGstr); // Modify for CSS via cytoscape
        AGIGene.data('svgDonut', SVGstr); // Last, properly mutate the node with our made SVG string

    };

    /**
     * @namespace {object} AIV
     * @function returnBGImageSVGasCSS -
     * Return svg backgrounds as background images to all the protein nodes in the cy core
     * and add borders for those nodes which have experimental SUBA values
     * @returns {object} - a AIV css style update object ( not ran yet, it runs with update() )
     */
    AIV.returnBGImageSVGasCSS = function () {
        return (
            AIV.cy.style() //specifying style instead of stylesheet updates instead of replaces the cy CSS
                .selector('node[id ^= "Protein_At"]')
                    .css({
                        'background-image' : 'data(svgDonut)',
                    })
                .selector('node[?experimentalSUBA]') //select nodes such that experimentalSUBA is truthy
                    .css({
                        'border-style' : 'solid',
                        'border-width' : '3px',
                        'border-color' : '#99cc00',
                    })
        );
    };

    /**
     * @function transferLocDataToTable - parse every protein and effector node on the DOM and modify the 'csv' table accordingly (add an unordered list of localization percentage scores)
     */
    AIV.transferLocDataToTable = function() {
        this.parseProteinNodes(function(node){
            let ulString = "<ul>";
            let locData = node.data('localizationData');
            for (let i = 0; i < locData.length; i++) {
                let locPercent = Object.values(locData[i])[0];
                if (locPercent > 0){
                    ulString += `<li> ${Object.keys(locData[i])[0]}: ${(locPercent*100).toFixed(1)}% </li>`;
                }
            }
            ulString += "</ul>";
            // console.log(ulString);
            let nodeID = node.data('name');
            $(`.${nodeID}-loc`).html(ulString);
            $(`.${nodeID}-ppi-loc`).html(ulString); //only change ppis, pdis are assumed to be nuclear
        }, true);

        this.cy.filter("node[id ^= 'Effector']").forEach(function(effector){
            $(`.${effector.data('name')}-ppi-loc`).text("extracellular(assumed)");
        });
    };

    /**
     * @namespace {object} AIV
     * @function hideDonuts - un/hides donuts by changing display attribute inside the svg
     * @param {boolean} hide - boolean to determine if we are hiding or not
     */
    AIV.hideDonuts = function(hide) {
        this.cy.startBatch();
        this.cy.$('node[?svgDonut]').forEach(function(node){ //check for nodes with an SVG donut
            let newSVGString = decodeURIComponent(node.data('svgDonut'));
            newSVGString = newSVGString.replace('data:image/svg+xml;utf8,', "");
            if (hide){
                newSVGString = newSVGString.replace(/"block"/g, '"none"'); //change display attribute
            }
            else {
                newSVGString = newSVGString.replace(/"none"/g, '"block"');
            }
            newSVGString = 'data:image/svg+xml;utf8,' + encodeURIComponent(newSVGString);
            node.data('svgDonut', newSVGString);
        });
        this.cy.endBatch();
    };

    /**
     * @namespace {object} AIV
     * @function createGETMapManURL -
     * Create URL for get request for mapman information, namely for the codes (MapMan IDs).
     * Example: http://www.gabipd.org/services/rest/mapman/bin?request=[{"agi":"At4g36250"},{"agi":"At4g02070"}]
     * Data returned is an array of objects, MapMan code is nested inside "result[0].parent.code" for each AGI
     * @returns {string} - url for the HTTP request
     */
    AIV.createGETMapManURL = function () {
        let mapmanURL = "https://bar.utoronto.ca/~asher/vincent/bar_mapman.php?request=[";
        this.parseProteinNodes((nodeID) => mapmanURL +=`"${nodeID}",`);
        mapmanURL = mapmanURL.slice(0,-1); //remove last ','
        mapmanURL += "]";
        return mapmanURL;
    };

    /**
     * @namespace {object} AIV
     * @function processMapMan -
     * Take in the MapMan data from response JSON to be processed:
     * 1) Add MapMan code(s) and name(s) to node data to be displayed via qTip and on their donut centre
     *
     * @param {object} MapManJSON - the JSON response we receive from the MapMan API
     */
    AIV.processMapMan = function (MapManJSON) {
        if (!this.mapManLoadState) { //if MapMan data not yet fully parsed after API call, i.e. initial load
            MapManJSON.forEach(function(geneMapMan) { // Iterate through each result item and inside however many annotations it has
                var particularGene = AIV.cy.$('node[id = "Protein_' + geneMapMan.request.agi + '"]');
                particularGene.data("numOfMapMans", geneMapMan.result.length); //for use in the qTip
                geneMapMan.result.forEach(function (resultItem, index) {
                    var MapManCodeN = 'MapManCode' +  (index + 1); //i.e. MapManCode1
                    var MapManNameN = 'MapManName' +  (index + 1); //i.e. MapManName1
                    particularGene.data({ //Add this data to object to be called via the qTip
                        [MapManCodeN] : chopMapMan(resultItem.code),
                        [MapManNameN] : chopMapMan(resultItem.name)
                    });

                    //Now call SVG modifying function for the first iteration, Nick agreed to only show the first MapMan on the Donut, also add this MapMan to our checklist/legend
                    if (index === 0) {
                        let mapManBIN = resultItem.code.split(".")[0]; // get MapMan BIN (leftmost number, i.e. get 29 from 29.12.3)
                        particularGene.data('mapManOverlay', mapManBIN);
                        modifySVGString(particularGene, mapManBIN);
                        if (!AIV.mapManOnDom.hasOwnProperty(mapManBIN)){
                            AIV.mapManOnDom[mapManBIN] = 1;
                        }
                        else {
                            AIV.mapManOnDom[mapManBIN] = AIV.mapManOnDom[mapManBIN] + 1;
                        }
                    }
                });
            });
            // Last, use the mapManOnDom state variable to add the list of checkboxes to our #bootstrapDropDownMM
            // example li item <li><a href="#" class="small" data-value="27" tabIndex="-1"><input type="checkbox"/ checked="true"> MapMan 27 - RNA</a></li>
            // credits: https://codepen.io/bseth99/pen/fboKH
            let df = document.createDocumentFragment();
            for (let mapManNumKey of Object.keys(AIV.mapManOnDom)){
                let li = document.createElement('li');
                let a = document.createElement('a');
                AIV.helperSetAttributes(a, {
                    "data-value" : mapManNumKey,
                    "tabIndex"   : "-1",
                    "href"       : "#"
                });
                a.className = "small";
                let input = document.createElement('input');
                AIV.helperSetAttributes(input, {
                    'type' : 'checkbox',
                    'checked' : 'true'
                });
                a.append(input);
                a.insertAdjacentHTML("beforeend", ` ${mapManNumKey}-${AIV.mapManDefinitions[mapManNumKey]} (${AIV.mapManOnDom[mapManNumKey]})`);
                li.append(a);
                df.append(li);
            }
            document.getElementById('bootstrapDropDownMM').appendChild(df);
            AIV.mapManDropDown(AIV);
        }
        else {
           this.parseProteinNodes(function(proteinNode){
               modifySVGString(proteinNode, proteinNode.data('mapManOverlay'));
           }, true);
        }

        /**
         * @function chopMapman - decides whether or not to chop off MapMan Code/Name based on its detail/length (decided with discussion with Nick)
         * @param {string} nameOrCode - "27.2.1 or RNA.regulation.transcription" as an example
         */
        function chopMapMan(nameOrCode) {
            if ( (nameOrCode.match(/\./g)||[]).length > 3 ){ //If the MapMan is too detailed, remove the last occurence
                return nameOrCode.substr(0, nameOrCode.lastIndexOf("."));
            }
            return nameOrCode; //By default return unmodified string if it is not too detailed
        }

        /**
         * @namespace {object} AIV
         * @function modifySVGString - Expect a node as an object reference and modify its svgDonut string by adding a text tag
         * @param {object} geneNode - as a node object reference
         * @param {string} mapManNum - the first MapMan number (leftmost)
         */
        function modifySVGString(geneNode, mapManNum) {
            if (typeof mapManNum === "undefined") {return;}
            let newSVGString = decodeURIComponent(geneNode.data('svgDonut')).replace("</svg>", ""); //strip </svg> closing tag
            newSVGString = newSVGString.replace('data:image/svg+xml;utf8,', "");
            // console.log(newSVGString);
            let xPosition = mapManNum.length > 1 ? '32%' : '41%'; //i.e. check if single or double digit
            let fontSize = geneNode.data('queryGene') ? 22 : 13; //Determine whether gene is bigger or not (i.e. search gene or not)

            newSVGString += `<text x='${xPosition}' y='59%' font-size='${fontSize}' font-family="Verdana" visibility="visible">${mapManNum}</text></svg>`;
            newSVGString = 'data:image/svg+xml;utf8,' + encodeURIComponent(newSVGString);

            geneNode.data('svgDonut', newSVGString);
        }

    };

    /**
     * @namespace {object} AIV
     * @function hideMapMan - un/hides MapMan centre by un/enabling visibility attribute inside the svg
     * @param {boolean} hide - boolean to determine if we are hiding or not
     */
    AIV.hideMapMan = function(hide){
        this.cy.startBatch();
        this.cy.$('node[?MapManCode1]').forEach(function(node){ //check for nodes with a MapMan
            let newSVGString = decodeURIComponent(node.data('svgDonut'));
            newSVGString = newSVGString.replace('data:image/svg+xml;utf8,', "");
            if (hide){
                newSVGString = newSVGString.replace('"visible"', '"hidden"'); //change visbility attribute
            }
            else {
                newSVGString = newSVGString.replace('"hidden"', '"visible"');
            }
            newSVGString = 'data:image/svg+xml;utf8,' + encodeURIComponent(newSVGString);
            node.data('svgDonut', newSVGString);
        });
        this.cy.endBatch();
    };

    /**
     * @namespace {object} AIV
     * @function effectorsLocHouseCleaning - purpose of this function is to fill in the localization data for effectors as they do not undergo the same parsing as protein nodes. Specifically they belong to the extracellular matrix (ECM), so if one exists on the app, modify the compound state variable correctly if not added already
     */
    AIV.effectorsLocHouseCleaning = function(){
        let effectorSelector = this.cy.filter("node[id ^= 'Effector']");
        if (effectorSelector.length > 0){
            if (this.locCompoundNodes.indexOf('extracellular') === -1){
                this.locCompoundNodes.push("extracellular");
            }
            effectorSelector.forEach(function(effector){ //put effectors in ECM
                effector.data('localization' , 'extracellular');
            });
        }
    };

    /**
     * @namespace {object} AIV
     * @function loadData - Load data main function
     * @returns {boolean} - True if the data is laoded
     */
    AIV.loadData = function() {
        // Dynamically build an array of promises for the Promise.all call later
        var promisesArr = [];

        if ($('#queryBAR').is(':checked')) {
            promisesArr.push(this.createBARAjaxPromise());
        }
        if ($('#queryIntAct').is(':checked')) {
            promisesArr = promisesArr.concat(this.createINTACTAjaxPromise());
        }
        if ($('#queryBioGrid').is(':checked')) {
            promisesArr = promisesArr.concat(this.createBioGridAjaxPromise());
        }
        // console.log(promisesArr);

        Promise.all(promisesArr)
            .then(function(promiseRes) {
                // console.log("Response:", promiseRes);
                // Add Query node (user inputed in HTML form)
                for (let i = 0; i < AIV.genesList.length; i++) {
                    if (AIV.genesList[i].match(/^AT[1-5MC]G\d{5}$/i)) {
                        AIV.addNode(AIV.genesList[i], 'Protein', true);
                    }
                    else {
                        AIV.addNode(AIV.genesList[i], 'Effector', true);
                    }
                }

                // Parse data and make cy elements object
                for (let i = 0; i < promiseRes.length; i++) {
                    if (promiseRes[i].ajaxCallType === "BAR"){
                        AIV.parseBARInteractionsData(promiseRes[i].res);
                    }
                    else {
                        AIV.parsePSICQUICInteractionsData(promiseRes[i].res, promiseRes[i].queryGene, promiseRes[i].ajaxCallType);
                    }
                }

                // Update styling and add qTips as nodes have now been added to the cy core

                AIV.createTableFromEdges();
                // AIV.addInteractionRowsToDOM();
                // console.log(AIV.cy.nodes().length, 'nodes');
                // console.log(AIV.cy.edges().length, 'edges');
                //Below lines are to push to a temp array to make a POST for gene summaries
                let nodeAgiNames = [];
                AIV.parseProteinNodes((nodeID) => nodeAgiNames.push(nodeID));
                for (let chr of Object.keys(AIV.chromosomesAdded)) {
                    nodeAgiNames = nodeAgiNames.concat(AIV.chromosomesAdded[chr].map( prop => prop.target));
                }
                let uniqueNodeAgiNames = Array.from(new Set(nodeAgiNames)); // remove duplicates to make quicker requests
                AIV.fetchGeneAnnoForTable(uniqueNodeAgiNames);
                AIV.addChrNodeQtips();
                AIV.addNumberOfPDIsToNodeLabel();
                AIV.addProteinNodeQtips();
                AIV.addPPIEdgeQtips();
                AIV.addEffectorNodeQtips();
                AIV.cy.style(AIV.getCyStyle()).update();
                AIV.setDNANodesPosition();
                AIV.resizeEListener();
                AIV.addContextMenus();
                AIV.cy.layout(AIV.getCySpreadLayout()).run();

                $('#refCheckboxes').prepend(
                    "<label for='allCheck'><input type='checkbox' id='allCheck'> Filter All/Reset</label>"
                );
                AIV.filterAllElistener(AIV);

                document.getElementById('loading').classList.add('loaded'); //hide loading spinner
                $('#loading').children().remove(); //delete the loading spinner divs
            })
            .catch(function(err){
                alertify.logPosition("top right");
                alertify.error(`Error during fetching interaction data, try BAR if using PSICQUIC services, status code: ${err.status}`);
            })
            .then(AIV.returnSVGandMapManThenChain);

    };

    /**
     * @function returnSVGandMapManThenChain - Return a promise chain that makes two ajax calls to our SUBA4 localziation API and the MapMan API to draw the SVG piechart background-images. This chain contains some logic with the load state. This logic is for when the user selects the switch for 'predicted' localization data. Note that this implementation will make re-calls to the SUBA4 API when the user hits the switch (as opposed to saving the predicted and experimental data to memory).
     * @return {Promise.<TResult>}
     */
    AIV.returnSVGandMapManThenChain = function () {
        return $.ajax({
            url: "https://bar.utoronto.ca/~vlau/suba4.php",
            type: "POST",
            data: JSON.stringify( AIV.returnLocalizationPOSTJSON() ),
            contentType : 'application/json',
            dataType: 'json'
        })
            .then(function(SUBAJSON){
                AIV.addLocalizationDataToNodes(SUBAJSON);

                //Loop through ATG protein nodes and add a SVG string property for bg-image css
                AIV.cy.startBatch();
                AIV.parseProteinNodes(AIV.createSVGPieDonutCartStr.bind(AIV), true);
                AIV.cy.endBatch();
                AIV.effectorsLocHouseCleaning();
                if (!AIV.SUBA4LoadState){
                    AIV.returnBGImageSVGasCSS().update();
                }

                //Update the HTML table with our SUBA data
                AIV.transferLocDataToTable();
                AIV.SUBA4LoadState = true;
            })
            .catch(function(err){
                alertify.logPosition("top right");
                alertify.error(`Error made when requesting to SUBA webservice, status code: ${err.status}`);
            })
            .then(function(){ // chain this AJAX call to the above as the mapman relies on the drawing of the SVG pie donuts, i.e. wait for above sync code to finish
                if (!AIV.mapManLoadState) { //don't make another ajax call if we already have MapMan data in our nodes (this logic is for our checkbox)
                    return $.ajax({
                        url: AIV.createGETMapManURL(),
                        type: 'GET',
                        dataType: 'json'
                    });
                }
            })
            .catch(function(err){
                alertify.logPosition("top right");
                alertify.error(`Error made when requesting to MapMan webservice (note: we cannot load more than 700 MapMan numbers), status code: ${err.status}`);
            })
            .then(function(resMapManJSON){
                if (resMapManJSON.status === "fail"){ throw new Error ('MapMan server call failed!')}
                AIV.cy.startBatch();
                AIV.processMapMan(resMapManJSON);
                AIV.cy.endBatch();
                AIV.mapManLoadState = true;
            })
            .catch(function(err){
                alertify.logPosition("top right");
                alertify.error(`Error processing MapMan data; ${err}`);
            });
    };

    /**
     * @function createBARAJaxPromise - programatically figures out how to build the BAR URL get request
     * @returns {Promise.<{res: object, ajaxCallType: string}>|*}
     */
    AIV.createBARAjaxPromise = function() {
        // AGI IDs
        let postObj = {};
        postObj.loci = "";
        for (var i = 0; i < this.genesList.length; i++) {
            postObj.loci += this.genesList[i] + ",";
        }
        postObj.loci = postObj.loci.slice(0, -1);

        //Recursive
        postObj.recursive = $('#recursive').is(':checked');

        // Published
        postObj.published = $('#published').is(':checked');

        // DNA
        postObj.querydna = $('#queryDna').is(':checked');

        let serviceURL = 'http://bar.utoronto.ca/~asher/vincent/get_interactions_dapseq.php';

        return $.ajax({
            url: serviceURL,
            type: 'POST',
            data: JSON.stringify(postObj),
            contentType: "application/json",
            dataType: "json"
        })
            .then( res => ( {res: res, ajaxCallType: 'BAR'} )); //ajaxCallType for identifying when parsing Promise.all response array
    };

    /**
     * @function createINTACTAjaxPromise - Parse through the gene form and create a bunch of AJAX requests to the INTACT PSICQUIC webservice
     * @returns {Array} - array of ajax promises that return objects when resolved
     */
    AIV.createINTACTAjaxPromise = function () {
        var returnArr = []; //return an array of AJAX promises to be concatenated later
        for (let i = 0; i < this.genesList.length; i++) {
            returnArr.push(
                $.ajax({
                    url: `https://cors-anywhere.herokuapp.com/http://www.ebi.ac.uk/Tools/webservices/psicquic/intact/webservices/current/search/interactor/${this.genesList[i]}`, //todo: take off cors anywhere
                    type: 'GET',
                    dataType: 'text'
                })
                    .then( res => ( {res: res, ajaxCallType: 'INTACT', queryGene: this.genesList[i]} )) //ajaxCallType for identifying when parsing Promise.all response array
            );
        }
        return returnArr;
    };

    /**
     * @function createINTACTAjaxPromise - Parse through the gene form and create a bunch of AJAX requests to the BioGrid PSICQUIC webservice
     * @returns {Array} - array of ajax promises that return objects when resolved
     */
    AIV.createBioGridAjaxPromise = function () {
        var returnArr = []; //return an array of AJAX promises to be concatenated later
        for (let i = 0; i < this.genesList.length; i++) {
            returnArr.push(
                $.ajax({
                    url: `https://cors-anywhere.herokuapp.com/http://tyersrest.tyerslab.com:8805/psicquic/webservices/current/search/interactor/${this.genesList[i]}`, //todo: take off cors anywhere
                    type: 'GET',
                    dataType: 'text'
                })
                    .then( res => ( {res: res, ajaxCallType: 'BioGrid', queryGene: this.genesList[i]} )) //ajaxCallType for identifying when parsing Promise.all response array
            );
        }
        return returnArr;
    };

    /**
     * @function fetchGeneAnnoForTable - Take an array of AGIs and perform an ajax call to get gene summaries... then modify the DOM directly
     * @param ABIsArr
     */
    AIV.fetchGeneAnnoForTable = function(ABIsArr) {
        // console.log(ABIsArr);
        this.createGeneSummariesAjaxPromise(ABIsArr)
            .then(res => {
                for(let gene of Object.keys(res)){
                    let desc = res[gene].brief_description || "";
                    let synonyms = res[gene].synonyms;
                    let firstSyn = synonyms[0];
                    let selector = this.cy.$(`#Protein_${gene}`);
                    if (firstSyn !== null){
                        $(`.${gene}-annotate`).text(firstSyn + "\n" + `${res[gene].brief_description}`);
                        if (selector.length > 0) { // only get proteins
                            selector.data({
                                'annotatedName': firstSyn + "\n" + selector.data('name'),
                                'desc': desc,
                                'synonyms': synonyms,
                            });
                        }
                    }
                    else {
                        $(`.${gene}-annotate`).text(`${res[gene].brief_description}`);
                        if (selector.length > 0) { // only get proteins
                            selector.data({
                                'annotatedName': selector.data('name'),
                                'desc': desc,
                            });
                        }
                    }
                }
                this.cy.filter("node[id ^= 'Effector']").forEach(function(effector){
                    $(`.${effector.data('name')}-annotate`).text("null");
                });
                this.returnGeneNameCSS().update();
            })
            .catch(err => {
                alertify.logPosition("top right");
                alertify.error(`Error in gene summary fetching, ${err}`);
            });
    };

    /**
     * @function returnGeneNameCSS - return a style object such to change the labels
     * @return {Object} - cytoscape css object
     */
    AIV.returnGeneNameCSS = function(){
        return (this.cy.style()
                    .selector('node[id ^= "Protein_At"]')
                    .css({
                        'label' : 'data(annotatedName)',
                    })
        );
    };

    /**
     * @function createGeneSummariesAjaxPromise - Take in an array of AGIS and make a POST request to retrieve their gene annotations
     * @param {Array.<string>} ABIs - array of ABIs i.e. ["At5g04340","At4g30930"]
     * @returns {Object} - jQuery AJAX promise object
     */
    AIV.createGeneSummariesAjaxPromise = function(ABIs) {
        return $.ajax({
            url: "http://bar.utoronto.ca/~asher/vincent/gene_summaries_POST.php",
            type: "POST",
            data: JSON.stringify(ABIs),
            contentType: "application/json",
            dataType: "json"
        });
    };

    /**
     * @function addContextMenus - add a right click menu to the current nodes on the cy app
     */
    AIV.addContextMenus = function () {
        this.cy.contextMenus({
            menuItems: [
                {
                    id: 'remove',
                    content: '&nbsp; remove',
                    image: {src: "images/trash-can.svg", width: 12, height: 12, x: 6, y: 6},
                    selector: 'node',
                    onClickFunction: function (event) {
                        var target = event.target || event.cyTarget;
                        target.remove();
                    },
                }
            ]
        });
    };

    /**
     * @helper helperSetAttributes - helper function that sets multiple attributes in one line
     * @param {Object} el - DOM node
     * @param {Object} attrs - attribute object, eg {"src" : "www.google.ca", "data-value" : "kek"}
     */
    AIV.helperSetAttributes = function(el, attrs) {
        for(let key in attrs) {
            el.setAttribute(key, attrs[key]);
        }
    };

    // Ready to run
    $(function() {
        // Initialize AIV
        AIV.initialize();
    });
})(window, jQuery, _, cytoscape, alertify);
