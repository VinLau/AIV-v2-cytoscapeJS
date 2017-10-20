/*
 * AIV 2.0
 * By Asher Pasha and Vincent Lau, et al. 2017
 *
 */
(function(window, $, cytoscape, undefined) {
	'use strict';

	// The AIV namespace 
	var AIV = {};

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
			$('#genes').val("AT2G34970\nAT3G18130\nAT1G04880");
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
		// For now use spread layout
		let layout = {};
		layout.name = 'spread';
		layout.minDist = 20;
	
		return layout;
	}
	
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
  				  'background-color': '#ea8a31'
  				})
  			.selector('edge')
  				.style({
  				  'curve-style': 'haystack',
				  'haystack-radius': 0,
				  'width': 'data(edgeWidth)',
				  'opacity': 0.666,
				  'line-color': 'data(edgeColor)',
				  'line-style': 'data(edgeStyle)'
  				})
			.selector('.DNA')
				.style({
					'shape': 'square'
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

			layout: this.getCyLayout()
		});
	};

	/** 
	 * Get Edge Style
	 */
	AIV.getWidth = function(interolog_confidence) {
		if (interolog_confidence > 10) {
			return '4';
		} else if (interolog_confidence > 5) {
			return '3';
		} else if (interolog_confidence > 2) {
			return '2';
		} else if (interolog_confidence <= 2 && interolog_confidence > 0) {
			return '1';
		} else {
			return '1';
		}
	}

	/**
	 * Get Colour
	 */
	AIV.getEdgeColor = function(correlation_coefficient, published, index) {
		correlation_coefficient = Math.abs(parseFloat(correlation_coefficient)); // Make the value positive
		if (index == '2') {
			return '#557e00';
		} else if (published) { //published PPIs not published PDIs
			return '#99cc00';
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
		
		// Add class
		this.cy.$('#' + node_id).addClass(type);
	};

	/** 
	 * Add edges
	 */
	AIV.addEdges = function(source, typeSource, target, typeTarget, colour, style, width) {
		let edge_id = typeSource + '_' + source + '_' + typeTarget + '_' + target;
		source = typeSource + '_' + source;
		target = typeTarget + '_' + target;
		this.cy.add([
			{ group: "edges", data: { id: edge_id, source: source, target: target, edgeColor: colour, edgeStyle: style, edgeWidth: width }}
		]);
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
                    hide : { event : 'mouseout'}
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
                    hide : { event : 'mouseout'}
                }
            );
        });
    };

    AIV.modifyProString = string => string.replace(/PROTEIN_/gi, '').toUpperCase();

    AIV.addPPIEdgeQtips = function() {
        var that = this;
        this.cy.edges().filter('[source^="Protein"][target^="Protein"]').forEach(function (edge){ //TODO: add another filter for interolog confidence (see checklist on Trello)
            edge.qtip(
                {
                    content:
                        {
                            title: "Edge " + edge.data("source") + " to " + edge.data("target"),
                            text : "<a href='http://bar.utoronto.ca/~rsong/formike/?id1=" + that.modifyProString(edge.data("source")) + "&id2=" + that.modifyProString(edge.data("target")) + "' target='_blank'> Predicted Structural Interaction </a>"
                        },
                    style  : { classes : 'qtip-tipped' }
                }
            );
        });
    };

	/**
	 * This function parses interactions data
	 */
	AIV.parseInteractionsData = function(data) {
		for (var i = 0; i < this.genesList.length; i++) {
			// Add Query node
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
				
				// Source
				if (dataSubset[j].source.match(/^At/i)) {
					typeSource = 'Protein';
				} else {
					typeSource = 'Effector';
				}

				// Target
				if (dataSubset[j].target.match(/^At/i)) {
					if (dataSubset[j].index == '2') {
						typeTarget = 'DNA';
					} else {
						typeTarget = 'Protein';
					}
				} else {
					typeTarget = 'Effector';
				}

				// Get color
				edgeColour = this.getEdgeColor(dataSubset[j].correlation_coefficient, dataSubset[j].published, dataSubset[j].index);

				// Get Line Style
				style = ((dataSubset[j].interolog_confidence <= 2 && dataSubset[j].interolog_confidence > 0) ? "dashed" : "solid");

				// Get Line Width
				width = this.getWidth(dataSubset[j].interolog_confidence);

				if (this.filter) {
					// It should automatically filter all
				} else {
					this.addNode(dataSubset[j].source, typeSource);
					this.addNode(dataSubset[j].target, typeTarget);
				}
				
				if (this.filter) {
					// If both source and target are in gene list, add
					if ($.inArray(dataSubset[j].source, AIV.genesList) >= 0 && $.inArray(dataSubset[j].target, AIV.genesList >= 0)) {
						this.addEdges(dataSubset[j].source, typeSource, dataSubset[j].target, typeTarget, edgeColour, style, width);
					}
				} else {
					this.addEdges(dataSubset[j].source, typeSource, dataSubset[j].target, typeTarget, edgeColour, style, width);
				}
			}
		}

		
		// Need to update style after adding
        this.addProteinNodeQtips();
		this.addPPIEdgeQtips();
		this.addEffectorNodeQtips();
		this.cy.style(this.getCyStyle()).update();
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

	// Ready to run
	$(function() {
		// Initailize AIV 
		AIV.initialize();
	});
})(window, jQuery, cytoscape);
