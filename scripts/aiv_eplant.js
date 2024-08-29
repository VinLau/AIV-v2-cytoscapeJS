/*
 * AIV 2.0
 * By Asher Pasha, et al. 2017
 *
 */
/*global cytoscape */
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

		// Initialize Cytoscape
		this.intializeCy();
	};

	/**
	 * Bind UI Events
	 */
	AIV.bindUIEvents = function() {
		// Example button
		$('#example').click(function() {
			$('#genes').val('At5g20920\nAt2g34970');
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

		// Submit button
		$('#submit').click(function(e) {
			// Stop system submit, unless needed later on
			e.preventDefault();

			// Get the list of genes
			let genes = $.trim($('#genes').val());
			if (genes !== '') {
				AIV.genesList = genes.split('\n');

				// Promise to load the data
				//let promiseToLoadData = new Promise(function(resolve, reject) {
				//	let isLoaded = AIV.loadData();

				//	if (isLoaded) {
				//		resolve();
				//	} else {
				//		reject();
				//	}
				//});

				//// Now keep the promise
				//promiseToLoadData.then(function() {
				//	//window.alert('Data loaded!');
				//	$('#wrapper').toggleClass('toggled');
				//}).catch(function() {
				//	//window.alert('Failed to loaded data!');
				//});
				AIV.loadData();
			} else {
				window.alert('No genes provided.');
			}
		});

		// Set height of genes textbox
		var genesHeight = $(document).height() - 550;
		if (genesHeight > 0) {
			$('#genes').css('height', genesHeight + 'px');
		}
	};

	/**
	 * Initailize Cytoscape
	 */
	AIV.intializeCy = function() {
		this.cy = cytoscape({
			container: $('#cy'),
		});

		// Set container style
		this.setCyConf();
	};

	/**
	 * Set Cytoscape style
	 * This is from Ian's ePlant code
	 * @returns {Object} Cytoscape stylesheet
	 */
	AIV.setCytoscapeStyles = function() {
		var styleSheet = cytoscape
			.stylesheet()
			.selector('node')
			.css({
				'text-background-shape': 'roundrectangle',
				'text-background-color': '#B4B4B4',
				'text-background-opacity': 0.8,
				'background-color': '#B4B4B4',
				'font-size': '11px',
				'font-weight': 'bold',
				'text-halign': 'center',
				'border-width': '0px',
			})
			.selector('.compound-top')
			.css({
				shape: 'roundrectangle',
				'background-color': '#F3F3F3',
				'text-background-color': '#FFF',
				'text-wrap': 'wrap',
				color: '#000',
				'font-size': 13,
				'font-weight': 'normal',
				'text-outline-width': '0px',
				'text-valign': 'top',
			})
			.selector('#COMPOUND_DNA')
			.css({
				padding: '100px 5px 5px 0px',
				'background-opacity': '0.4',
				'text-background-opacity': '0',
				content: 'Protein-DNA\nInteractions',
			})
			.selector('#COMPOUND_PROTEIN')
			.css({
				padding: '100px 25px 25px 0px',
				'background-opacity': '0',
				'text-background-opacity': '1',
				content: 'Protein-Protein\nInteractions',
			})
			.selector('.protein-compound')
			.css({
				'background-opacity': 0,
				events: 'no',
			})
			.selector('.protein-back')
			.css({
				height: 'data(height)',
				width: 'data(width)',
				'pie-size': '100%',
				'pie-1-background-color': 'data(pie1Colour)',
				'pie-1-background-size': 'data(pie1Size)',
				'pie-1-background-opacity': 1,
				'pie-2-background-color': 'data(pie2Colour)',
				'pie-2-background-size': 'data(pie2Size)',
				'pie-2-background-opacity': 1,
				'pie-3-background-color': 'data(pie3Colour)',
				'pie-3-background-size': 'data(pie3Size)',
				'pie-3-background-opacity': 1,
				'pie-4-background-color': 'data(pie4Colour)',
				'pie-4-background-size': 'data(pie4Size)',
				'pie-4-background-opacity': 1,
				'border-width': 'data(borderWidth)',
				'border-color': '#99CC00',
				events: 'no',
			})
			.selector('.protein-node')
			.css({
				height: '36px',
				width: '36px',
				padding: '3px 3px 3px 3px',
				'text-valign': 'center',
				content: 'data(content)',
				events: 'yes',
			})
			.selector('[id $= "QUERY_BACK"]')
			.css({
				height: '60px',
				width: '60px',
			})
			.selector('[id $= "QUERY_NODE"]')
			.css({
				height: '48px',
				width: '48px',
				'font-size': '13px',
			})
			.selector('.dna-node')
			.css({
				shape: 'square',
				width: '34px',
				height: '34px',
				'border-width': '4px',
				padding: '3px 3px 3px 3px',
				'border-color': '#030303',
				'text-valign': 'center',
				content: 'data(content)',
			})
			.selector('edge')
			.css({
				width: 'data(size)',
				'line-style': 'data(lineStyle)',
				'line-color': 'data(lineColor)',
				'control-point-distance': '50px',
				'control-point-weight': '0.5',
			})
			.selector('.protein-edge')
			.css({
				'curve-style': 'bezier',
				'mid-target-arrow-shape': 'none',
			})
			.selector('.dna-edge')
			.css({
				'curve-style': 'unbundled-bezier',
				'mid-target-arrow-shape': 'triangle',
				'mid-target-arrow-color': 'data(lineColor)',
			})
			.selector('.chr-edge')
			.css({
				width: '6',
				'line-style': 'solid',
				'line-color': '#669900',
				'curve-style': 'unbundled-bezier',
				'mid-target-arrow-shape': 'triangle',
				'mid-target-arrow-color': '#669900',
				'control-point-distance': '50px',
				'control-point-weight': '0.5',
			})
			.selector('.loaded')
			.css({
				'background-color': '#3C3C3C',
				'text-background-color': '#3C3C3C',
				color: '#FFFFFF',
			})
			.selector('#noInteractionLabel')
			.css({
				shape: 'circle',
				content: 'No interactions found for this gene.',
				width: '1px',
				height: '1px',
				color: '#000',
				'text-background-opacity': '0',
				'font-size': 15,
			});
		return styleSheet;
	};

	/**
	 * Sets Cytoscape configurations.
	 * @returns {void}
	 */
	AIV.setCyConf = function() {
		this.cyConf = {
			wheelSensitivity: 0.2,
			layout: { name: 'null' },
			style: this.setCytoscapeStyles(),
			elements: {
				nodes: [],
				edges: [],
			},
		};

		// Ready event handler
		this.cyConf.ready = $.proxy(function() {
			// Save Cytoscape
			this.cy = $(this.domContainer).cytoscape('get');

			// Use Cytoscape Automove to make protein compounds move in sync
			var proteinPairMove = this.cy.automove({
				nodesMatching: function(node) {
					var type = node._private.data.id.substring(9);
					return type === 'PROTEIN_NODE' || type === 'QUERY_NODE';
				},
				reposition: function(node) {
					var pos = node.position();
					// Set the back node to have the same position
					var backNode = node.siblings();
					backNode.position(pos);
					return pos;
				},
				when: 'matching',
			});

			// Save query node to interactions view
			//var querySelector = '#' + this.geneticElement.identifier.toUpperCase() + 'QUERY_NODE';
			//this.queryNode = this.cy.nodes(querySelector);

			// Update annotations
			for (var n = 0; n < this.cyConf.elements.nodes.length; n = n + 1) {
				var node = this.cyConf.elements.nodes[n];
				if (node.data.annotation) {
					node.data.annotation.update();
				}
			}

			// Listen for mouseover events on nodes
			this.cy.on(
				'mouseover',
				'node',
				$.proxy(function(event) {
					var nodeID = event.cyTarget.data('id');
					// Check that the node is not a compound node
					if (nodeID !== 'COMPOUND_DNA' && nodeID !== 'COMPOUND_PROTEIN') {
						if (nodeID.substring(0, 3) === 'chr') {
							this.chrNodeMouseOverHandler(this, event);
						} else {
							this.nodeMouseOverHandler(this, event);
						}
					}
				}, this),
			);
			// Listen for mouseout events on nodes
			this.cy.on(
				'mouseout',
				'node',
				$.proxy(function(event) {
					var nodeID = event.cyTarget.data('id');
					if (nodeID !== 'COMPOUND_DNA' && nodeID !== 'COMPOUND_PROTEIN') {
						this.nodeMouseOutHandler(this, event);
					}
				}, this),
			);
			// Listen for tap events on nodes
			this.cy.on(
				'tap',
				'node',
				$.proxy(function(event) {
					var nodeID = event.cyTarget.data('id');
					if (nodeID !== 'COMPOUND_DNA' && nodeID !== 'COMPOUND_PROTEIN') {
						if (nodeID.substring(0, 3) !== 'chr') {
							this.nodeMouseTapHandler(this, event);
						}
					}
				}, this),
			);

			// Node reposition handler
			this.cy.on(
				'position',
				'node',
				$.proxy(function(event) {
					// Get node
					var node = event.cyTarget;

					// Update annotation position
					var annotation = node._private.data.annotation;
					if (annotation) {
						annotation.update();
					}
				}, this),
			);

			// Handle edge events
			this.edgeEventHandler();

			// Set layout
		}, this);
	};

	/**
	 * Load data main function
	 * @returns {boolean} True if the data is loaded
	 */
	AIV.loadData = function() {
		let success = false; // results

		let req = '?request=[';
		for (var i = 0; i < this.genesList.length; i++) {
			req += '{"agi":"' + AIV.genesList[i] + '"}';
			if (i < this.genesList.length - 1) {
				req += ',';
			}
		}
		req += ']';
		var serviceURL = 'https://bar.utoronto.ca/eplant/cgi-bin/get_interactions_dapseq.php' + req;

		$.ajax({
			url: serviceURL,
			type: 'GET',
			dataType: 'json',
		})
			.done(function(data) {
				console.log(data);
			})
			.fail(function() {});

		return success;
	};

	// Ready to run
	$(function() {
		// Initailize AIV
		AIV.initialize();
	});
})(window, jQuery, cytoscape);
