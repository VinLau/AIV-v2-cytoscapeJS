/**
 * @fileOverview AIV2, Arabidopsis Interactions Viewer Two. Main JS file that powers the front-end of AIV 2.0. Shows PPIs and PDIs and additional API data for a given gene(s).
 * @version 2.0, Dec2017
 * @author Vincent Lau (major additions, AJAX, polishing, CSS, SVGs) <vincente.lau@mail.utoronto.ca>
 * @author Asher Pasha (base app, adding nodes & edges)
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
     * @property {number} DNANodeSize - Important for adjusting the donut sizes, TODO: make nodesize options dropdown
	 * @property {number} searchNodeSize - Size for search genes
	 * @property {string} nodeDefaultColor - hexcode for regular nodes by default (no expression data)
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

    /**
	 * @namespace {object} AIV
	 * @function initialize - Call bindUIEvents as the DOM has been prepared
	 */
	AIV.initialize = function() {
		// Bind User events
		this.bindUIEvents();
	};

	/**
     * @namespace {object} AIV
     * @function bindUIEvents - Add functionality to buttons when DOM is loaded
	 */
	AIV.bindUIEvents = function() {
		// Example button 
		$('#example').click(function() {
			$('#genes').val("AT2G34970\nAT3G18130\nAT1G04880\nAT1G25420\nAT5G43700");
		});

		// Settings button 
		$('#settings').click(function(e) {
			e.preventDefault();
			$('#wrapper').toggleClass('toggled').delay(500).promise().done(function(){
                AIV.cy.resize(); //delay 500ms to allwo for resizing
                AIV.setDNANodesPosition();
                AIV.cy.layout(AIV.getCyLayout()).run();
            });
        });

		// About button 
		$('#showAboutModal').click(function(e) {
			e.preventDefault();
			$('#AboutModal').modal('show');
		});
		
		// Show Legend
		$('#showLegendModal').click(function(e) {
			e.preventDefault();
			$('#LegendModal').modal('show');
		});

		// Submit button
		$('#submit').click(function(e) {
			// Stop system submit, unless needed later on
			e.preventDefault();
            document.getElementById('loading').classList.remove('loaded'); //add loading spinner

            // Get the list of genes
			let genes = $.trim($('#genes').val());
			if (genes !== '') {
				genes = genes.replace(/T/g,'t');
				genes = genes.replace(/G/g, 'g');
				genes = genes.replace(/a/g, 'A');

				AIV.genesList = genes.split("\n");
				
				// Clear existing data
				if (typeof AIV.cy !== 'undefined') {
					AIV.cy.destroy();

                    //reset existing built-in state data from previous query
                    AIV.chromosomesAdded = {};
                    AIV.mapManLoadState = false;
				}
				AIV.initializeCy();

				AIV.loadData();
			} else {
				window.alert('No genes provided.');
			}
		});

		// Set height of genes textbox TODO: reformat this with responsive CSS instead of jQuery
		var genesHeight = $(window).height() - 530;
		if (genesHeight > 0) {
			$('#genes').css('height', genesHeight + 'px');
		}
	};

	/**
	 * @namespace {object} AIV
	 * @function getCyLayout - Returns layout for Cytoscape
	 */
	AIV.getCyLayout = function() {
		let layout = {};
		layout.name = 'spread';
		layout.minDist = 25;
		// layout.padding = 1;
        layout.boundingBox = {x1:0 , y1:0, w:this.cy.width(), h: (this.cy.height() - 55) }; //set boundaries to allow for clearer PDIs (DNA nodes are ~55px and are locked to start at x:50,y:0)
		// layout.stop = function() {}; //For manually adjusting position of nodes after layout is done
		return layout;
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
                })
			.selector('.searchGene') //If same properties as above, override them with these values
				.style({
                    'font-size': 14,
                    'height' : this.searchNodeSize,
					'width'  : this.searchNodeSize,
					'background-color': this.searchNodeColor,
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
					'target-arrow-color' : '#1c1b1d',
                    'target-arrow-shape': 'data(arrowEdges)',
                })
			.selector('.DNA')
				.style({
                    'background-color': '#fed7ff',
                    'font-size': '1.1em',
                    "text-valign": "center",
                    "text-halign": "center",
					"border-style": "solid",
					"border-color": "#fff72d",
					"border-width": "2px",
					'shape': 'square',
					'height': this.DNANodeSize,
					'width': this.DNANodeSize,
				})
			.selector('.Effector')
				.style({
					'shape': 'hexagon',
					'background-color': '#00FF00'
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
	 * @param {boolean} [searchGene] - optional parameter that signifies node is a search query gene
     */
	AIV.addNode = function(node, type, searchGene) {
		let node_id = type + '_' + node;
		
		// Add the node
		this.cy.add([
			{ group: "nodes", data: {id: node_id, name: node}} //nodes now have a property 'id' denoted as Protein_At5g20920 (if user inputed 'At5g20920' in the textarea)
		]);
		
		this.cy.$('#' + node_id).addClass(type); // Add class such that .Protein, .DNA, .Effector

		if (searchGene){ //For search genes, add a class for styling later
            this.cy.$('#' + node_id).addClass('searchGene');
		}
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
            console.log("chromosome property already added");
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
	 * @source {string} - as the source protein i.e. "At2g34970"
	 * @typeSource {string} - as the type of protein it is, i.e. "effector" or "protein"
	 * @target {string} - as the target protein i.e. "At3g05230"
	 * @targetTarget {string} - as the type of protein it is, i.e. "effector" or "protein"
	 * @colour {string} - as the edge colour as a hexcode i.e. "#557e00"
	 * @style {string} - as whether dashed or solid i.e. "solid"
	 * @width {string} - as width of the edge as a string of a number i.e. "5"
	 * @reference {string} - as (if it exists) a published string of the DOI or Pubmed, etc.
	 *            i.e. " "doi:10.1038/msb.2011.66"" or "None"
	 * @published {boolean} - to whether this is published interaction data i.e. true
	 */
	AIV.addEdges = function(source, typeSource, target, typeTarget, colour, style, width, reference, published, interologConfidence) {
		let edge_id = typeSource + '_' + source + '_' + typeTarget + '_' + target;
		source = typeSource + '_' + source;
		target = typeTarget + '_' + target;
		if (reference !== "None"){ //TODO: remove this later
			// console.log(reference, " ", width);
		}
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
            this.cy.getElementById(`DNA_Chr${chr}`).position({x: xCoord, y: this.cy.height() });
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
		console.log(arrayPDIdata);
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
			htmlTABLE += `<th>${protein}(${PDIsInChr[protein].length} PDIs)</th>`;
		}
        htmlTABLE += "</tr>";
		targets.forEach(function(targetDNAGene){ //process remaining rows for each target DNA gene
			htmlTABLE += `<tr><td>${targetDNAGene}</td>`;
            for (let protein of Object.keys(PDIsInChr)) {
                if (PDIsInChr[protein].indexOf(targetDNAGene) !== -1) { //indexOf returns -1 if not found
					AIV.sanitizeReferenceIDs(pubmedRefHashTable[protein + '_' + targetDNAGene]).forEach(function(ref){
						htmlTABLE += "<td>" +  AIV.returnReferenceLink(ref, targetDNAGene) + "</td>";
					});
				}
				else {
                	htmlTABLE += "<td>No PDI</td>";
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
            console.log(this.chromosomesAdded[chr], `chr${chr}`);
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
                        style    : { classes : 'qtip-cluetip'},
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
            console.log(protein.data());
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
                                            console.log(`AJAX protein data call for ${protein.data("name")}`);
                                            if (AIV.genesFetched[protein.data("name")] !== undefined){ //Check with state variable to reload our fetched data stored in global state
                                                return AIV.genesFetched[protein.data("name")]; //return the stored value as the text value to the text property
                                            }

                                            if (AIV.genesFetching[protein.data("name")] === true){ //Check with state variable to see if current gene data is already fetching
                                                return '<p>Fetching Protein Data...</p>' + AIV.showMapMan(protein) + AIV.showSUBA4(protein); // TODO: remove the AIV.showMapMan(protein) and AIV.showSUBA4(protein) once we upload a working API to the bar
                                            }
                                            else {
                                                AIV.genesFetching[protein.data("name")] = true;

                                                $.ajax({
                                                    url: `https://cors.now.sh/http://bar.utoronto.ca/webservices/araport/api/bar_gene_summary_by_locus.php?locus=${protein.data("name")}` // Use data-url attribute for the URL TODO: remove cors now when uploaded to server
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
                    style    : { classes : 'qtip-bootstrap q-tip-protein-node'},
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
        console.log(baseString);
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

        console.log(baseString);
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
                    style    : { classes : 'qtip-bootstrap q-tip-effector-node'},
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
	 * @function showDockerLink - decides whether to show the docker link or not based on the interolog confidence (based on whether it is IFF the interolog confidence is negative). Then use the 3 params to create an external link elsewhere on the BAR.
     *
     * @param {string} source - as the source protein in ABI form i.e. "At3g10000"
     * @param {string} target - as the target protein in ABI form i.e. "At4g40000"
     * @param {string} reference - string of DOI or PMIDs, delimited by \n, i.e. "doi:10.1126/science.1203659 \ndoi:10.1126/science.1203877".. whatever came through the GET request via 'reference' prop
     * @param {number} interologConf - represents the interolog confidence value of the PPI
     */
    AIV.showDockerLink = (source, target, reference, interologConf) => {
        let modifyProString = string => string.replace(/PROTEIN_/gi, '').toUpperCase();

        var refLinks = "";
        if (reference) { //non-falsy value (we may have changed it to false in the addEdges() call)
            AIV.sanitizeReferenceIDs( reference ).forEach(function(ref){
                refLinks += '<p> Ref: ' + AIV.returnReferenceLink(ref, source) + '</p>';
            });
        }

        if (interologConf > 0) {
            return refLinks; //can be "" or have a bunch of links..
        }
        else { //if interlog confidence is less than zero, show an external docker link
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
        	ppiEdge.qtip(
				{
                    content:
                        {
                            title:
								{
                            		text: "Edge " + ppiEdge.data("source") + " to " + ppiEdge.data("target"),
									button: "Close"
                            	},
                            text : that.showDockerLink( ppiEdge.data("source"), ppiEdge.data("target"), ppiEdge.data("reference"), ppiEdge.data('interologConfidence') ),
                        },
                    style  : { classes : 'qtip-bootstrap' },
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
    	if ( (regexGroup = referenceStr.match(/^PubMed(\d+)$/i)) ) { //assign and evaluate if true immediately
            return `<a href="https://www.ncbi.nlm.nih.gov/pubmed/${regexGroup[1]}" target='_blank'> PMID ${regexGroup[1]}</a>`;
        }
		else if ( (regexGroup = referenceStr.match(/^Mind(\d+)$/i)) ){
            return `<a href="http://biodb.lumc.edu/mind/search_results.php?text=${ABIIdentifier}&SubmitForm=Search&start=0&count=25&search=all" target="_blank"> MIND ID ${regexGroup[1]}}</a>`;
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
	 * @function parseInteractionData -
	 * This function parses interactions data, namely in these ways:
	 * Create an outer for loop (run N times where N is the # of genes in the user form):
	 * I  ) Add these nodes to the cy core.
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
	AIV.parseInteractionsData = function(data) {
		for (var i = 0; i < this.genesList.length; i++) {
			// Add Query node (user inputed in HTML form)
			this.addNode(this.genesList[i], 'Protein', true);

			let dataSubset = data[this.genesList[i]]; //'[]' expression to access an object property

			console.log(dataSubset);

			// Add Nodes for each query. We skip the last one because that is the recursive flag
			for (let j = 0; j < dataSubset.length - 1; j++) {
				let typeSource = '';
				let typeTarget = '';
				let edgeColour = '#000000';	 // Default color of Black
				let style = 'solid'; // Default solid line style
				let width = '5'; // Default edge width
				let EdgeJSON = dataSubset[j];

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

				// Get color
				edgeColour = this.getEdgeColor(EdgeJSON.correlation_coefficient, EdgeJSON.published, EdgeJSON.index, EdgeJSON.interolog_confidence);

				// Get Line Style
				style = ((EdgeJSON.interolog_confidence <= 2 && EdgeJSON.interolog_confidence > 0) ? "dashed" : "solid");

				// Get Line Width
				width = this.getWidth(EdgeJSON.interolog_confidence);

				if (this.filter) { //Only take in the genes that user inputed in HTML form
					if (EdgeJSON.index === '2' && $.inArray(EdgeJSON.source, AIV.genesList)) {
						this.addDNANodesToAIVObj(EdgeJSON); //Only add PDI if it exists in the HTML form
					}
				} else if (typeTarget === "Protein" || typeTarget === "Effector") {
					this.addNode(EdgeJSON.source, typeSource);
					this.addNode(EdgeJSON.target, typeTarget);
				} else { //i.e. typeTarget === "DNA"
				    this.addDNANodesToAIVObj(EdgeJSON); //pass the DNA in the JSON format we GET on
                }

				if (this.filter) { //Add if both source and target are in gene form list
                    if ($.inArray(EdgeJSON.source, AIV.genesList) >= 0 && $.inArray(EdgeJSON.target, AIV.genesList >= 0) && EdgeJSON.index !== '2') { //PPIs
						this.addEdges(EdgeJSON.source, typeSource, EdgeJSON.target, typeTarget, edgeColour, style, width, EdgeJSON.reference, EdgeJSON.published, EdgeJSON.interolog_confidence);
					}
                    else if ($.inArray(EdgeJSON.source, AIV.genesList) >= 0 && $.inArray(EdgeJSON.target, AIV.genesList >= 0) && EdgeJSON.index === '2' && (this.cy.getElementById(`${typeSource}_${EdgeJSON.source}_DNA_Chr${EdgeJSON.target.charAt(2)}`).length === 0)) { //PDIs
                        this.addEdges(EdgeJSON.source, typeSource, `Chr${EdgeJSON.target.charAt(2)}`, typeTarget /*DNA*/, edgeColour, style, width, EdgeJSON.reference, EdgeJSON.published, EdgeJSON.interolog_confidence);
                    }
				}
				else if (EdgeJSON.index !== '2') { //i.e. PDI edge
					this.addEdges(EdgeJSON.source, typeSource, EdgeJSON.target, typeTarget, edgeColour, style, width, EdgeJSON.reference, EdgeJSON.published, EdgeJSON.interolog_confidence);
				}
				else if ( EdgeJSON.index === '2' && (this.cy.getElementById(`${typeSource}_${EdgeJSON.source}_DNA_Chr${EdgeJSON.target.charAt(2)}`).length === 0) ) { //Check if PDI edge (query gene & chr) is already added, if not added
                    this.addEdges(EdgeJSON.source, typeSource, `Chr${EdgeJSON.target.charAt(2)}`, typeTarget /*DNA*/, edgeColour, style, width, EdgeJSON.reference, EdgeJSON.published, EdgeJSON.interolog_confidence);
				}
			}
		} //end of adding nodes and edges

		// Update styling and add qTips as nodes have now been added to the cy core
        this.addChrNodeQtips();
		this.addNumberOfPDIsToNodeLabel();
        this.addProteinNodeQtips();
		this.addPPIEdgeQtips();
		this.addEffectorNodeQtips();
		this.cy.style(this.getCyStyle()).update();
        this.setDNANodesPosition();
        this.cy.layout(this.getCyLayout()).run();
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
        this.cy.$('node').forEach(function(node){
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
                    .data('predictedSUBA',  ( geneSUBAData.includes_predicted === "yes" ) )
                    .data('experimentalSUBA',  ( geneSUBAData.includes_experimental === "yes" ) )
                    .data('cytoskeletonPCT', countLocScore ( geneSUBAData.data.cytoskeleton, denoTotal ) )
                    .data('cytosolPCT', countLocScore ( geneSUBAData.data.cytosol, denoTotal ) )
                    .data('endoplasmicReticulumPCT', countLocScore ( geneSUBAData.data['endoplasmic reticulum'], denoTotal ) )
                    .data('extracellularPCT', countLocScore ( geneSUBAData.data.extracellular, denoTotal ) )
                    .data('golgiPCT', countLocScore ( geneSUBAData.data.golgi, denoTotal ) )
                    .data('mitochondrionPCT', countLocScore ( geneSUBAData.data.mitochondrion, denoTotal ) )
                    .data('nucleusPCT', countLocScore ( geneSUBAData.data.nucleus, denoTotal ) )
                    .data('peroxisomePCT', countLocScore ( geneSUBAData.data.peroxisome, denoTotal ) )
                    .data('plasmaMembranePCT', countLocScore ( geneSUBAData.data['plasma membrane'], denoTotal ) )
                    .data('plastidPCT', countLocScore ( geneSUBAData.data.plastid, denoTotal ) )
                    .data('vacuolePCT', countLocScore ( geneSUBAData.data.vacuole, denoTotal ) );
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
		SVGstr += `<circle class="donut-unfilled-ring" cx="${donutCxCy}" cy="${donutCxCy}" r="${radius}" fill="transparent" stroke="#56595b" stroke-width="${strokeWidth}"></circle>`;

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
					color : returnLocColor(dataProp)
        		});
			}
        }
        // Custom sort based on the value of the 'pct' property defined above, order greatest to least
		// Result => we are able to show pie chart values from greatest to least starting from 12 oclock
        pctAndColorArray.sort((itemOne, itemTwo) => itemTwo.pct - itemOne.pct);

        // console.log(pctAndColorArray);

        var initialOffset = 25 * scaling; // Bypass default donut parts start at 3 o'clock instead of 12
		var allSegsLength = 0;

        // Based on the sorted array we created above, let's add some 'donut segments' to the SVG string
        pctAndColorArray.forEach(function(pctAndColor){
        	SVGstr += `<circle class="donut-segment" cx="${donutCxCy}" cy="${donutCxCy}" r="${radius}"  fill="transparent" stroke="${pctAndColor.color}" stroke-width="${strokeWidth}" stroke-dasharray="${pctAndColor.pct * scaling} ${(100 - pctAndColor.pct) * scaling}" stroke-dashoffset="${initialOffset}"></circle>`;

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
	 * @function createGETMapManURL -
     * Create URL for get request for mapman information, namely for the codes (MapMan IDs).
     * Example: http://www.gabipd.org/services/rest/mapman/bin?request=[{"agi":"At4g36250"},{"agi":"At4g02070"}]
     * Data returned is an array of objects, MapMan code is nested inside "result[0].parent.code" for each AGI
	 * @returns {string} - url for the HTTP request
     */
    AIV.createGETMapManURL = function () {
		var mapmanURL = "https://bar.utoronto.ca/~asher/bar_mapman.php?request=[";
        this.cy.$('node').forEach(function(node){
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
		console.log(MapManJSON);
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
			var fontSize = geneNode.hasClass('searchGene') ? 30 : 15; //Determine whether gene is bigger or not (i.e. search gene or not)

            newSVGString += `<text x='${xPosition}' y='61%' font-size='${fontSize}'>
								${MapManCode} 
							</text></svg>`;
			newSVGString = 'data:image/svg+xml;utf8,' + encodeURIComponent(newSVGString);

			geneNode.data('svgDonut', newSVGString);
		}

	};

	/**
	 * @namespace {object} AIV
	 * @function loadData - Load data main function
	 * @returns {boolean} - True if the data is laoded
	 */
	AIV.loadData = function() {
		let success = false;	// results

		// AGI IDs
		let req = '?request=[';
		for (var i = 0; i < this.genesList.length; i++) {
			req += '{"agi":"' + AIV.genesList[i] + '"}';
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

		// Filter
		if ($('#filter').is(':checked')) {
			AIV.filter = true;
		} else {
			AIV.filter = false;
		}

		var serviceURL = 'http://bar.utoronto.ca/~vlau/new_aiv/cgi-bin/get_interactions_dapseq.php' + req; //TODO: Change this 'hard' url to base root /cgi-bin

		$.ajax({
			url: serviceURL,
			type: 'GET',
			dataType: 'json'
		}).
            then(function(PPIandPDIJSON) {
                console.log(PPIandPDIJSON);
                // Parse data and make cy elements object
                AIV.parseInteractionsData(PPIandPDIJSON);
                document.getElementById('loading').classList.add('loaded'); //remove loading spinner
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
                console.log(SUBAJSON);
                AIV.SUBA4LoadState = true;
                AIV.addLocalizationDataToNodes(SUBAJSON);

                //Loop through ATG protein nodes and add a SVG string property for bg-image css
                AIV.cy.$('node').forEach(function(node){
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

	//PNG Export
    document.getElementById('showPNGModal').addEventListener('click', function(event){
        $('#PNGModal').modal('show');
        document.getElementById('png-export').setAttribute('src', AIV.cy.png());
    });

	//JSON Export
    document.getElementById('showJSONModal').addEventListener('click', function(event){
        $('#JSONModal').modal('show');
        var JSONStringified = JSON.stringify( AIV.cy.json(), null, '    ' );
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

    /** @function checkServerStatus - Check PSICQUIC INTACT status*/
    function checkINTACTServerStatus(){
        $.ajax({
            url: "https://cors-anywhere.herokuapp.com/tyersrest.tyerslab.com:8805/psicquic/webservices/current/search/interactor/arf7", //TODO: change to our proxy
            type: "GET"
        })
            .then(()=>{
                $("<img src='images/activeServer.png'/>").insertAfter("#IntActSpan");
                document.getElementById("queryIntAct").disabled = false;
            })
            .catch(()=>{$("<img src='images/inactiveServer.png'/>").insertAfter("#IntActSpan");});
    }

    /** @function checkBIOGRIDServerStatus - Check BIOGRID webservice status*/
    function checkBIOGRIDServerStatus(){
        $.ajax({
            url: "https://cors-anywhere.herokuapp.com/www.ebi.ac.uk/Tools/webservices/psicquic/intact/webservices/current/search/query/species:human?firstResult=0&maxResults=1", //TODO: change to our proxy
            type: "GET"
        })
            .then(()=>{
                $("<img src='images/activeServer.png'/>").insertAfter("#BioGridSpan");
                document.getElementById("queryBioGrid").disabled = false;
            })
            .catch(()=>{$("<img src='images/inactiveServer.png'/>").insertAfter("#BioGridSpan");});
    }

    // Ready to run
	$(function() {
		// Initialize AIV
		AIV.initialize();
        checkINTACTServerStatus();
        checkBIOGRIDServerStatus();
    });
})(window, jQuery, cytoscape);
