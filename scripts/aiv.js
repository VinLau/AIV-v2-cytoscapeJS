/*
 * AIV 2.0
 * By Asher Pasha and Vincent Lau, 2017
 */
(function(window, $, cytoscape, undefined) {
	'use strict';

	// The AIV namespace 
	var AIV = {};
    AIV.chromosomesAdded = {}; //Object property for'state' of how many PDI chromosomes exist

    /**
	 * Initialize
	 */
	AIV.initialize = function() {
		// Bind User events
		this.bindUIEvents();
	};

	/**
	 * Bind UI Events
	 */
	AIV.bindUIEvents = function() {
		// Example button 
		$('#example').click(function() {
			$('#genes').val("AT2G34970\nAT3G18130\nAT1G04880\nAT1G25420\nAT5G43700");
		});

		// Settings button 
		$('#settings').click(function(e) {
			e.preventDefault();
			$('#wrapper').toggleClass('toggled');
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
                    AIV.chromosomesAdded = {}; //clear existing built-in DNA data from previous query
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
	 * Returns layout for Cytoscape
	 */
	AIV.getCyLayout = function() {
		let layout = {};
		layout.name = 'spread';
		layout.minDist = 20;
		layout.padding = 1;
        layout.boundingBox = {x1:0 , y1:55, w:this.cy.width(), h:this.cy.height()}; //set boundaries to allow for clearer PDIs (DNA nodes are ~55px and are locked to start at x:50,y:0)
		// layout.stop = function() {}; //For manually adjusting position of nodes after layout is done
		return layout;
	};
	
	/**
	 * Returns style of Cytoscape
	 */
	AIV.getCyStyle = function() {
		return (
		    cytoscape.stylesheet()
  			.selector('node')
  				.style({
					'label': 'data(name)', //'label' is alias for 'content'
				  	'font-size': 8,
				  	'background-color': '#ea8a31',
                    "text-wrap": "wrap" //mulitline support
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
					'height': '55px',
					'width': '55px',
				})
			.selector('.Effector')
				.style({
					'shape': 'hexagon',
					'background-color': '#00FF00'
				})
        );
	};


	/**
	 * Initailize Cytoscape
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
	 * Get Edge Style
	 */
	AIV.getWidth = function(interolog_confidence) { // Changed return values to 5,4,3,2,1 from 4,3,2,1,1
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
	 * Get Colour
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
	 * Add Nodes
	 */
	AIV.addNode = function(node, type) {
		let node_id = type + '_' + node;
		
		// Add the node
		this.cy.add([
			{ group: "nodes", data: {id: node_id, name: node}} //nodes now have a property 'id' denoted as Protein_At5g20920 (if user inputed 'At5g20920' in the textarea)
		]);
		
		this.cy.$('#' + node_id).addClass(type); // Add class such that .Protein, .DNA, .Effector
    };

	AIV.addDNANodesToAIVObj = function(DNAObjectData) {
	    var chrNum = DNAObjectData.target.charAt(2).toUpperCase(); //if it was At2g04880 then it'd '2'
	    var name = chrNum; // Just for 'm' and 'c'

	    if (chrNum === "M") {
	        name = "Chloroplast";
        }
        else if (chrNum === "C"){
	        name = "Mitochondria";
        }

        console.log("addDNANodes", DNAObjectData, "chrNum");
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
	 * Add edges
	 */
	AIV.addEdges = function(source, typeSource, target, typeTarget, colour, style, width, reference, published) {
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
					curveStyle: typeTarget === "DNA" ? "unbundled-bezier" : "haystack",
					arrowEdges: typeTarget === "DNA" ? "triangle" : "none",
 				},
			}
		]);
	};

	AIV.addNumberOfPDIsToNodeLabel = function () {
        for (let chr of Object.keys(this.chromosomesAdded)) {
        	let prevName = this.cy.getElementById(`DNA_Chr${chr}`).data('name');
			this.cy.getElementById(`DNA_Chr${chr}`)
				.data('name', `${prevName + "\n" + this.chromosomesAdded[chr].length} PDIs`);
        }
	};

	AIV.setDNANodesPosition = function () {
        var xCoord = 50;
        var viewportWidth = this.cy.width();
        var numOfChromosomes = Object.keys(this.chromosomesAdded).length; //for A. th. the max would be 7
        for (let chr of Object.keys(this.chromosomesAdded)) {
            this.cy.getElementById(`DNA_Chr${chr}`).position({x: xCoord, y: 0});
            this.cy.getElementById(`DNA_Chr${chr}`).lock(); //hardset the position of the chr nodes
            xCoord += viewportWidth/numOfChromosomes;
        }
    };

	AIV.createPDItable = function (arrayPDIdata) {
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
					htmlTABLE += `<td>${ pubmedRefHashTable[protein + '_' + targetDNAGene] }</td>`;
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
                                title : `Chromosome ${chr}`,
                                text: that.createPDItable(that.chromosomesAdded[chr])
                            },
                        style    : { classes : 'qtip-cluetip'},
                        show:
                            {
                                solo : true,
                                event: `${event.type}`, // Same show event as triggered event handler
                                ready: true, // Show the tooltip immediately upon creation
                            },
                        hide : { event : 'mousedown mouseout'}
                    }
                );
            });
        }
    };

    AIV.addProteinNodeQtips = function() {
        this.cy.on('mouseover', 'node[id^="Protein"]', function(event) {
            var protein = event.target;
            protein.qtip(
                {
                    overwrite: false, //make sure tooltip won't be overriden once created
                    content  : { text : "Protein " + protein.data("name") } ,
                    style    : { classes : 'qtip-bootstrap q-tip-protein-node'},
                    show:
                        {
                            solo : true,
                            event: `${event.type}`, // Use the same show event as triggered event handler
                            ready: true, // Show the tooltip immediately upon creation
                        },
                    hide : { event : 'mousedown mouseout'}
                }
            );
        });
    };

    AIV.addEffectorNodeQtips = function() {
        this.cy.on('mouseover', 'node[id^="Effector"]', function(event) {
            var effector = event.target;
            effector.qtip(
                {
                    overwrite: false, //make sure tooltip won't be overriden once created
                    content  : { text : "Effector " + effector.data("name") } ,
                    style    : { classes : 'qtip-bootstrap q-tip-effector-node'},
                    show:
                        {
                            solo : true,
                            event: `${event.type}`, // Use the same show event as triggered event handler
                            ready: true, // Show the tooltip immediately upon creation
                        },
                    hide : { event : 'mousedown mouseout'}
                }
            );
        });
    };

    AIV.modifyProString = string => string.replace(/PROTEIN_/gi, '').toUpperCase();

    AIV.showDockerLink = (source, target, DOIorPMID, published) => {
        if (!published) {
            return "";
        }
        else {
            return "<a href='http://bar.utoronto.ca/~rsong/formike/?id1=" + AIV.modifyProString(source) + "&id2=" + AIV.modifyProString(target) + "' target='_blank'> " +
					"Predicted Structural Interaction " +
				"</a>" +
				"<span>" +
                	DOIorPMID +
				"</span>";
        }
    };

    AIV.addPPIEdgeQtips = function() {
        var that = this;
        this.cy.on('mouseover', 'edge[source^="Protein"][target^="Protein"]', function(event){
        	var ppiEdge = event.target;
        	ppiEdge.qtip(
				{
                    content:
                        {
                            title: "Edge " + ppiEdge.data("source") + " to " + ppiEdge.data("target"),
                            text : that.showDockerLink( ppiEdge.data("source"), ppiEdge.data("target"), ppiEdge.data("reference"), ppiEdge.data('published') ),
                        },
                    style  : { classes : 'qtip-bootstrap' },
                    show:
                        {
                            solo : true,
                            event: `${event.type}`, // Use the same show event as triggered event handler
                        },
                    hide : { event : 'mouseout'}
				}
			);
		});
    };

	/**
	 * This function parses interactions data
	 */
	AIV.parseInteractionsData = function(data) {
		for (var i = 0; i < this.genesList.length; i++) {
			// Add Query node (user inputed in HTML form)
			this.addNode(this.genesList[i], 'Protein');

			let dataSubset = data[this.genesList[i]]; //'[]' expression to access an object property

			console.log(dataSubset);

			// Add Nodes for each query. We skip the last one because that is the recursive flag
			for (var j = 0; j < dataSubset.length - 1; j++) {
				let typeSource = '';
				let typeTarget = '';
				let edgeColour = '#000000';	 // Default color of Black
				let style = 'solid';
				let width = '5';
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
						this.addEdges(EdgeJSON.source, typeSource, EdgeJSON.target, typeTarget, edgeColour, style, width, EdgeJSON.reference, EdgeJSON.published);
					}
                    else if ($.inArray(EdgeJSON.source, AIV.genesList) >= 0 && $.inArray(EdgeJSON.target, AIV.genesList >= 0) && EdgeJSON.index === '2' && (this.cy.getElementById(`${typeSource}_${EdgeJSON.source}_DNA_Chr${EdgeJSON.target.charAt(2)}`).length === 0)) { //PDIs
                        this.addEdges(EdgeJSON.source, typeSource, `Chr${EdgeJSON.target.charAt(2)}`, typeTarget /*DNA*/, edgeColour, style, width, EdgeJSON.reference, EdgeJSON.published);
                    }
				}
				else if (EdgeJSON.index !== '2') { //i.e. PDI edge
					this.addEdges(EdgeJSON.source, typeSource, EdgeJSON.target, typeTarget, edgeColour, style, width, EdgeJSON.reference, EdgeJSON.published);
				}
				else if ( EdgeJSON.index === '2' && (this.cy.getElementById(`${typeSource}_${EdgeJSON.source}_DNA_Chr${EdgeJSON.target.charAt(2)}`).length === 0) ) { //Check if PDI edge (query gene & chr) is already added, if not added
                    this.addEdges(EdgeJSON.source, typeSource, `Chr${EdgeJSON.target.charAt(2)}`, typeTarget /*DNA*/, edgeColour, style, width, EdgeJSON.reference, EdgeJSON.published);
				}
			}
		} //end of adding nodes and edges

		// Need to update style after adding
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
	 * Load data main function
	 * @returns {boolean} True if the data is laoded
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
		}).done(function(data) {
			console.log(data);
			// Parse data and make cy elements object
			AIV.parseInteractionsData(data);
		}).fail(function() {
		});

		return success;
	}

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

	// Ready to run
	$(function() {
		// Initailize AIV 
		AIV.initialize();
	});
})(window, jQuery, cytoscape);
