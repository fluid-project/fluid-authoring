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

    fluid.defaults("fluid.decoratorViewComponent", {
        mergePolicy: {
            decorators: "noexpand"
        },
        events: {
            onDomBind: null,
            onDomUnbind: null
        },
        listeners: {
            onCreate: "{that}.events.onDomBind.fire({that}, {that}.container)",
            onDestroy: "{that}.events.onDomUnbind.fire({that}, {that}.container)",
            onDomBind: "fluid.decoratorViewComponent.processDecorators({that}, {that}.options.decorators)"
        }
    });

    fluid.expandCompoundArg = function (that, arg, name) {
        var expanded = arg;
        if (typeof(arg) === "string") {
            if (arg.indexOf("(") !== -1) {
                var invokerec = fluid.compactStringToRec(arg, "invoker");
                // TODO: perhaps a a courtesy we could expose {node} or even {this}
                expanded = fluid.makeInvoker(that, invokerec, name);
            } else {
                expanded = fluid.expandOptions(arg, that);
            }
        }
        return expanded;
    };

    fluid.processjQueryDecorator = function (dec, node, that, name) {
        var args = fluid.makeArray(dec.args);
        var expanded = fluid.transform(args, function (arg, index) {
            return fluid.expandCompoundArg(that, arg, name + " argument " + index);
        });
        console.log("Got expanded value of ", expanded, " for jQuery decorator");
        var func = node[dec.method];
        return func.apply(node, expanded);
    };

    fluid.decoratorViewComponent.processDecorators = function (that, decorators) {
        fluid.each(decorators, function (val, key) {
            var node = that.locate(key);
            if (node.length > 0) {
                var name = "Decorator for DOM node with selector " + key + " for component " + fluid.dumpThat(that);
                var decs = fluid.makeArray(val);
                fluid.each(decs, function (dec) {
                    if (dec.type === "jQuery") {
                        fluid.processjQueryDecorator(dec, node, that, name);
                    }
                });
            }
        });
    };

})(jQuery, fluid_2_0_0);
