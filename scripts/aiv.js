/**
 * @fileOverview AIV2, Arabidopsis Interactions Viewer Two. Main JS file that powers the front-end of AIV 2.0. Shows PPIs and PDIs and additional API data for a given gene(s).
 * @version 2.0, Dec2017
 * @author Vincent Lau (major additions, AJAX, polishing, CSS, SVGs) <vincente.lau@mail.utoronto.ca>
 * @author Asher Pasha (base app, adding nodes & edges)
 * @copyright see MIT license on GitHub
 * @description please note that I intentionally used data properties of nodes instead of classes as there is (as of cytoscape 3.2.7) no getter for classes (i.e. I cannot retrieve the classes a node has). see https://stackoverflow.com/questions/40403498/cytoscape-js-get-classes-and-return-filtered-nodes-getter-not-existent
 */
(function(window, $, cytoscape, undefined) {	
	'use strict';

    /** @namespace {object} AIV */
	var AIV = {};

    /**
	 * @namespace {object} AIV - Important hash tables to store state data and styling global data
     * @property {object} chromosomesAdded - Object property for 'state' of how many PDI chromosomes exist
	 * @property {object} genesFetched - Object property for 'state' of which gene data have been fetched (so we don't refetch)
	 * @property {object} genesFetching - Object property for 'state' of loading API gene information calls
	 * @property {boolean} mapManLoadState - Boolean property representing if mapMan AJAX call was successful
	 * @property {boolean} SUBA4LoadState - Boolean property representing if SUBA4 AJAX call was successful
     * @property {number} nodeSize - "Global" default data such as default node size
     * @property {number} DNANodeSize - Important for adjusting the donut sizes
	 * @property {number} searchNodeSize - Size for search genes
	 * @property {string} nodeDefaultColor - hexcode for regular nodes by default (no expression data)
	 * @property {Array.<string>} locCompoundNodes - this node will hopefully be filled with the parent nodes for localizations that exist on the app currently
     * @propery {boolean} coseParentNodesOnCyCore - state variable that stores whether compound nodes have been loaded onto the cy core app
     * @property {number} defaultZoom - contains a number for how much graph has been zoomed (after a layout has been ran)
     * @property {object} defaultPan - contains x and y properties for where the graph has been panned, useful for layouts
     */
    AIV.chromosomesAdded = {};
    AIV.genesFetched = {};
	AIV.genesFetching = {};
	AIV.mapManLoadState = false;
	AIV.SUBA4LoadState = false;
    AIV.nodeSize = 35;
	AIV.DNANodeSize = 55;
	AIV.searchNodeSize = 65;
	AIV.nodeDefaultColor = '#cdcdcd';
	AIV.searchNodeColor = '#ffffff';
    AIV.locCompoundNodes = [];
    AIV.coseParentNodesOnCyCore  = false;
    AIV.defaultZoom = 1;
    AIV.defaultPan = {x: 0, y:0};

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

			if (genes !== '' && $('.form-chk-needed:checked').length > 0) {
                document.getElementById('loading').classList.remove('loaded'); //remove previous loading spinner
                let iconNode = document.createElement("i");
                iconNode.classList.add('fa');
                iconNode.classList.add('fa-spinner');
                iconNode.classList.add('fa-spin');
                document.getElementById('loading').appendChild(iconNode); // add loading spinner

                $('#formModal').modal('hide'); // hide modal

                genes = AIV.formatABI(genes); //Processing very useful to keep "At3g10000" format when identifying unique nodes, i.e. don't mixup between AT3G10000 and At3g10000 and add a node twice

				AIV.genesList = genes.split("\n");

				// Clear existing data
				if (typeof AIV.cy !== 'undefined') {
					AIV.cy.destroy();

                    //reset existing built-in state data from previous query
                    AIV.chromosomesAdded = {};
                    AIV.mapManLoadState = false;
                    AIV.SUBA4LoadState = false;
                    AIV.coseParentNodesOnCyCore = false;
                    AIV.locCompoundNodes = [];
				}
				AIV.initializeCy();

				AIV.loadData();
			} else {
				window.alert('Form is incomplete!');
			}
		});

	};

    /**
	 * @namespace {object} AIV
     * @function formatABI - helper function that takes in a capitalized ABI into the one we use i.e. AT3G10000 to At3g10000
     * @param {string} ABI
     * @returns {string} - formmated ABI, i.e. At3g10000
     */
    AIV.formatABI = function (ABI){
        ABI = ABI.replace(/T/g,'t');
        ABI = ABI.replace(/G/g, 'g');
        ABI = ABI.replace(/a/g, 'A');
        return ABI;
    };

	/**
	 * @namespace {object} AIV
	 * @function getCySpreadLayout - Returns spread layout for Cytoscape
	 */
	AIV.getCySpreadLayout = function() {
		let layout = {};
		layout.name = 'spread';
		layout.minDist = 25;
		// layout.padding = 1;
        layout.boundingBox = {x1:0 , y1:0, w:this.cy.width(), h: (this.cy.height() - this.DNANodeSize) }; //set boundaries to allow for clearer PDIs (DNA nodes are locked to start at x:50,y:0)
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
        };
        return layout;
	};

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
				  	'background-color': this.nodeDefaultColor,
                    "text-wrap": "wrap", //mulitline support
                    'height': this.nodeSize,
                    'width': this.nodeSize,
                    'border-style' : 'solid',
                    'border-width' : '1px',
                    'border-color' : '#979797'
                })
			.selector('node[?searchGeneData]') //If same properties as above, override them with these values for search genes
				.style({
                    'font-size': 14,
					'z-index': 100,
                    'height' : this.searchNodeSize,
					'width'  : this.searchNodeSize,
					'background-color': this.searchNodeColor,
				})
			.selector('.filteredChildNodes') //add/(remove) this class to nodes to (un)filter display
				.style({
					'display' : 'none',
				})
			.selector('.pearsonfilterEPPI') //to hide/unhide experimentally determined elements
                .style({
                    'display' : 'none',
                })
			.selector('.pearsonAndInterologfilterPPPI') //to hide/unhide predicted determined elements
                .style({
                    'display' : 'none',
                })
  			.selector('edge')
  				.style({
					'curve-style': 'data(curveStyle)',
					'haystack-radius': 0,
					'width': 'data(edgeWidth)',
					'opacity': 0.666,
					'line-color': 'data(edgeColor)',
					'line-style': 'data(edgeStyle)',
					'control-point-distances' : '50', // only for unbunlded-bezier edges (DNA edges)
					'control-point-weights'   : '0.65',
					'target-arrow-color' : '#557e00',
                    'target-arrow-shape': 'data(arrowEdges)',
                })
			.selector('node[id ^= "DNA"]')
				.style({
                    'background-color': '#fed7ff',
                    'font-size': '1.1em',
                    "text-valign": "center",
                    "text-halign": "center",
					"border-style": "solid",
					"border-color": "#fff72d",
					"border-width": "2px",
					'shape': 'square',
					'z-index': 1000,
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
			.selector('#cytoskeletonPCT') //for compound nodes
				.style({
					'background-color': '#e8e5e5',
				})
			.selector('#cytosolPCT') //for compound nodes
                .style({
                    'background-color': '#ffe7ff',
                })
			.selector('#endoplasmicReticulumPCT') //for compound nodes
                .style({
                    'background-color': '#ff8690',
                })
			.selector('#extracellularPCT') //for compound nodes
                .style({
                    'background-color': '#ffffdb',
                })
			.selector('#golgiPCT') //for compound nodes
                .style({
                    'background-color': '#ffff8f',
                })
			.selector('#mitochondrionPCT') //for compound nodes
                .style({
                    'background-color': '#dfffff',
                })
			.selector('#nucleusPCT') //for compound nodes
                .style({
                    'background-color': '#4f81ff',
                })
			.selector('#peroxisomePCT') //for compound nodes
                .style({
                    'background-color': '#ce69ce',
                })
			.selector('#plasmaMembranePCT') //for compound nodes
                .style({
                    'background-color': '#ffd350',
                })
			.selector('#plastidPCT') //for compound nodes
                .style({
                    'background-color': '#8bff96',
                })
			.selector('#vacuolePCT') //for compound nodes
                .style({
                    'background-color': '#ffff70',
                })
        );
	};


	/**
	 * @namespace {object} AIV
     * @function initializeCy - initialize Cytoscape with some default settings
	 */
	AIV.initializeCy = function() {
		this.cy = cytoscape({
  			container: document.getElementById('cy'),

  			boxSelectionEnabled: false,

            userZoomingEnabled: false,

            autounselectify: true,

  			style: this.getCyStyle(),

			layout: {name: 'null'} //the init layout has 0 nodes so it doesn't matter what the layout is
		});
	};

	/**
	 * @namespace {object} AIV
     * @function getWidth - Get PPI edge width based on interolog confidence
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
     * @param {number} correlation_coefficient
     * @param {boolean} published
     * @param {string} index
     * @param {number} interolog_confidence
     * @returns {string} - hexcode for color
     */
	AIV.getEdgeColor = function(correlation_coefficient, published, index, interolog_confidence) {
		correlation_coefficient = Math.abs(parseFloat(correlation_coefficient)); // Make the value positive
		if (index === '2') {
			return '#557e00';
		} else if (published) { //published PPIs not published PDIs
			return '#99cc00';
		} else if (interolog_confidence < 0){
			return '#041959';
		} else if (correlation_coefficient > 0.8) {
			return '#ac070e';
		} else if (correlation_coefficient > 0.7) {
			return '#da4e2f';
		} else if (correlation_coefficient > 0.6) {
			return '#ea801d';
		} else if (correlation_coefficient > 0.5) {
			return '#f5d363';
		} else if (correlation_coefficient <= 0.5) {
			return '#acadb4';
		} else {
			return '#000000';
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
			{ group: "nodes", data: {id: node_id, name: node, searchGeneData : searchGene}} //nodes now have a property 'id' denoted as Protein_At5g20920 (if user inputed 'At5g20920' in the textarea)
		]);
    };

    /**
	 * @function addCompoundNode - generic function to add compound nodes to the cy core
     * @param idOfParent - id of compound node, 'id'
     * @param nameOfParent - name of the compound node that will be the label
     */
	AIV.addCompoundNode = function(idOfParent, nameOfParent){
		let temp = AIV.cy.add({
			group: "nodes",
			data: {
				id : idOfParent,
				name: nameOfParent,
                compoundNode: true, //data property used instead of a class because we cannot remove parent nodes by classes for some reason (cytoscapejs bug?)
			},
		});
		// console.log("temp", temp);
	};

    /**
     * @function addLocalizationCompoundNodes - specifically add compound nodes to cy core by going into our localization state variable
     */
    AIV.addLocalizationCompoundNodes = function(){
        for (let i = 0; i < this.locCompoundNodes.length; i++) {
            // console.log(this.locCompoundNodes[i]);
            let locationBeautified = this.beautifiedLocalization(this.locCompoundNodes[i]);
            this.addCompoundNode(this.locCompoundNodes[i], locationBeautified);
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
        // console.log("what is this? kek", this.cy.elements('node[ id ^= "Protein_"]').size());
        let oldEdges = this.cy.elements('edge');
        oldEdges.remove();
        let oldNodes = this.cy.elements('node[ id ^= "Protein_"]');
		oldNodes.remove();

        let newNodes = [];

        // console.log("what is this? lol", oldNodes.size());
        oldNodes.forEach(function(oldNode, i){
        	let newData = Object.assign({}, oldNode.data()); // let us make a copy of the previous object not directly mutate it. Hopefully the JS garbage collector will clear the memory (possible TODO ?)
        	newData.parent = oldNode.data("localizationMajority");
            // console.log(i, oldNode.data());
        	// console.log(i, newData);
        	newNodes.push({
				group: "nodes",
				data: newData,
			});
		});

        this.cy.add(newNodes);
        oldEdges.restore();
	};

    /**
	 * Take in an object (interaction) data and add it to the 'global' state
	 *
     * @param {object} DNAObjectData - as the interaction data as it comes in the GET request i.e.
	 *                                 {source: .., target:.., index: 2, ..}
     */
	AIV.addDNANodesToAIVObj = function(DNAObjectData) {
	    var chrNum = DNAObjectData.target.charAt(2).toUpperCase(); //if it was At2g04880 then it'd '2'
	    var name = chrNum; // Just for 'm' and 'c'

	    if (chrNum === "M") {
	        name = "Chloroplast";
        }
        else if (chrNum === "C"){
	        name = "Mitochondria";
        }

        // console.log("addDNANodes", DNAObjectData, "chrNum");
	    if (AIV.chromosomesAdded.hasOwnProperty(chrNum)){
            // console.log("chromosome property already added");
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
                        name: "Chr-" + chrName
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
	 * @param {string} colour - as the edge colour as a hexcode i.e. "#557e00"
	 * @param {string} style - as whether dashed or solid i.e. "solid"
	 * @param {string} width - as width of the edge as a string of a number i.e. "5"
	 * @param {string} reference - as (if it exists) a published string of the DOI or Pubmed, etc. i.e. " "doi:10.1038/msb.2011.66"" or "None"
	 * @param {boolean} published - to whether this is published interaction data i.e. true
	 * @param {number | string} interologConfidence  - interolog confidence number, can be negative to positive, or zero (means experimentally validated prediction) i.e. -2121
	 * @param {string} databaseSource - where did this edge come from ? i.e. "BAR"
	 * @param {number | string | null} R - the correlation coefficient of the coexpression data (microarray)
	 */
	AIV.addEdges = function(source, typeSource, target, typeTarget, colour, style, width, reference, published, interologConfidence, databaseSource, R) {
		// let edge_id = typeSource + '_' + source + '_' + typeTarget + '_' + target;
		source = typeSource + '_' + source;
		target = typeTarget + '_' + target;
        let edge_id = source + '_' + target;
		this.cy.add([
			{
				group: "edges",
				data:
				{
					id: edge_id,
					source: source,
					target: target,
					edgeColor: colour,
					edgeStyle: style,
					edgeWidth: width,
					published: published,
					reference: published ? reference : false,
                    interologConfidence: interologConfidence,
					curveStyle: typeTarget === "DNA" ? "unbundled-bezier" : "haystack",
					arrowEdges: typeTarget === "DNA" ? "triangle" : "none",
					databaseOrigin: databaseSource,
					pearsonR: R,
 				},
			}
		]);
	};

	/**
	* This function will take the name property of a DNA Chr node and parse it nicely for display
	* on the cy core
	 */
	AIV.addNumberOfPDIsToNodeLabel = function () {
        for (let chr of Object.keys(this.chromosomesAdded)) {
        	let prevName = this.cy.getElementById(`DNA_Chr${chr}`).data('name');
			this.cy.getElementById(`DNA_Chr${chr}`)
				.data('name', `${prevName + "\n" + this.chromosomesAdded[chr].length} PDIs`);
        }
	};

	/**
	 * @namespace {object} AIV
	 * @function setDNANodesPosition - Lock the position of the DNA nodes at the bottom of the cy app
	 */
	AIV.setDNANodesPosition = function () {
        var xCoord = 50;
        var viewportWidth = this.cy.width();
        this.cy.$("node[id ^='DNA_Chr']:locked").unlock(); //if locked (for example during hide settings, unlock)
        var numOfChromosomes = Object.keys(this.chromosomesAdded).length; //for A. th. the max would be 7
        for (let chr of Object.keys(this.chromosomesAdded)) {
            this.cy.getElementById(`DNA_Chr${chr}`).position({x: xCoord, y: this.cy.height() - (this.DNANodeSize/2 + 5) });
            this.cy.getElementById(`DNA_Chr${chr}`).lock(); //hardset the position of chr nodes to bottom
            xCoord += viewportWidth/numOfChromosomes;
        }
    };

	/**
	 * @namespace {object} AIV
	 * @function createPDITable - We need to return a nicely formatted HTML table to be shown in the DNA tooltip. Take in an array of DNA interactions to be parsed and put appropriately in table tags
	 * @param {object[]} arrayPDIdata - array of interaction data i.e. [ {source: .., target:.., index: 2, ..}, {}, {}]
	 * @returns {string} - a nicely parsed HTML table
	 */
	AIV.createPDItable = function (arrayPDIdata) {
		// console.log(arrayPDIdata);
		var PDIsInChr = {};
		var targets = [];
		var pubmedRefHashTable = {};
        var htmlTABLE = "<div class='pdi-table-scroll-pane'><table><tbody><tr><th></th>";
        arrayPDIdata.forEach(function(PDI){ //populate local data to be used in another loop
			// console.log("looping through each element of PDI array", PDI);
			if (!PDIsInChr.hasOwnProperty(PDI.source)) {
                PDIsInChr[PDI.source] = []; //create property with name of query/source gene
			}
			PDIsInChr[PDI.source].push(PDI.target);
			if (targets.indexOf(PDI.target) === -1) {//To not repeat PDI for two queries with same PDI
                targets.push(PDI.target);
            }
            pubmedRefHashTable[`${PDI.source}_${PDI.target}`] = PDI.reference;
		});
        // console.log(pubmedRefHashTable, "pubmed ref hashtable");
        for (let protein of Object.keys(PDIsInChr)) { //add query proteins to the header of table
			htmlTABLE += `<th>${protein}<br>(${PDIsInChr[protein].length} PDIs)</th>`;
		}
        htmlTABLE += "</tr>";
		targets.forEach(function(targetDNAGene){ //process remaining rows for each target DNA gene
			htmlTABLE += `<tr><td>${targetDNAGene}</td>`;
            for (let protein of Object.keys(PDIsInChr)) {
                if (PDIsInChr[protein].indexOf(targetDNAGene) !== -1) { //indexOf returns -1 if not found
					let cellContent = "<td>";
					AIV.sanitizeReferenceIDs(pubmedRefHashTable[protein + '_' + targetDNAGene]).forEach(function(ref){
                        cellContent += AIV.returnReferenceLink(ref, targetDNAGene).replace(/('_blank'>).*/, "$1") +
							'<i class="fas fa-external-link-alt fa-lg"></i>' +
							'</a>';
					});
                    htmlTABLE += cellContent + '</td>';
                }
				else {
                	htmlTABLE += '<td><i class="fas fa-times fa-lg" style="color: red;"></i></td>';
				}
            }
			htmlTABLE += "</tr>";
		});
		htmlTABLE += "</tbody></table></div>";
		// console.log("finished createPDITable function execution", PDIsInChr);
        return htmlTABLE;
    };

	/**
	 * @namespace {object} AIV
	 * @function addChrNodeQTips -  Add qTips (tooltips) to 'Chromosome' Nodes
	 * Note we have to run a for loop on this to check where to add the qTips.
	 * Moreover the text is created from another function which will nicely return a HTML table
	 */
	AIV.addChrNodeQtips = function () {
        var that = this;
        for (let chr of Object.keys(this.chromosomesAdded)){
            // console.log(this.chromosomesAdded[chr], `chr${chr}`);
            this.cy.on('mouseover', `node[id^='DNA_Chr${chr}']`, function(event){
                var chrNode = event.target;
                // console.log(`You're hovering over chr ${chr}`);
                chrNode.qtip(
                    {
                        content:
                            {
                                title :
									{
                                		text :`Chromosome ${chr}`,
										button: 'Close' //close button
									},
                                text: that.createPDItable(that.chromosomesAdded[chr])
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
            var protein = event.target;
            // console.log(protein.data());
            protein.qtip(
                {
                    overwrite: false, //make sure tooltip won't be overriden once created
                    content  : {
                    				title :
										{
                    						text : "Protein " + protein.data("name"),
											button: 'Close'
                                    	},
									text :
                                    //Use jquery AJAX method which uses promises/deferred objects in conjunction with qTip built-in api.set() method which allows one to set the options of this qTip. Default value while loading is plain text to notify user.
                                        function(event, api) {
                                            // console.log(`AJAX protein data call for ${protein.data("name")}`);
                                            if (AIV.genesFetched[protein.data("name")] !== undefined){ //Check with state variable to reload our fetched data stored in global state
                                                return AIV.genesFetched[protein.data("name")]; //return the stored value as the text value to the text property
                                            }

                                            if (AIV.genesFetching[protein.data("name")] === true){ //Check with state variable to see if current gene data is already fetching
                                                return '<p>Fetching Protein Data...</p>' + AIV.showMapMan(protein) + AIV.showSUBA4(protein); // TODO: remove the AIV.showMapMan(protein) and AIV.showSUBA4(protein) once we upload a working API to the bar
                                            }
                                            else {
                                                AIV.genesFetching[protein.data("name")] = true;

                                                $.ajax({
                                                    url: `https://cors-anywhere.herokuapp.com/http://bar.utoronto.ca/webservices/bar_araport/gene_summary_by_locus.php?locus=${protein.data("name")}` // Use data-url attribute for the URL TODO: remove cors now when uploaded to server
                                                })
                                                    .then(function (content) {
                                                        var returnHTML = "";
                                                        // Set the tooltip content upon successful retrieval, use deep destructuring with spread syntax
                                                        var {result: [{locus: locus, synonyms: synonyms, brief_description: desc}]} = content;
                                                        returnHTML +=
                                                            `<p>Locus: ${locus}</p>` +
                                                            `<p>Alias: ${synonyms.length > 0 ? synonyms.join(', ') : "N/A" }</p>` +
                                                            `<p>Annotation: ${desc}</p>` +
															AIV.showMapMan(protein) +
															AIV.showSUBA4(protein);
                                                        api.set('content.text', returnHTML);
                                                        AIV.genesFetching[protein.data("name")] = false; //reset loading state
                                                        AIV.genesFetched[protein.data("name")] = returnHTML; //add to global state such that we do not need to refetch, i.e. only if successful
                                                    })
                                                    .fail(function (xhr, status, error) {
                                                        // Upon failure, set the tooltip content to status and error value
                                                        console.error(xhr, status, error);
                                                        if (xhr.toString().match(/^.*TypeError.*$/)) { //For when we get a response from the API call but it does not have a the expected JSON structure
                                                            api.set('content.text', "<p> Problem loading data... Gene querying web service likely down.</p>" + AIV.showMapMan(protein) + AIV.showSUBA4(protein) );
                                                        }
                                                        else {
                                                            api.set('content.text', "<p> Problem loading data... Status code: " + status + ' : ' + error + "</p>" + AIV.showMapMan(protein) + AIV.showSUBA4(protein) );
                                                        }
                                                        AIV.genesFetching[protein.data("name")] = false; //reset loading state
                                                    });
                                            }

                                            return '<p>Fetching Protein Data...</p>' + AIV.showMapMan(protein) + AIV.showSUBA4(protein); // Set some initial text TODO: remove the AIV.showMapMan(protein) and AIV.showSUBA4(protein) once we upload a working API to the bar
                                        }

								},
                    style    : { classes : 'qtip-light qtip-protein-node'},
                    show:
                        {
                            solo : true,
                            event: `${event.type}`, // Use the same show event as triggered event handler
                            ready: true, // Show the tooltip immediately upon creation
                            delay: 400 //Don't hammer servers w/ AJAX calls as user scrolls over the PPIs
                        },
                    hide : false
                }
            );
        });
    };

    /**
	 * @function showMapMan - helper function to decide whether or not to show MapMan on protein qTip
	 * @param {object} protein - reference to the particular protein which we are adding a qTip
     */
    AIV.showMapMan = function(protein) {
		if (this.mapManLoadState === false){ return ""; }
		var baseString = "";
        for (let i = 1; i < ( protein.data('numOfMapMans') + 1 ) ; i++) {
            baseString += `<p> MapMan Code ${i} : ` + protein.data('MapManCode' + i) + '</p>' + `<p> MapMan Annotation ${i} : ` + protein.data('MapManName' + i) + '</p>';
        }
        // console.log(baseString);
        return baseString;
	};

    /**
     * @function showSUBA4 - helper function to decide whether or not to show SUBA4 html table on protein qTip
     * @param {object} protein - reference to the particular protein which we are adding a qTip
     */
    AIV.showSUBA4 = function(protein) {
        if (this.SUBA4LoadState === false){ return ""; }
        var baseString = "";
        if (protein.data('cytoskeletonPCT')){ baseString += `<p> Cytoskeleton loc. : ${(protein.data('cytoskeletonPCT')*100).toFixed(2)}% </p>`;}
        if (protein.data('cytosolPCT')){ baseString += `<p> Cytosol loc. : ${(protein.data('cytosolPCT')*100).toFixed(2)}% </p>`;}
        if (protein.data('endoplasmicReticulumPCT')){ baseString += `<p> Endo. Reticulum loc. : ${(protein.data('endoplasmicReticulumPCT')*100).toFixed(2)}% </p>`;}
        if (protein.data('extracellularPCT')){ baseString += `<p> Extracellular Matrix loc. : ${(protein.data('extracellularPCT')*100).toFixed(2)}% </p>`;}
        if (protein.data('golgiPCT')){ baseString += `<p> Golgi loc. : ${(protein.data('golgiPCT')*100).toFixed(2)}% </p>`;}
        if (protein.data('mitochondrionPCT')){ baseString += `<p> Mitochondrion loc. : ${(protein.data('mitochondrionPCT')*100).toFixed(2)}% </p>`;}
        if (protein.data('nucleusPCT')){ baseString += `<p> Nucleus loc. : ${(protein.data('nucleusPCT')*100).toFixed(2)}% </p>`;}
        if (protein.data('plasmaMembranePCT')){ baseString += `<p> Plasma Membrane loc. : ${(protein.data('plasmaMembranePCT')*100).toFixed(2)}% </p>`;}
        if (protein.data('peroxisomePCT')){ baseString += `<p> Peroxisome loc. : ${(protein.data('peroxisomePCT')*100).toFixed(2)}% </p>`;}
        if (protein.data('plastidPCT')){ baseString += `<p> Plastid loc. : ${(protein.data('plastidPCT')*100).toFixed(2)}% </p>`;}
        if (protein.data('vacuolePCT')){ baseString += `<p> Vacuole loc. : ${(protein.data('vacuolePCT')*100).toFixed(2)}% </p>`;}

        // console.log(baseString);
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
	 * @param {string} dbSource - where did the PPI come from i.e. "BAR"
     */
    AIV.createPPIEdgeText = (source, target, reference, interologConf, dbSource) => {
        let modifyProString = string => string.replace(/PROTEIN_/gi, '').toUpperCase();

        var refLinks = `<p>Database: ${dbSource}</p>`;
        if (reference) { //non-falsy value (we may have changed it to false in the addEdges() call)
            AIV.sanitizeReferenceIDs( reference ).forEach(function(ref){
                refLinks += '<p> Ref: ' + AIV.returnReferenceLink(ref, source) + '</p>';
            });
        }

        if (interologConf >= 0 ) {
            return refLinks; //can be "" or have a bunch of links..., "NA" should return ""
        }
        else { //if interlog confidence is less than zero, show external docker link
            return "<p><a href='http://bar.utoronto.ca/~rsong/formike/?id1=" + modifyProString(source) + "&id2=" + modifyProString(target) + "' target='_blank'> " + "Predicted Structural Interaction " + "</a></p>" + refLinks;
        }
    };


    /**
	 * @namespace {object} AIV
     * @function addPPIEdgeQtips - Add qTips (tooltips) to protein protein interaction edges
     */
    AIV.addPPIEdgeQtips = function() {
        var that = this;
        this.cy.on('mouseover', 'edge[source^="Protein"][target^="Protein"]', function(event){
        	var ppiEdge = event.target;
        	// console.log(ppiEdge.data());
        	ppiEdge.qtip(
				{
                    content:
                        {
                            title:
								{
                            		text: ppiEdge.data("source").replace("_", " ") + " to " + ppiEdge.data("target").replace("_", " "),
									button: "Close"
                            	},
							text : that.createPPIEdgeText( ppiEdge.data("source"), ppiEdge.data("target"), ppiEdge.data("reference"), ppiEdge.data('interologConfidence'), ppiEdge.data('databaseOrigin') ) +
							(ppiEdge.data("interologConfidence") > 0 ? "<p>Interolog Confidence:" + ppiEdge.data("interologConfidence") + "</p>" : "") +
							"<p>Correlation Coefficient:" + ppiEdge.data("pearsonR") + "</p>", //the ternary operator here is to make sure we're returning the interolog confidence value not the SPPI rank
                        },
                    style  : { classes : 'qtip-light qtip-ppi-edge' },
                    show:
                        {
                            solo : true,
                            event: `${event.type}`, // Use the same show event as triggered event handler
                            delay: 200
                        },
                    hide : false
				}
			);
		});
    };

    /**
	 * @namespace {object} AIV
     * @function sanitizeReferenceIDs - Process the pubmed IDs and DOIs that come in from the GET request. This will return an array of links (as strings). We have to check for empty strings before returning.
     *
     * @param {string} JSONReferenceString - as a string of links delimited by newlines "\n"
     */
    AIV.sanitizeReferenceIDs = function(JSONReferenceString) {
        var returnArray = JSONReferenceString.split("\n");
        returnArray = returnArray.filter(item => item !== '');
        // console.log("sanitized ,", returnArray);
        return returnArray;
    };

    /**
	 * @namespace {object} AIV
	 * @function returnReferenceLink -
     * This function expects to receive a string which either 'references' a
     * 1) PubMedID (PubMed)
     * 2) MINDID (Membrane based Interacome Network) ** We use ABIIdentifier for this as MIND search query does not go by Id.. **
     * 3) AI-1 ID (Arabidopsis interactome project)
     * 4) DOI reference hotlink
     * 5) BINDID (Biomolecular Interaction Network Database, NOTE: Not live as of Nov 2017)
     *
     * @param {string} referenceStr - as the link given to the function that could be any the of above or none
     * @param {string} ABIIdentifier - is used for the biodb link
	 * @return {string} - a link from the above list
     */
    AIV.returnReferenceLink = function(referenceStr, ABIIdentifier) {
    	var regexGroup; //this variable necessary to extract parts from the reference string param
    	if ( (regexGroup = referenceStr.match(/^PubMed[:]?(\d+)$/i)) ) { //assign and evaluate if true immediately
            return `<a href="https://www.ncbi.nlm.nih.gov/pubmed/${regexGroup[1]}" target='_blank'> PMID ${regexGroup[1]}</a>`;
        }
		else if ( (regexGroup = referenceStr.match(/^Mind(\d+)$/i)) ){
            return `<a href="http://biodb.lumc.edu/mind/search_results.php?text=${ABIIdentifier}&SubmitForm=Search&start=0&count=25&search=all" target="_blank"> MIND ID ${regexGroup[1]}</a>`;
		}
		else if ( (regexGroup = referenceStr.match(/^AI-1.*$/i)) ){
			return `<a href="http://interactome.dfci.harvard.edu/A_thaliana/index.php" target="_blank">  (A. th. Interactome) ${referenceStr} </a>`;
		}
		else if ( (regexGroup = referenceStr.match(/doi:(.*)/i)) ){
			return `<a href="http://dx.doi.org/${regexGroup[1]}" target="_blank"> DOI ${regexGroup[1]} </a>`;
		}
		else if ( (regexGroup = referenceStr.match(/(\d+)/)) ) { //for BIND database (now closed)
			return `<a href="https://academic.oup.com/nar/article/29/1/242/1116175" target="_blank">BIND ID ${referenceStr}</a>`;
		}
	};

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
		for (var i = 0; i < this.genesList.length; i++) {

			let dataSubset = data[this.genesList[i]]; //'[]' expression to access an object property

			// console.log(dataSubset);

			// Add Nodes for each query. We skip the last one because that is the recursive flag
			for (let j = 0; j < dataSubset.length - 1; j++) {
				let typeSource = '';
				let typeTarget = '';
				let edgeColour = '#000000';	 // Default color of Black
				let style = 'solid'; // Default solid line style
				let width = '5'; // Default edge width
				let EdgeJSON = dataSubset[j]; // Data from the PHP API comes in the form of an array of PPIs/PDIs hence this variable name

				// Source, note that source is NEVER DNA
				if (EdgeJSON.source.match(/^At/i)) {
					typeSource = 'Protein';
				} else {
					typeSource = 'Effector';
				}

				// Target
				if (EdgeJSON.target.match(/^At/i)) {
					if (EdgeJSON.index === '2') {
						typeTarget = 'DNA';
					} else {
						typeTarget = 'Protein';
					}
				} else {
					typeTarget = 'Effector';
				}

				EdgeJSON.interolog_confidence = Number(EdgeJSON.interolog_confidence); //Mutating string into number as the JSON gives "-1000" instead of -1000

                EdgeJSON.correlation_coefficient = Number(EdgeJSON.correlation_coefficient); //Mutating string into number as the JSON gives "-0.2" instead of -0.2

				// Get color
				edgeColour = this.getEdgeColor(EdgeJSON.correlation_coefficient, EdgeJSON.published, EdgeJSON.index, EdgeJSON.interolog_confidence);

				// Get Line Style
				style = ((EdgeJSON.published) ? "solid" : "dashed"); //TODO: talk with Nick/Asher to use interolog confidence or publsihed flag

				// Get Line Width
				width = this.getWidth(EdgeJSON.interolog_confidence);

				if (typeTarget === "Protein" || typeTarget === "Effector") {
                    if ( AIV.cy.getElementById(`${typeSource}_${EdgeJSON.source}`).empty()) { //only add source node if not already on app, recall our ids follow the format Protein_At2g10000
                        this.addNode(EdgeJSON.source, typeSource);
                    }
                    if ( AIV.cy.getElementById(`${typeTarget}_${EdgeJSON.target}`).empty()) {
                        this.addNode(EdgeJSON.target, typeTarget);
                    }
				} else { //i.e. typeTarget === "DNA"
				    this.addDNANodesToAIVObj(EdgeJSON); //pass the DNA in the JSON format we GET on
                }

				if (EdgeJSON.index !== '2') { //i.e. PPI edge
					this.addEdges(EdgeJSON.source, typeSource, EdgeJSON.target, typeTarget, edgeColour, style, width, EdgeJSON.reference, EdgeJSON.published, EdgeJSON.interolog_confidence, "BAR", EdgeJSON.correlation_coefficient);
				}
				else if ( EdgeJSON.index === '2' && (this.cy.getElementById(`${typeSource}_${EdgeJSON.source}_DNA_Chr${EdgeJSON.target.charAt(2)}`).length === 0) ) { //Check if PDI edge (query gene & chr) is already added, if not added
                    this.addEdges(EdgeJSON.source, typeSource, `Chr${EdgeJSON.target.charAt(2)}`, typeTarget /*DNA*/, edgeColour, style, width, EdgeJSON.reference, EdgeJSON.published, EdgeJSON.interolog_confidence, "BAR", EdgeJSON.correlation_coefficient);
				}
			}
		} //end of adding nodes and edges

	};

    /**
	 * @namespace {object} AIV
	 * @function - parsePSICQUICInteractionsData - Take in the PSICQUICdata param which is the text response we get back from the AJAX call and parse it via regex (based on whether it is from INTACT or BioGrid). Then add unique edges and nodes.
     * @param {string} PSICQUICdata - should be a bunch of PSICQUIC formatted text
     * @param {string} queryGeneAsABI - should be something like "At3g10000"
     * @param {string} INTACTorBioGrid - should either be "INTACT" or "BioGrid"
     */
    AIV.parsePSICQUICInteractionsData = function(PSICQUICdata, queryGeneAsABI, INTACTorBioGrid){
        // INTACT and BioGrid PPIs are experimentally validated by default hence these 3 colors, style, width
    	let edgeColour = '#99cc00';
        let style = 'solid';
        let width = '11';

        // console.log(PSICQUICdata);
        // console.log("queryGene:", queryGeneAsABI);

		let regex;
		if (INTACTorBioGrid === "INTACT") {
			// example uniprotkb:(?!At3g18130)(At\d[gcm]\d{5})\(locus.*(pubmed:\d+)
            regex = new RegExp("uniprotkb:(?!" + queryGeneAsABI +")(At\\d[gcm]\\d{5})\\(locus.*(pubmed:\\d+)", "gi");
		}
		else if (INTACTorBioGrid === "BioGrid"){
			// example \|entrez gene\/locuslink:(?!At3g18130)(At\d[gcm]\d{5})[\t|].*(pubmed:\d+)
			regex = new RegExp("\\|entrez gene\\/locuslink:(?!" + queryGeneAsABI + ")(At\\d[gcm]\\d{5})[\\t|].*(pubmed:\\d+)", "gi");
		}

		let match;
		let arrPPIsProteinsRaw = []; // array will be populated with ABI identifiers of genes that interact with the queryGeneAsABI via regex...
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
            arrPPIsProteinsRaw.push( AIV.formatABI ( match[1] ) ); //look for second captured group, i.e. "At2g10000"
			pubmedIdArr.push(match[2]); //look for third captured group (i.e. "23667124")
        }

        let arrPPIsProteinsUnique = arrPPIsProteinsRaw.filter(function(item, index, selfArr){ //delete duplicates
            return index === selfArr.indexOf(item);
        });

        // console.log(arrPPIsProteinsUnique);

        /*
        Loop through each PPI interaction and add the corresponding edge
        Need index to add PubMedID (as far as we know there is only one pubmed ID per interaction) so we can simply map out the index.
        Note we check if an edge already exists as there seems to be rarely a duplicate in the PSICQUIC response data
         */
        arrPPIsProteinsUnique.forEach(function(proteinItem, index){
            if ( AIV.cy.getElementById(`Protein_${proteinItem}`).empty()) { //Check if node already on cy core (don't need to do an array check as form nodes added in the then() after the Promise.all)
                AIV.addNode(proteinItem, "Protein");
            }
            if ( AIV.cy.getElementById(`Protein_${queryGeneAsABI}_Protein_${proteinItem}`).empty() ) { //Check if edge already added
                    AIV.addEdges( queryGeneAsABI, "Protein", proteinItem, "Protein", edgeColour, style, width, pubmedIdArr[index], true, 0, INTACTorBioGrid, null ); // 0 represents experimentally validated in our case and we leave R as null
			}
		});

    };

	/**
	 * @namespace {object} AIV
	 * @function returnLocalizationPOSTJSON - Create and return SUBA URL string for AJAX call
	 * @returns {string} - a string to build the URL
	 */
	AIV.returnLocalizationPOSTJSON = function(){

	    var reqJSON =
			{
				AGI_IDs : [],
			};
        this.cy.filter("node[name ^= 'At']").forEach(function(node){
            var nodeID = node.data('name');
            if (nodeID.match(/^AT[1-5MC]G\d{5}$/i)) { //only get ABI IDs, i.e. exclude effectors
                reqJSON.AGI_IDs.push( nodeID );
            }
        });

        reqJSON.include_predicted = ($('#predSUBA').is(':checked')); //true or false

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

		SUBADATA.forEach(function(geneSUBAData){
			var denoTotal = 0;

			if (typeof geneSUBAData.data !== "undefined"){ //For nodes without any localization data
                // for loop creates a denominator score for each gene, so we can count pie chart data
                for (let cellularLocation of Object.keys(geneSUBAData.data)) {
                    // console.log(geneSUBAData.id, cellularLocation, geneSUBAData.data[cellularLocation]);
                    if (! isNaN(geneSUBAData.data[cellularLocation])){ //if property value is a number...
                        denoTotal += geneSUBAData.data[cellularLocation]; //add to denominator
                        // console.log("TRUE!");
                    }
                }
			}
            // console.log(geneSUBAData.id, "total :", denoTotal);

			var nodeID = "A" + geneSUBAData.id.substring(1).toLowerCase(); //AT1G04170 to At1g04170
            if (typeof geneSUBAData.data !== "undefined"){
                AIV.cy.$('node[name = "' + nodeID + '"]')
					.data({
                        predictedSUBA :  ( geneSUBAData.includes_predicted === "yes" ),
                        experimentalSUBA : ( geneSUBAData.includes_experimental === "yes" ),
                        cytoskeletonPCT : countLocScore ( geneSUBAData.data.cytoskeleton, denoTotal ),
                        cytosolPCT : countLocScore ( geneSUBAData.data.cytosol, denoTotal ),
                        endoplasmicReticulumPCT : countLocScore ( geneSUBAData.data['endoplasmic reticulum'], denoTotal ),
                        extracellularPCT : countLocScore ( geneSUBAData.data.extracellular, denoTotal ),
                        golgiPCT : countLocScore ( geneSUBAData.data.golgi, denoTotal ),
                        mitochondrionPCT : countLocScore ( geneSUBAData.data.mitochondrion, denoTotal ),
                        nucleusPCT : countLocScore ( geneSUBAData.data.nucleus, denoTotal ),
                        peroxisomePCT : countLocScore ( geneSUBAData.data.peroxisome, denoTotal ),
                        plasmaMembranePCT : countLocScore ( geneSUBAData.data['plasma membrane'], denoTotal ),
                        plastidPCT : countLocScore ( geneSUBAData.data.plastid, denoTotal ),
                        vacuolePCT : countLocScore ( geneSUBAData.data.vacuole, denoTotal ),
					});
            }

		});

		AIV.cy.endBatch();

        /**
		* @function countLocScore - helper function to return percentages (note that it will be .98 rather than 98) and typecheck
		*
		* @param {number} localizationScore - as the absolute score we receive from the response JSON
		* @param {number} deno - as the calculated total denominator from all the various scores of different locations
		*/
		function countLocScore (localizationScore, deno){
			if (localizationScore === undefined){
				return 0;
			}
			else {
				return (localizationScore/deno);
			}
		}
    };

	/**
	 * @namespace {object} AIV
	 * @function createSVGPIeDonutCartStr -
	 * This function will take in all the 'PCT' data properties that a node has (for example, nucleusPCT)
	 * to be used to create a SVG donut string which will be set as the background image. I intentionally
	 * made this function based on the AIV.nodeSize property such that it can be more scalable (literally
	 * and figuratively).
	 *
	 * @param {object} ABIGene - takes in a reference to a node, particularly a ABI gene to parse through its 'PCT' properties.
	 *
	 * Credits to: https://medium.com/@heyoka/scratch-made-svg-donut-pie-charts-in-html5-2c587e935d72
	 */
	AIV.createSVGPieDonutCartStr = function(ABIGene) {
		var ABIGeneData = ABIGene.data() ;
		var cyNodeSize = Number(ABIGene.style('height').slice(0, -2)); //Get the size of the node, change from '35px' {string} to 35 {number}
		var SVGwidthheight = cyNodeSize + 10;
		var donutCxCy = SVGwidthheight/2;
        var radius, strokeWidth;
		radius = strokeWidth = cyNodeSize/2;
		var SVGstr = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg>';
		SVGstr += `<svg width="${SVGwidthheight}" height="${SVGwidthheight}" class="donut" xmlns="http://www.w3.org/2000/svg">`;
		SVGstr += `<circle class="donut-hole" cx="${donutCxCy}" cy="${donutCxCy}" r="${radius}" fill="transparent"></circle>`;

		//The below donut segment will appear for genes without SUBA data... it will be all grey
		SVGstr += `<circle class="donut-unfilled-ring" cx="${donutCxCy}" cy="${donutCxCy}" r="${radius}" fill="transparent" stroke="#56595b" stroke-width="${strokeWidth}" display="block"></circle>`;

		// Figure out which 'PCT' properties are greater than zero and then programatically add them
		// as donut-segments. Note that some calculations are involved based
		// on the set node size (the example given on the tutorial is based on a 100px C and 15.91 radius)
        var scaling = radius/15.91549430918952;
		var pctAndColorArray = [];

        for ( let dataProp of Object.keys(ABIGeneData) ) {
        	if (dataProp.match(/^.*PCT$/i) && ABIGeneData[dataProp] > 0 ){ //get PCT props and if > 0%
        		// console.log("match!");
        		// console.log(dataProp, ABIGeneData.name);
        		pctAndColorArray.push({
					pct : (ABIGeneData[dataProp] * 100), //convert to % for easier parsing later
					loc : dataProp,
					color : returnLocColor(dataProp)
        		});
			}
        }
        // Custom sort based on the value of the 'pct' property defined above, order greatest to least
		// Result => we are able to show pie chart values from greatest to least starting from 12 oclock
        pctAndColorArray.sort((itemOne, itemTwo) => itemTwo.pct - itemOne.pct);

        // Set a localization data property in the node (highest percent is assumed to be the localization)
		if (pctAndColorArray.length === 0){
            ABIGene.data('localization', "Unknown");
        }
        else { //remove 'PCT'
			ABIGene.data({
                localization : this.beautifiedLocalization(pctAndColorArray[0].loc),
                localizationMajority : pctAndColorArray[0].loc, //have this data for making compound nodes
			});
            if (this.locCompoundNodes.indexOf(pctAndColorArray[0].loc) === -1 ){
				this.locCompoundNodes.push(pctAndColorArray[0].loc); // append to our state variables which (majority) localizations nodes have, useful for compound nodes
			}
        }

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
		// console.log(SVGstr, ABIGeneData.name);
        SVGstr = 'data:image/svg+xml;utf8,' + encodeURIComponent(SVGstr); // Modify for CSS via cytoscape
        ABIGene.data('svgDonut', SVGstr); // Last, properly mutate the node with our made SVG string

        // Helper function to determine/return which colour to return in the array of objects above
        function returnLocColor (localizationString) {
			if (localizationString === "cytoskeletonPCT"){ return '#575454';}
			else if (localizationString === "cytosolPCT"){ return '#e0498a';}
            else if (localizationString === "endoplasmicReticulumPCT"){ return '#d1111b';}
            else if (localizationString === "extracellularPCT"){ return '#ffd672';}
            else if (localizationString === "golgiPCT"){ return '#a5a417';}
            else if (localizationString === "mitochondrionPCT"){ return '#41abf9';}
            else if (localizationString === "nucleusPCT"){ return '#0032ff';}
            else if (localizationString === "peroxisomePCT"){ return '#650065';}
            else if (localizationString === "plasmaMembranePCT"){ return '#edaa27';}
            else if (localizationString === "plastidPCT"){ return '#13971e';}
            else if (localizationString === "vacuolePCT"){ return '#ecea3a';}
        }

	};

    /**
	 * @namespace {object} AIV
	 * @function beautifiedLocalization - helper function that beautifes strings, especially from localizations to more reader friendly text
     * @param {string} dirtyString - take in 'plasmaMembranePCT'
     * @returns {string} - beautufied string with format such as Plasma Membrane
     */
	AIV.beautifiedLocalization = function (dirtyString) {
        var beauty = dirtyString.substring(0, dirtyString.length-3); // remove PCT
        beauty = beauty.replace(/([A-Z])/g, ' $1').trim(); // add spaces after capitals
        beauty = beauty.charAt(0).toUpperCase() + beauty.slice(1); //capitalize first letter
        return beauty;
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
     * @namespace {object} AIV
     * @function hideDonuts - un/hides donuts by changing display attribute inside the svg
     * @param {boolean} hide - boolean to determine if we are hiding or not
     */
    AIV.hideDonuts = function(hide) {
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
		var mapmanURL = "https://bar.utoronto.ca/~asher/bar_mapman.php?request=[";
        this.cy.filter("node[name ^= 'At']").forEach(function(node){
            var nodeID = node.data('name');
            if (nodeID.match(/^AT[1-5MC]G\d{5}$/i)) { //only get ABI IDs, i.e. exclude effectors
                mapmanURL += `"${nodeID}",`;
            }
        });
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
		// console.log(MapManJSON);
        // Iterate through each result item and inside however many annotations it has...
		MapManJSON.forEach(function(geneMapMan) {
            var particularGene = AIV.cy.$('node[name = "' + geneMapMan.request.agi + '"]');
            particularGene.data("numOfMapMans", geneMapMan.result.length); //for use in the qTip
            geneMapMan.result.forEach(function (resultItem, index) {
            	var MapManCodeN = 'MapManCode' +  (index + 1); //i.e. MapManCode1
            	var MapManNameN = 'MapManName' +  (index + 1); //i.e. MapManName1
                particularGene.data({ //Add this data to object to be called via the qTip
                    [MapManCodeN] : chopMapMan(resultItem.code),
                	[MapManNameN] : chopMapMan(resultItem.name)
                });

                //Now call SVG modifying function for the first iteration, Nick agreed to only show the first MapMan on the Donut
                if (index === 0) { modifySVGString(particularGene); }
            });
        });

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
		 */
		function modifySVGString(geneNode) {
            var newSVGString = decodeURIComponent(geneNode.data('svgDonut')).replace("</svg>", ""); //strip </svg> closing tag
			newSVGString = newSVGString.replace('data:image/svg+xml;utf8,', "");
			// console.log(newSVGString);
			var MapManCode = geneNode.data('MapManCode1').replace(/^(\d+)\..*$/i, "$1"); // only get leftmost number
			var xPosition = MapManCode.length > 1 ? '32%' : '41%'; //i.e. check if single or double digit
			var fontSize = geneNode.data('searchGeneData') ? 22 : 13; //Determine whether gene is bigger or not (i.e. search gene or not)

            newSVGString += `<text x='${xPosition}' y='59%' font-size='${fontSize}' font-family="Verdana" visibility="visible">${MapManCode}</text></svg>`;
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
	};



	/**
	 * @namespace {object} AIV
	 * @function loadData - Load data main function
	 * @returns {boolean} - True if the data is laoded
	 */
	AIV.loadData = function() {
		let success = false; // results

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
                        AIV.addNode(AIV.genesList[i], 'Protein', true);
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
                AIV.addChrNodeQtips();
                AIV.addNumberOfPDIsToNodeLabel();
                AIV.addProteinNodeQtips();
                AIV.addPPIEdgeQtips();
                AIV.addEffectorNodeQtips();
                AIV.cy.style(AIV.getCyStyle()).update();
                AIV.setDNANodesPosition();
                AIV.cy.layout(AIV.getCySpreadLayout()).run();

                document.getElementById('loading').classList.add('loaded'); //hide loading spinner
            	$('#loading').children().remove() //delete the loading spinner divs
			})
            .catch(function(err){

            })
            .then(function(){
                var AJAXLocalizationURL = "https://bar.utoronto.ca/~vlau/testing_suba4.php";
                return $.ajax({
                    url: AJAXLocalizationURL, // TODO: Change this URL to webservices one once uploaded
                    type: "POST",
					data: JSON.stringify( AIV.returnLocalizationPOSTJSON() ),
                    contentType : 'application/json',
                    dataType: 'json'
                });
            })
            .then(function(SUBAJSON){
                // console.log(SUBAJSON);
                // console.log("AIV", AIV);
                AIV.SUBA4LoadState = true;
                AIV.addLocalizationDataToNodes(SUBAJSON);

                //Loop through ATG protein nodes and add a SVG string property for bg-image css
                AIV.cy.filter("node[name ^= 'At']").forEach(function(node){
                    var nodeID = node.data('name');
                    if (nodeID.match(/^AT[1-5MC]G\d{5}$/i)) { //only get ABI IDs, i.e. exclude effectors
                        AIV.createSVGPieDonutCartStr(node);
                    }
                });
                AIV.returnBGImageSVGasCSS().update();
            })
            .catch(function(err){

            })
			.then(function(){ // chain this AJAX call to the above as the mapman relies on the drawing of the SVG pie donuts, i.e. wait for above sync code to finish
				return $.ajax({
					url: AIV.createGETMapManURL(),
					type: 'GET',
					dataType: 'json'
				});
			})
			.then(function(resMapManJSON){
				AIV.processMapMan(resMapManJSON);
				AIV.mapManLoadState = true;
			})
			.catch(function(err){

			});

		return success;
	};

    /**
	 * @function createBARAJaxPromise - programatically figures out how to build the BAR URL get request
     * @returns {Promise.<{res: object, ajaxCallType: string}>|*}
     */
	AIV.createBARAjaxPromise = function() {
        // AGI IDs
        let req = '?request=[';
        for (var i = 0; i < this.genesList.length; i++) {
            req += '{"agi":"' + this.genesList[i] + '"}';
            if (i < this.genesList.length - 1) {
                req += ',';
            }
        }
        req += "]";

        //Recursive
        if ($('#recursive').is(':checked')) {
            req += "&recursive=true";
        } else {
            req += "&recursive=false";
        }

        // Published
        if ($('#published').is(':checked')) {
            req += "&published=true";
        } else {
            req += "&published=false";
        }

        // DNA
        if ($('#queryDna').is(':checked')) {
            req += "&querydna=true";
        } else {
            req += "&querydna=false";
        }

        var serviceURL = 'http://bar.utoronto.ca/~asher/new_aiv/cgi-bin/get_interactions_dapseq.php' + req; //TODO: Change this 'hard' url to base root /cgi-bin

		return $.ajax({
            url: serviceURL,
            type: 'GET',
            dataType: 'json'
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


    // Ready to run
	$(function() {
		// Initialize AIV
		AIV.initialize();
    });
})(window, jQuery, cytoscape);
