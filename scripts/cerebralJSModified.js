/* cerebral.js */
/* Author: Silvia Frias, modified by Vincent Lau */
/**
 * Designed to work with the last version of cytoscape.js at the moment: 2.2.11
 * This layout place the nodes in horizontal layers.
 * Default settings are set for cerebral
 */

/** MODIFY THESE VARIABLES TO CUSTOMIZE YOUR NETWORK **/

// Map with the color of each layer ({layer1:color1, layer2:color2}) NOTE: changed here
var colors = {
    "Unknown": "#000",
    "Extracellular": "#ffd672",
    "Plasma Membrane": "#edaa27",
    "Cytoskeleton": "#575454",
    "Cytosol": "#e0498a",
    "Mitochondrion": "#41abf9",
    "Peroxisome": "#650065",
    "Plastid": "#13971e",
    "Vacuole": "#ecea3a",
    "Golgi": "#a5a417",
    "Endoplasmic Reticulum": "#d1111b",
    "Nucleus": "#0032ff"
};

// Ordered list of layers from top to bottom NOTE: changed here
var layers = ['Unknown', 'Extracellular', 'Plasma Membrane', 'Cytoskeleton', 'Cytosol', 'Mitochondrion', 'Peroxisome', 'Plastid', 'Vacuole', 'Golgi', 'Endoplasmic Reticulum', 'Nucleus'];

// Name of the attribute that contains the information of the node layer
var layer_attribute_name = "localization";

// Color of hihglighted elements
var highLighColor = "red";

// Background color
var backgroundColor = "#FFFFFF";

// Widht of the line between layers
var gridLineWidth = 0.5;

// Color of the line between layers
var gridColor = 'black';

// Font of the labels of each layer
var font = "14pt Verdana";

//Edges color, width and label color
var edgeColor = '5f5f5f';
var edgeWidth = '0.8px';
var edgeLabel = 'black';

// Node label color
var nodeLabel = 'white';
var borderNodeLabel = 'black';


function filterTable(filter) {
    //REWRITE THIS METHOD TO EXTEND THE FILTERING
}