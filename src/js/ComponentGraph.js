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
                container: "{componentGraphPanel}.dom.componentGraph",
                options: {
                    ignorableRoots: {
                        panel: "@expand:fluid.pathForComponent({fluid.author.componentGraphPanel})"
                    },
                    components: {
                        svgPane: {
                            type: "fluid.author.svgPaneInGraphPanel"
                        }
                    }
                },
                createOnEvent: "onMarkupReady"
            }
        }
    });

    fluid.defaults("fluid.author.svgPaneInGraphPanel", {
        gradeNames: ["fluid.author.svgPane", "fluid.author.domPositioning"],
        parentContainer: "{fluid.author.componentGraphPanel}.dom.componentGraphHolder",
        markup: {
            container: "<svg class=\"fld-author-svgPane\"></svg>"
        },
        model: {
            layout: "{fluid.author.componentGraph}.model.layout"
        },
        events: {
            "createArrow": null
        },
        components: {
            arrows: {
                type: "fluid.author.svgArrow",
                createOnEvent: "createArrow",
                options: {
                    parentContainer: "{fluid.author.svgPane}.container"
                }
            }
        },
        listeners: {
            onCreate: "{that}.events.createArrow.fire()"
        }
    });

    fluid.defaults("fluid.author.svgArrow", {
        gradeNames: ["fluid.newViewComponent", "fluid.author.containerSVGRenderingView"],
        markup: {
            arrow: "<polygon xmlns=\"http://www.w3.org/2000/svg\" class=\"fld-author-arrow\" points=\"%points\"/>"
        },
        arrowGeometry: {
            length: 100,
            width: 10,
            headWidth: 20,
            headHeight: 30
        },
        arrowPoints: "@expand:fluid.author.svgArrow.renderArrowPoints({that}.options.arrowGeometry)",
        invokers: {
            renderMarkup: {
                funcName: "fluid.stringTemplate",
                args: ["{that}.options.markup.arrow", {points: "{that}.options.arrowPoints"}]
            }
        }
    });

    fluid.author.pointsToSVG = function (points) {
        return fluid.transform(points, function (point) {
            return (100 + point[0]) + "," + (100 + point[1]);
        }).join(" ");
    };

    fluid.author.svgArrow.renderArrowPoints = function (arrowGeometry) {
        var w = arrowGeometry.width / 2,
            hw = arrowGeometry.headWidth / 2,
            hp = arrowGeometry.length - arrowGeometry.headHeight;
        var points = [
            [-w, 0], [w, 0],
            [w, hp], [hw, hp],
            [0, arrowGeometry.length],
            [-hw, hp], [-w, hp]];
        return fluid.author.pointsToSVG(points);
    };

    fluid.defaults("fluid.author.svgPane", {
        gradeNames: ["fluid.newViewComponent", "fluid.author.containerRenderingView"],
        markup: {
            container: "<svg></svg>"
        }
    });

    fluid.defaults("fluid.author.componentGraph", {
        gradeNames: ["fluid.viewComponent", "fluid.author.viewContainer", "fluid.author.domPositioning"],
        events: {
            createComponentView: null,
            invalidateLayout: null
        },
        model: {
        // A map of the raw component tree - a mirror of idToPath within the instantiator
        // This is the model state which drives the visible graph layout
        // TODO: We currently ignore injected components
            idToPath: {},
            layout: {
                width: 2000,
                height: 2000
            }
        },
        ignorableRoots: {
            "resolveRootComponent": ["resolveRootComponent"]
        },
        ignorableGrades: {
            "instantiator": "fluid.instantiator",
            "resolveRootComponent": "fluid.resolveRootComponent"
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
            doLayout: "fluid.author.componentGraph.doLayout({that})",
            idToView: "fluid.author.componentGraph.idToView({that}, {arguments}.0)"
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

    /** Looks up the id of a target component to the componentView component peering with it
     * @param componentGraph {componentGraph} a componentGraph component
     * @param id {String} The id of a target component
     * @return {Component} The corresponding {componentView} component
     */
    fluid.author.componentGraph.idToView = function (componentGraph, id) {
        return componentGraph[componentGraph.idToViewMember[id]];
    };

    fluid.author.componentGraph.isIgnorableComponent = function (componentGraph, coords, that) {
        var isIgnorablePath = fluid.find_if(componentGraph.options.ignorableRoots, function (ignorableRoot) {
            return fluid.author.isPrefix(ignorableRoot, coords.parsed);
        });
        var isIgnorableGrade = fluid.find_if(componentGraph.options.ignorableGrades, function (ignorableGrade) {
            return fluid.hasGrade(that.options, ignorableGrade) || that.typeName === ignorableGrade;
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
        //var p1 = reca.coords.parsed, p2 = recb.coords.parsed;
        //for (var i = 0; i < p1
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
            records.push(togo);
        });
        records.sort(fluid.author.depthComparator);
        var o = componentGraph.options;
        // Phase 1: Moving upwards, accumulate total child width of each tree route
        fluid.each(records, function (record) {
            var shadow = record.shadow;
            var view = componentGraph.idToView(shadow.that.id);
            var selfWidth = view.model.layout.width;
            var childrenWidth = -o.horizontalGap;
            fluid.each(shadow.memberToChild, function (child) {
                var childShadow = componentGraph.idToShadow[child.id];
                childrenWidth += childShadow.childrenWidth + o.horizontalGap;
            });
            shadow.childrenWidth = Math.max(selfWidth, childrenWidth);
        });
        records.reverse();
        // Phase 2: Moving downwards, position children with respect to parents
        var rootLayout = {
        };
        fluid.each(records, function (record, index) {
            var shadow = record.shadow;
            var view = componentGraph.idToView(shadow.that.id);
            if (index === 0) {
                view.applier.change("layout", {
                    left: shadow.childrenWidth / 2 + o.horizontalGap,
                    top: o.verticalGap
                });
                rootLayout.width = shadow.childrenWidth + o.horizontalGap * 2;
            }
            // Start at the extreme position for the window containing all of our children
            var childLeft = view.model.layout.left + (view.model.layout.width - shadow.childrenWidth) / 2;
            fluid.log("Considering component " + shadow.that.id + " with " + fluid.keys(shadow.memberToChild).length + " children");
            fluid.log("Own view has left of " + view.model.layout.left + " childrenWidth is " + shadow.childrenWidth + " starting childLeft at " + childLeft);
            fluid.each(shadow.memberToChild, function (child, member) {
                fluid.log("Considering member " + member);
                var childShadow = componentGraph.idToShadow[child.id];
                var childView = componentGraph.idToView(child.id);
                var thisChildLeft = childLeft + (childShadow.childrenWidth - childView.model.layout.width) / 2;
                childView.applier.change("layout", {
                    left: thisChildLeft,
                    top: o.verticalGap + (record.rowIndex + 1) * (o.boxHeight + o.verticalGap)
                });
                fluid.log("Assigned left of " + childLeft + " to component id " + child.id);
                rootLayout.height = childView.model.layout.top + (o.boxHeight + o.verticalGap);
                childLeft += childShadow.childrenWidth + o.horizontalGap;
            });
        });
        componentGraph.applier.change("layout", rootLayout);
        fluid.log("LAYOUT ENDED");
    };

    fluid.author.componentGraph.makeViewComponentOptions = function (componentGraph, id, path) {
        var o = componentGraph.options;
        var options = {
            gradeNames: "fluid.author.componentViewInGraph",
            rawComponentId: id,
            path: path,
            model: {
                layout: {
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
            var viewComponent = componentGraph.idToView(id);
            viewComponent.destroy();
        } else {
            var options = fluid.author.componentGraph.makeViewComponentOptions(componentGraph, id, path);
            componentGraph.events.createComponentView.fire(options);
            fluid.log("INVALIDATING");
            componentGraph.events.invalidateLayout.fire();
        }
    };

    fluid.author.renderContainer = function (that, renderMarkup, parentContainer) {
        var containerMarkup = renderMarkup();
        var container = $(containerMarkup);
        parentContainer.append(container);
        return container;
    };

    fluid.author.renderSVGContainer = function (that, renderMarkup, parentContainer) {
        var containerMarkup = renderMarkup();
        // Approach taken from http://stackoverflow.com/a/36507333
        var container = $.parseXML(containerMarkup);
        parentContainer.append(container.documentElement);
        return container;
    };

    fluid.defaults("fluid.author.containerRenderingView", {
        gradeNames: "fluid.newViewComponent",
        invokers: {
            renderMarkup: "fluid.identity({that}.options.markup.container)"
        },
        container: "@expand:fluid.author.renderContainer({that}, {that}.renderMarkup, {that}.options.parentContainer)",
        // The DOM element which to which this component should append its markup on startup
        parentContainer: "fluid.notImplemented" // must be overridden
    });

    fluid.defaults("fluid.author.containerSVGRenderingView", {
        gradeNames: "fluid.author.containerRenderingView",
        container: "@expand:fluid.author.renderSVGContainer({that}, {that}.renderMarkup, {that}.options.parentContainer)"
    });

    fluid.author.numberToCSS = function (element, value, property) {
        if (typeof(value) === "number") {
            element.css(property, value);
        }
    };

    // A component with model-bound fields left, top, width, height which map to the equivalent CSS properties
    fluid.defaults("fluid.author.domPositioning", {
        // gradeNames: "fluid.newViewComponent",
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
            container: "<table class=\"fld-author-componentView\"><tbody>%childRows</tbody></table>",
            gradeRow: "<tr><td>%gradeNames</td></tr>"
        },
        invokers: {
            renderMarkup: "fluid.author.componentView.renderMarkup({componentGraph}, {that}, {that}.options.rawComponentId, {that}.options.markup)"
        }
    });

    fluid.author.componentView.renderMarkup = function (componentGraph, componentView, rawComponentId, markupBlock) {
        var shadow = componentGraph.idToShadow[rawComponentId];
        var that = shadow.that;
        var gradeNames = [that.typeName].concat(fluid.makeArray(fluid.get(shadow.that, ["options", "gradeNames"])));
        var filteredGrades = fluid.author.filterGrades(gradeNames, fluid.author.ignorableGrades);
        var model = {
            gradeNames: filteredGrades.join(", ")
        };
        var containerModel = {
            childRows: fluid.stringTemplate(markupBlock.gradeRow, model)
        };
        var containerMarkup = fluid.stringTemplate(markupBlock.container, containerModel);
        return containerMarkup;
    };

})(jQuery, fluid_2_0_0);
