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
            pane: "<div class=\"flc-author-componentGraph\"></div>"
        },
        components: {
            graph: {
                type: "fluid.author.componentGraph",
                container: "{componentGraphPanel}.dom.pane",
                createOnEvent: "onMarkupReady"
            }
        }
    });

    fluid.defaults("fluid.author.componentGraph", {
        gradeNames: "fluid.viewComponent"
    });

})(jQuery, fluid_2_0_0);
