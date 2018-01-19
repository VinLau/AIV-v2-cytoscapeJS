/* layout.horitzontal.js */
/* Author: Silvia Frias */
/* See original code by Silvia here: https://github.com/silviafrias/cerebral-web */
/* Author: modified by Vincent Lau for use in AIV 2.0 */
/**
 * Designed to work with the last version of cytoscape.js at the moment: 2.2.11
 * This layout place the nodes in horizontal layers.
 */

/* DO NOT MODIFY CODE BELOW THIS LINE */
window.cerebralNamespace = {}; // NOTE: added namespace property
window.cerebralNamespace.options = { // NOTE: changed from global variable to namespaced
    name: 'cerebral',
    colors: colors,
    layer_attribute_name: layer_attribute_name,
    layers: layers,
    background: backgroundColor,
    lineWidth: gridLineWidth,
    strokeStyle: gridColor,
    font: font
};

// NOTE: deleted the cerebreal_ready, highlight, resetHighLight functions, var cy, defaultNodeColor, cerebral_style

(function($$) {

    var defaults = {
        fit: true, // whether to fit the viewport to the graph
        padding: 30, // padding used on fit
        layers: ["layer 1", "layer 2", "layer 3"], //ordered from top to bottom
        colors: {"layer 1": "red", "layer 2": "blue", "layer 3": "green"}, // colors of the layers
        layer_attribute_name: "layer", //name of the attribute that contains the information of the node layer
        background: "#FFFFFF", //background color
        lineWidth: 0.2, // widht of the line between layers
        strokeStyle: 'black', // color of the line between layers
        font: "12pt Arial", // font of the labels of each layer
    };

    function CerebralLayout(options) {
        this.options = $.extend({}, defaults, options); // NOTE: changed here from $$ to $, i.e. jQuery instead of cytoscape
    }

    CerebralLayout.prototype.run = function() {
        var options = this.options;
        var cy = options.cy;
        var totalNodes = cy.nodes().length;

        var container = cy.container();
        var width = container.clientWidth - 180;

        //grid
        var objCanvas = document.createElement('canvas');
        objCanvas.style.position = "absolute";
        objCanvas.style.zIndex = "-4";
        // objCanvas.setAttribute("data-id", "grid"); // NOTE: commented this out
        objCanvas.setAttribute("id", "cerebralBackground"); // NOTE: instead added a regular id for removal later
        objCanvas.setAttribute("width", container.clientWidth);
        objCanvas.setAttribute("height", container.clientHeight);
        var aux = [];
        for (let l = 0; l < container.childNodes.length; l++) {
            if (container.childNodes[l].innerHTML && container.childNodes[l].innerHTML.startsWith("<canvas")) {
                container.childNodes[l].appendChild(objCanvas);
            } else {
                aux.push(container.childNodes[l]);
            }
        }
        for (let e = 0; e < aux.length; e++) {
            container.removeChild(aux[e]);
        }
        var objContext = objCanvas.getContext("2d");
        objContext.globalCompositeOperation = 'source-over';

        objContext.fillStyle = options.background;
        objContext.fillRect(0, 0, container.clientWidth, container.clientHeight);

        objContext.textAlign = "end";

        var nodes = {};
        //If layers is not defined we'll extract layer data from elements.
        var extractLayers = (options.layers.length <= 0);
        // var extractLayers = true;
        // if (options.layers.length > 0) {
        //     extractLayers = false;
        // }
        var auxColors = ['#058DC7', '#50B432', '#ED561B', '#DDDF00', '#24CBE5', '#64E572', '#FF9655', '#FFF263', '#6AF9C4'];
        var n = cy.nodes();
        for (let i = 0; i < n.length; i++) {
            if (extractLayers && options.layers.indexOf(n[i].data(options.layer_attribute_name)) === -1) {
                options.layers.push(n[i].data(options.layer_attribute_name));
            }
            if (options.colors[n[i].data(options.layer_attribute_name)] === undefined) {
                let col;
                if (options.layers.length - 1 < auxColors.length) {
                    col = auxColors[options.layers.indexOf(n[i].data(options.layer_attribute_name))];
                }
                else {
                    col = '#' + Math.floor(Math.random() * 16777215).toString(16);
                }
                options.colors[n[i].data(options.layer_attribute_name)] = col;
            }
            n[i].data('color', options.colors[n[i].data(options.layer_attribute_name)]);
        }

        for (let j = 0; j < options.layers.length; j++) {
            var nodesAux = cy.elements("node[" + options.layer_attribute_name + " = '" + options.layers[j] + "']");
            if (nodesAux.length > 0) {
                nodes[options.layers[j]] = nodesAux;
            }
        }

        var height = 0;
        var heightAcum = 0;
        var numLines = Object.keys(nodes).length - 1;
        var room = 50;

        objContext.lineWidth = options.lineWidth;
        objContext.strokeStyle = options.strokeStyle;
        objContext.textBaseline = "middle";
        objContext.font = options.font;
        objContext.setLineDash([5, 10]); //make line dashed

        for (let k = 0; k < options.layers.length; k++) {
            var nodesAuxInLayer = nodes[options.layers[k]];
            if (nodesAuxInLayer !== undefined && nodesAuxInLayer.length > 0) {

                height = Math.ceil((container.clientHeight - (numLines * room)) / (totalNodes / nodesAuxInLayer.length));
                var line = heightAcum + height + (room / 2);

                if (k !== 11){ // if k is 11, do not draw the line, as this is the nucleus, we want to include this line with the DNA chromosomes at the bottom
                    objContext.beginPath();
                    objContext.moveTo(0, line);
                    objContext.lineTo(objCanvas.width, line);
                    objContext.stroke();
                }
                objContext.fillStyle = options.colors[options.layers[k]];

                var y = heightAcum + Math.ceil((height) / 2);
                if (heightAcum === 0) {
                    y = line / 2;
                }

                objContext.fillText(options.layers[k], container.clientWidth - 10, y);
                nodesAuxInLayer.positions(function(element, j) { //NOTE: changed here from elements, j to elements, j, likely to cytoscapejs version update
                    if (element.locked()) {
                        return false;
                    }

                    return {
                        x: Math.round((Math.random() * width) + 5),
                        y: Math.round((Math.random() * height) + heightAcum + 30)
                    };
                });
                heightAcum += height + room;
            }
        }

        cy.one("layoutready", options.ready);
        cy.trigger("layoutready");

        cy.one("layoutstop", options.stop);
        cy.trigger("layoutstop");
    };



    // called on continuous layouts to stop them before they finish
    CerebralLayout.prototype.stop = function() {
        var options = this.options;
        var cy = options.cy;

        cy.one('layoutstop', options.stop);
        cy.trigger('layoutstop');
    };


    $$("layout", "cerebral", CerebralLayout);

})(cytoscape);

//Some useful functions
if (typeof String.prototype.startsWith !== 'function') {
    String.prototype.startsWith = function(str) {
        return this.substring(0, str.length) === str;
    };
}