/*!
 * Dynamic Component Indexer
 *
 * Copyright 2016 Raising the Floor - International
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/GPII/universal/blob/master/LICENSE.txt
 */

// TODO: taken from GPII's lifecycleManager - consolidate and share

(function ($, fluid) {
    "use strict";

    /** Maintains an index on a parent component of a collection of dynamic components which maps
     * the value held at some specified path on the dynamic component onto the component's member name
     * A piece of "proto-framework" which is a framework candidate.
     */

    fluid.defaults("fluid.indexedDynamicComponent", {
        gradeNames: "fluid.component",
        mergePolicy: {
            dynamicIndexTarget: "noexpand"
        },
        // Reference to component holding the index
        dynamicIndexTarget: "fluid.mustBeOverridden",
        // The path of the collection/member at which the index is to be held
        dynamicIndexTargetPath: "fluid.mustBeOverridden",
        // The path in this component at which the key is to be found
        dynamicIndexKeyPath: "fluid.mustBeOverridden",
        listeners: {
            "onCreate.indexedDynamicComponent": "fluid.indexedDynamicComponent.onCreate({that}, {{that}.options.dynamicIndexTarget})",
            "onDestroy.indexedDynamicComponent": "fluid.indexedDynamicComponent.onDestroy({that}, {{that}.options.dynamicIndexTarget})"
        }
    });

    fluid.indexedDynamicComponent.onCreate = function (that, indexTarget) {
        var key = fluid.getForComponent(that, that.options.dynamicIndexKeyPath);
        var ourPath = fluid.pathForComponent(that);
        var memberName = ourPath[ourPath.length - 1];
        var index = fluid.get(indexTarget, that.options.dynamicIndexTargetPath);
        index[key] = memberName;
    };

    fluid.indexedDynamicComponent.onDestroy = function (that, indexTarget) {
        var key = fluid.getForComponent(that, that.options.dynamicIndexKeyPath);
        var index = fluid.get(indexTarget, that.options.dynamicIndexTargetPath);
        if (index) { // workaround for FLUID-5930
            delete index[key];
        }
    };

})(jQuery, fluid_2_0_0);
