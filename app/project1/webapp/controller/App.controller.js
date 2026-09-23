sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {

    "use strict";

    return Controller.extend("po.controller.App", {

        onInit: function () {

            console.log(
                "App controller loaded successfully"
            );

        }

    });

});