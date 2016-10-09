/*
Copyright 2016 Raising the Floor - International

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

(function ($, fluid) {
    "use strict";
    fluid.setLogging(true);

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
                type: "fluid.author.componentGraph.local",
                container: "{componentGraphPanel}.dom.componentGraphHolder",
                options: {
                    ignorableRoots: {
                        panel: "@expand:fluid.pathForComponent({fluid.author.componentGraphPanel})"
                    }
                },
                createOnEvent: "onMarkupReady"
            }
        }
    });

    fluid.defaults("fluid.author.componentGraph", {
        gradeNames: ["fluid.viewComponent", "fluid.author.viewContainer"],
        events: {
            createComponentView: null,
            invalidateLayout: null
        },
        model: {
        // A map of the raw component tree - a mirror of idToPath within the instantiator
        // This is the model state which drives the visible graph layout
        // TODO: We currently ignore injected components
            idToPath: {}
        },
        ignorableRoots: {
            "resolveRootComponent": ["resolveRootComponent"]
        },
        ignorableGrades: {
            "instantiator": "fluid.instantiator"
        },
        members: { // A map of raw component ids to the view peer which represents them
            idToViewMember: {},
            // A map of raw component ids to a "shadow" document, holding a representation of the component at member "that"
            idToShadow: {},
            pathToId: {} // TODO move to model after checking escaping
        },
        modelListeners: {
            "idToPath.*": "fluid.author.componentGraph.updateComponentView({that}, {change}.path, {change}.value)"
        },
        dynamicComponents: {
            componentViews: {
                type: "fluid.author.componentView",
                createOnEvent: "createComponentView",
                options: "{arguments}.0"
            }
        },
        listeners: {
            "invalidateLayout.scheduleLayout": "@expand:fluid.author.debounce({that}.doLayout, 1)"
        },
        invokers: {
            doLayout: "fluid.author.componentGraph.doLayout({that})"
        },
        boxHeight: 80,
        boxWidth: 200,
        verticalGap: 50,
        horizontalGap: 20
    });

    // Mixin grade for componentView in the context of componentGraph so that we can bind 100% of component options
    // to a single reference
    fluid.defaults("fluid.author.componentViewInGraph", {
        parentContainer: "{fluid.author.componentGraphPanel}.dom.componentGraph",
        // Options for dynamicComponentIndexer
        dynamicIndexTargetPath: "idToViewMember",
        dynamicIndexKeyPath: "options.rawComponentId",
        dynamicIndexTarget: "{fluid.author.componentGraph}"
    });

    // A variety of componentGraph which binds to the local instantiator

    fluid.defaults("fluid.author.componentGraph.local", {
        gradeNames: "fluid.author.componentGraph",
        listeners: {
            "onCreate.populateComponents": "fluid.author.componentGraph.populateLocalComponents",
            "{instantiator}.events.onComponentAttach": {
                funcName: "fluid.author.componentGraph.componentAttach",
                args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.3"] // component, path, created
            },
            "{instantiator}.events.onComponentClear": {
                funcName: "fluid.author.componentGraph.componentClear",
                args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.3"] // component, path, created
            }
        }
    });

    /** Accepts a (concrete) path into the target component tree and parses it into a collection of useful pre-geometric info,
     * including the path, reference and shadow of its parent, and member name within it
     * @param componentGraph {componentGraph} A componentGraph component
     * @param path {String} The string form of a concrete component path in its tree
     * @return {Object} A structure of pre-geometric info
     */
    fluid.author.componentGraph.getCoordinates = function (componentGraph, path) {
        var instantiator = fluid.globalInstantiator;
        var parsed = instantiator.parseEL(path);
        var togo = {
            parsed: parsed,
            parentSegs: parsed.slice(0, parsed.length - 1),
            memberName: parsed[parsed.length - 1]
        };
        if (parsed.length > 0) {
            togo.parentPath = instantiator.composeSegments.apply(null, togo.parentSegs);
            togo.parentId = componentGraph.pathToId[togo.parentPath];
            if (togo.parentId) { // It may be missing, if we are racing against ourselves in startup
                togo.parentShadow = componentGraph.idToShadow[togo.parentId];
            }
        }
        return togo;
    };

    fluid.author.componentGraph.isIgnorableComponent = function (componentGraph, coords, that) {
        var isIgnorablePath = fluid.find_if(componentGraph.options.ignorableRoots, function (ignorableRoot) {
            return fluid.author.isPrefix(ignorableRoot, coords.parsed);
        });
        var isIgnorableGrade = fluid.find_if(componentGraph.options.ignorableGrades, function (ignorableGrade) {
            return fluid.hasGrade(that.options, ignorableGrade);
        });
        return isIgnorablePath || isIgnorableGrade;
    };

    fluid.author.componentGraph.mapComponent = function (componentGraph, id, shadow) {
        var coords = fluid.author.componentGraph.getCoordinates(componentGraph, shadow.path);
        if (!fluid.author.componentGraph.isIgnorableComponent(componentGraph, coords, shadow.that)) {
            componentGraph.idToShadow[id] = shadow;
            componentGraph.pathToId[shadow.path] = id;
            if (coords.parentShadow) {
                fluid.set(coords.parentShadow, ["memberToChild", coords.memberName], shadow.that);
            }
            componentGraph.applier.change(["idToPath", id], shadow.path);
        }
    };

    fluid.author.componentGraph.populateLocalComponents = function (that) {
        var instantiator = fluid.globalInstantiator;
        var idToShadow = instantiator.idToShadow;
        fluid.each(idToShadow, function (shadow, id) {
            fluid.author.componentGraph.mapComponent(that, id, shadow);
        });
    };

    fluid.author.componentGraph.componentAttach = function (that, component, path, created) {
        if (created) {
            var shadow = fluid.globalInstantiator.idToShadow[component.id];
            fluid.author.componentGraph.mapComponent(that, component.id, shadow);
        }
    };

    fluid.author.componentGraph.componentClear = function (that, component, path, created) {
        if (created) {
            var shadow = fluid.globalInstantiator.idToShadow[component.id];
            delete that.idToShadow[component.id];
            delete that.pathToId[path];
            var coords = fluid.author.componentGraph.getCoordinates(that, shadow.path);
            if (coords.parentShadow) {
                delete coords.parentShadow.memberToChild[coords.memberName];
            }
            that.applier.change(["idToPath", component.id], null, "DELETE");
        }
    };

    // Sorts more nested views to the front
    fluid.author.depthComparator = function (reca, recb) {
        return recb.rowIndex - reca.rowIndex;
    };

    // TODO: Abuse of shadow by writing extra fields - need to shallow clone just the fields we read
    //     childrenWidth: here
    //     memberToChild: mapComponent
    // Read fields:
    //    path, that
    fluid.author.componentGraph.doLayout = function (componentGraph) {
        fluid.log("LAYOUT BEGUN");
        var records = [];
        fluid.each(componentGraph.idToViewMember, function (viewMember, id) {
            var togo = {};
            togo.shadow = componentGraph.idToShadow[id];
            togo.coords = fluid.author.componentGraph.getCoordinates(componentGraph, togo.shadow.path);
            togo.rowIndex = togo.coords.parsed.length;
            togo.parentMembers = togo.rowIndex === 0 ? 0 : fluid.keys(togo.coords.parentShadow.memberToChild);
            togo.colIndex = togo.rowIndex === 0 ? 0 : togo.parentMembers.indexOf(togo.coords.memberName);
            togo.parentView = togo.rowIndex === 0 ? null : componentGraph[componentGraph.idToViewMember[togo.coords.parentId]];
            records.push(togo);
        });
        records.sort(fluid.author.depthComparator);
        fluid.each(records, function (record) {
            var shadow = record.shadow;
            shadow.childrenWidth = 1;
            fluid.each(shadow.memberToChild, function (child) {
                var childShadow = componentGraph.idToShadow[child.id];
                shadow.childrenWidth += childShadow.childrenWidth;
            });
        });
        records.reverse();
        var o = componentGraph.options;
        fluid.each(records, function (record) {
            var shadow = record.shadow;
            var view = componentGraph[componentGraph.idToViewMember[shadow.that.id]];
            var layout = {
                width: o.boxWidth,
                height: o.boxHeight
            };
            view.applier.change("layout", layout);
        });
        fluid.log("LAYOUT ENDED");
    };

    fluid.author.componentGraph.makeViewComponentOptions = function (componentGraph, id, path) {
        var coords = fluid.author.componentGraph.getCoordinates(componentGraph, path);
        var rowIndex = coords.parsed.length;
        var parentMembers = rowIndex === 0 ? 0 : fluid.keys(coords.parentShadow.memberToChild);
        var colIndex = rowIndex === 0 ? 0 : parentMembers.indexOf(coords.memberName);

        var o = componentGraph.options;
        var paddedWidth = o.boxWidth + o.horizontalGap;
        var parentView = rowIndex === 0 ? null : componentGraph[componentGraph.idToViewMember[coords.parentId]];
        var options = {
            gradeNames: "fluid.author.componentViewInGraph",
            rawComponentId: id,
            path: path,
            model: {
                layout: {
                    // Currently hardwired to CSS size of 2000px - instead set to 0 and compute bounding box, etc.
                    left: parentView ? parentView.model.layout.left + (colIndex - parentMembers.length / 2) * paddedWidth : 1000,
                    top: componentGraph.options.verticalGap + rowIndex * (o.boxHeight + o.verticalGap),
                    width: o.boxWidth,
                    height: o.boxHeight
                }
            }
        };
        return options;
    };

    /** Invoked by the modelListener to the componentGraph's idToPath model block.
     *  Coordinates creation and destruction of a fluid.author.componentView matching these elements
     *  This general pattern is a candidate for entering the core framework "imaging components into existence"
     * - consisting of the confection of i) A dynamicComponent ii) dynamicComponentIndexer, iii) listener to a model domain coordinating creation and destruction
     * - we also want this to cope with arrays
     */
    fluid.author.componentGraph.updateComponentView = function (componentGraph, idPath, path) {
        var id = idPath[1]; // segment 0 is "idToPath"
        if (path === undefined) {
            var viewComponent = componentGraph[componentGraph.idToViewMember[id]];
            viewComponent.destroy();
        } else {
            var options = fluid.author.componentGraph.makeViewComponentOptions(componentGraph, id, path);
            componentGraph.events.createComponentView.fire(options);
            fluid.log("INVALIDATING");
            componentGraph.events.invalidateLayout.fire();
        }
    };

    fluid.author.renderContainer = function (that, containerMarkup, parentContainer) {
        var container = $(containerMarkup);
        parentContainer.append(container);
        return container;
    };

    fluid.defaults("fluid.author.containerRenderingView", {
        gradeNames: "fluid.newViewComponent",
        container: "@expand:fluid.author.renderContainer({that}, {that}.options.markup.container, {that}.options.parentContainer)",
        // The DOM element which to which this component should append its markup on startup
        parentContainer: "fluid.notImplemented" // must be overridden
    });

    fluid.author.numberToCSS = function (element, value, property) {
        if (typeof(value) === "number") {
            element.css(property, value);
        }
    };

    // A component with model-bound fields left, top, width, height which map to the equivalent CSS properties
    fluid.defaults("fluid.author.domPositioning", {
        gradeNames: "fluid.newViewComponent",
        modelListeners: {
            "layout.left":   "fluid.author.numberToCSS({that}.container, {change}.value, left)",
            "layout.top":    "fluid.author.numberToCSS({that}.container, {change}.value, top)",
            "layout.width":  "fluid.author.numberToCSS({that}.container, {change}.value, width)",
            "layout.height": "fluid.author.numberToCSS({that}.container, {change}.value, height)"
        }
    });

    fluid.defaults("fluid.author.componentView", {
        gradeNames: ["fluid.newViewComponent", "fluid.author.containerRenderingView", "fluid.indexedDynamicComponent", "fluid.author.domPositioning"],
        markup: {
            container: "<table class=\"fld-author-componentView\"><tbody><tr><td>fluid.rootComponent</td></tr></tbody></table>"
        }
    });

})(jQuery, fluid_2_0_0);
