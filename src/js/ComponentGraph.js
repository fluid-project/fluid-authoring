/*
Copyright 2016 Raising the Floor - International

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

var fluid_2_0_0 = fluid_2_0_0 || {};

(function ($, fluid) {
    "use strict";

    fluid.defaults("fluid.author.componentGraphPanel", {
        gradeNames: "fluid.author.popupPanel",
        markup: {
            pane: "<div class=\"fld-author-componentGraphHolder\"><div class=\"fld-author-componentGraph\"></div></div>"
        },
        selectors: {
            componentGraphHolder: ".fld-author-componentGraphHolder",
            componentGraph: ".fld-author-componentGraph"
        },
        components: {
            graph: {
                type: "fluid.author.componentGraph",
                container: "{componentGraphPanel}.dom.componentGraphHolder",
                createOnEvent: "onMarkupReady"
            }
        }
    });

    fluid.defaults("fluid.author.componentGraph", {
        gradeNames: ["fluid.viewComponent", "fluid.author.viewContainer"],
        listeners: {
            "onCreate.createView": "{that}.events.createComponentView.fire()"
        },
        events: {
            createComponentView: null
        },
        dynamicComponents: {
            graphs: {
                type: "fluid.author.componentView",
                createOnEvent: "createComponentView",
                container: "body", // Nothing we can do to get this right first time, sadly
                options: {
                    parentContainer: "{fluid.author.componentGraphPanel}.dom.componentGraph"
                }
            }
        }
    });

    fluid.author.typeNameToMember = function (typeName) {
        var memberName = typeName.replace(/\./g, "-");
        return memberName;
    };

    // There's simply nothing we can do in the current framework to break the race between "container" and the component's construction.
    // Since it is not a proper option, we can't even use the ginger process to reach into the component's options with an expander,
    // because it hasn't started to construct yet and there's no way to issue a stable reference that will bind to it ({that} will always refer to its parent)
    // This consists of the 2nd half of fluid.prefs.subPanel.resetDomBinder from Panels.js
    fluid.author.resetDomBinder = function (that, newContainer) {
        that.container = newContainer;
        if (that.container.length === 0) {
            fluid.fail("resetDomBinder got no elements in DOM for container searching for selector " + that.container.selector);
        }
        fluid.initDomBinder(that, that.options.selectors);
        that.events.onDomBind.fire(that);
    };

    fluid.author.renderContainer = function (that) {
        var container = $(that.options.markup.container);
        that.options.parentContainer.append(container);
        fluid.author.resetDomBinder(that, container);
        return container;
    };

    fluid.defaults("fluid.author.containerRenderingView", {
        gradeNames: "fluid.viewComponent",
        events: {
            onDomBind: null
        },
        parentContainer: "fluid.notImplemented", // must be overridden
        invokers: {
            renderContainer: {
                funcName: "fluid.author.renderContainer",
                args: ["{that}"] // TODO: FLUID-5903 double context references
            }
        },
        listeners: {
            "onCreate.renderContainer": "{that}.renderContainer"
        }
    });

    fluid.defaults("fluid.author.componentView", {
        gradeNames: ["fluid.viewComponent", "fluid.author.containerRenderingView"],
        markup: {
            container: "<table class=\"fld-author-componentView\"><tbody><tr><td>fluid.rootComponent</td></tr></tbody></table>"
        }
    });

})(jQuery, fluid_2_0_0);
