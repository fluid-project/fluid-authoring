/*
Copyright 2016 Raising the Floor - International
Parts (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

Parts Licenced under the MIT licence

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

(function ($, fluid) {
    "use strict";
    fluid.registerNamespace("fluid.author");

    // Code taken from Underscore 1.8.3, licence:
    // Underscore.js 1.8.3
    // http://underscorejs.org
    // (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
    // Underscore may be freely distributed under the MIT license.

    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds. If `immediate` is passed, trigger the function on the
    // leading edge, instead of the trailing.

    fluid.author.debounce = function (func, wait, immediate) {
        var timeout, args, timestamp, result;

        var later = function () {
            var last = Date.now() - timestamp;

            if (last < wait && last >= 0) {
                timeout = setTimeout(later, wait - last);
            } else {
                timeout = null;
                if (!immediate) {
                    result = func.apply(null, args);
                }
            }
        };

        return function () {
            args = arguments;
            timestamp = Date.now();
            var callNow = immediate && !timeout;
            if (!timeout) {
                timeout = setTimeout(later, wait);
            }
            if (callNow) {
                result = func.apply(null, args);
            }
            return result;
        };
    };

    /** Determines whether one path parsed into segments is a prefix to another.
     * @param prefix {Array of String} The prefix to be checked
     * @param totest {Array of String} The string to be checked for the prefix
     * @return {Boolean} `true` if `prefix` is a prefix for the path `totest`
     */
    fluid.author.isPrefix = function (prefix, totest) {
        if (prefix.length < totest.length) {
            for (var i = 0; i < prefix.length; ++i) {
                if (prefix[i] !== totest[i]) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    };

})(jQuery, fluid_2_0_0);
