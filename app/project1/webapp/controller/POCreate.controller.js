sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/BindingMode",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Input",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/HBox",
    "sap/m/Column",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/Filter",
"sap/ui/model/FilterOperator"
], function (
    Controller,
    JSONModel,
    BindingMode,
    MessageToast,
    MessageBox,
    Dialog,
    Input,
    Button,
    HBox,
    Label,
    Column,
    BusyIndicator,
    Filter,
    FilterOperator
) {

    "use strict";

    return Controller.extend("po.controller.POCreate", {

        // =========================================================
        // INIT
        // =========================================================

        onInit: function () {
             this._aCustomColumns = [];
this._oBaseItemTemplate = null;
this._iOriginalColumnCount = null;
            var oPOModel = new JSONModel({

                ID: "",

                RequestID:
                    "REQ-" + Date.now(),

                poNumber: "",

                poDate:
                    this._getToday(),

                currency: "INR",

                mha: "",

                deliveryDate: "",

                billToCustomer: "",

                shipToCustomer: "",

                supplier: "",

                supplierAddress: "",

                specialInstructions: "",

                status: "Draft",

                sentToApproval: false,

                totalAmount: 0,

                totalItems: 0,

                items: []
            });


            // IMPORTANT:
            // Allows editing values in the JSON model
            oPOModel.setDefaultBindingMode(
                BindingMode.TwoWay
            );


            this.getView().setModel(
                oPOModel,
                "po"
            );


            // ---------------------------------------------------------
            // PO LIST MODEL
            // ---------------------------------------------------------

            var oPOListModel =
                new JSONModel({
                    PurchaseOrders: []
                });


            this.getView().setModel(
                oPOListModel,
                "poList"
            );


            // Load POs
            this._loadPurchaseOrders();
        },


        // =========================================================
        // TODAY
        // =========================================================

        _getToday: function () {

            var oDate =
                new Date();

            var yyyy =
                oDate.getFullYear();

            var mm =
                String(
                    oDate.getMonth() + 1
                ).padStart(2, "0");

            var dd =
                String(
                    oDate.getDate()
                ).padStart(2, "0");


            return (
                yyyy +
                "-" +
                mm +
                "-" +
                dd
            );
        },


        // =========================================================
        // LOAD PURCHASE ORDERS
        // =========================================================

        _loadPurchaseOrders: async function () {

            try {

                var oPOListModel =
                    this.getView()
                        .getModel("poList");


                var sURL =
                    "/cat-service/PurchaseOrders?$expand=items";


                var response =
                    await fetch(
                        sURL,
                        {
                            method: "GET",

                            headers: {
                                "Accept":
                                    "application/json"
                            }
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        "HTTP Error: " +
                        response.status
                    );
                }


                var oData =
                    await response.json();


                console.log(
                    "Purchase Orders loaded:",
                    oData
                );


                var aPOs =
                    oData.value || [];


                oPOListModel.setProperty(
                    "/PurchaseOrders",
                    aPOs
                );


                console.log(
                    "PO List:",
                    aPOs
                );


                if (aPOs.length > 0) {

                    MessageToast.show(
                        aPOs.length +
                        " Purchase Orders loaded"
                    );
                }


            } catch (oError) {

                console.error(
                    "Error loading Purchase Orders:",
                    oError
                );


                MessageBox.error(
                    "Unable to load Purchase Orders.\n\n" +
                    oError.message
                );
            }
        },


        // =========================================================
        // PO NUMBER CHANGE
        // USER SELECTS ONLY PO NUMBER
        // =========================================================

       // =========================================================
// PO NUMBER CHANGE
// LOAD SELECTED PO DIRECTLY FROM CAP ODATA
// =========================================================

onPOChange: async function (oEvent) {

    // Reset custom columns when PO changes
    this._resetCustomColumns();

    var oSelect =
        oEvent.getSource();

    var sSelectedPO =
        oSelect.getSelectedKey();

    console.log(
        "Selected PO:",
        sSelectedPO
    );

    // ---------------------------------------------------------
    // NOTHING SELECTED
    // ---------------------------------------------------------

    if (!sSelectedPO) {

        this._clearPOData();

        return;
    }

    try {

        BusyIndicator.show(0);

        // -----------------------------------------------------
        // ESCAPE PO NUMBER FOR ODATA FILTER
        // -----------------------------------------------------

        var sSafePO =
            String(sSelectedPO)
                .replace(/'/g, "''");

        var sFilter =
            "poNumber eq '" +
            sSafePO +
            "'";


        // -----------------------------------------------------
        // LOAD SELECTED PO + ITEMS FROM CAP
        // -----------------------------------------------------

        var sURL =
            "/cat-service/PurchaseOrders" +
            "?$filter=" +
            encodeURIComponent(
                sFilter
            ) +
            "&$expand=items";


        console.log(
            "Loading selected PO:",
            sURL
        );


        var oResponse =
            await fetch(
                sURL,
                {
                    method: "GET",

                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        // -----------------------------------------------------
        // CHECK RESPONSE
        // -----------------------------------------------------

        if (!oResponse.ok) {

            throw new Error(
                "OData request failed. HTTP status: " +
                oResponse.status
            );
        }


        // -----------------------------------------------------
        // READ RESPONSE
        // -----------------------------------------------------

        var oData =
            await oResponse.json();


        console.log(
            "Selected PO OData response:",
            oData
        );


        // -----------------------------------------------------
        // CHECK PO EXISTS
        // -----------------------------------------------------

        if (
            !oData ||
            !Array.isArray(
                oData.value
            ) ||
            oData.value.length === 0
        ) {

            MessageBox.error(
                "Purchase Order " +
                sSelectedPO +
                " was not found."
            );

            return;
        }


        // -----------------------------------------------------
        // GET SELECTED PO
        // -----------------------------------------------------

        var oSelectedPO =
            oData.value[0];


        console.log(
            "Selected PO Details:",
            oSelectedPO
        );

        console.log(
            "Selected PO Items:",
            oSelectedPO.items || []
        );


        // -----------------------------------------------------
        // USE YOUR EXISTING METHOD
        // -----------------------------------------------------

        this._setSelectedPO(
            oSelectedPO
        );


        console.log(
            "PO loaded successfully:",
            sSelectedPO
        );


    } catch (oError) {

        console.error(
            "PO Selection Error:",
            oError
        );

        MessageBox.error(
            "Unable to load Purchase Order.\n\n" +
            (
                oError.message ||
                String(oError)
            )
        );

    } finally {

        BusyIndicator.hide();

    }
},


        // =========================================================
        // SET SELECTED PO
        // =========================================================

        _setSelectedPO: function (
            oSelectedPO
        ) {

            var oPOModel =
                this.getView()
                    .getModel("po");


            // ---------------------------------------------------------
            // PO ID
            // ---------------------------------------------------------

            oPOModel.setProperty(
                "/ID",
                oSelectedPO.ID || ""
            );


            // ---------------------------------------------------------
            // REQUEST ID - AUTOMATIC
            // USER DOES NOT SELECT THIS
            // ---------------------------------------------------------

            oPOModel.setProperty(
                "/RequestID",
                oSelectedPO.RequestID || ""
            );


            // ---------------------------------------------------------
            // HEADER
            // ---------------------------------------------------------

            oPOModel.setProperty(
                "/poNumber",
                oSelectedPO.poNumber || ""
            );


            oPOModel.setProperty(
                "/poDate",
                oSelectedPO.poDate || ""
            );


            oPOModel.setProperty(
                "/currency",
                oSelectedPO.currency || "INR"
            );


            oPOModel.setProperty(
                "/mha",
                oSelectedPO.mha || ""
            );


            oPOModel.setProperty(
                "/deliveryDate",
                oSelectedPO.deliveryDate || ""
            );


            oPOModel.setProperty(
                "/billToCustomer",
                oSelectedPO.billToCustomer || ""
            );


            oPOModel.setProperty(
                "/shipToCustomer",
                oSelectedPO.shipToCustomer || ""
            );


            oPOModel.setProperty(
                "/supplier",
                oSelectedPO.supplier || ""
            );


            oPOModel.setProperty(
                "/supplierAddress",
                oSelectedPO.supplierAddress || ""
            );


            oPOModel.setProperty(
                "/specialInstructions",
                oSelectedPO.specialInstructions || ""
            );


            oPOModel.setProperty(
                "/status",
                oSelectedPO.status || "Draft"
            );


            oPOModel.setProperty(
                "/sentToApproval",
                oSelectedPO.sentToApproval || false
            );


            // ---------------------------------------------------------
            // ITEMS
            // ---------------------------------------------------------

            var aItems =
                oSelectedPO.items || [];


            var aFormattedItems =
                aItems.map(
                    function (oItem) {

                        return {

                            ID:
                                oItem.ID || "",

                            parent_ID:
                                oItem.parent_ID ||
                                oSelectedPO.ID ||
                                "",

                            subRequestID:
                                Number(
                                    oItem.subRequestID
                                ) || 0,

                            materialcode:
                                oItem.materialcode ||
                                "",

                            materialdescription:
                                oItem.materialdescription ||
                                "",

                            plant:
                                oItem.plant ||
                                "",

                            unit:
                                oItem.unit ||
                                "",

                            quantity:
                                Number(
                                    oItem.quantity
                                ) || 0,

                            unitPrice:
                                Number(
                                    oItem.unitPrice
                                ) || 0,

                            discountPercent:
                                Number(
                                    oItem.discountPercent
                                ) || 0,

                            totalPrice:
                                Number(
                                    oItem.totalPrice
                                ) || 0
                        };
                    }
                );


            oPOModel.setProperty(
                "/items",
                aFormattedItems
            );


            // ---------------------------------------------------------
            // TOTALS
            // ---------------------------------------------------------

            oPOModel.setProperty(
                "/totalItems",
                aFormattedItems.length
            );


            var fTotalAmount =
                aFormattedItems.reduce(
                    function (
                        fTotal,
                        oItem
                    ) {

                        return (
                            fTotal +
                            (
                                Number(
                                    oItem.totalPrice
                                ) || 0
                            )
                        );
                    },
                    0
                );


            oPOModel.setProperty(
                "/totalAmount",
                Number(
                    fTotalAmount.toFixed(2)
                )
            );


            // ---------------------------------------------------------
            // CLEAR TABLE SELECTION
            // ---------------------------------------------------------

            var oTable =
                this.byId("itemsTable");


            if (oTable) {

                oTable.removeSelections(
                    true
                );
            }


            MessageToast.show(
                oSelectedPO.poNumber +
                " selected - " +
                aFormattedItems.length +
                " items loaded"
            );


            console.log(
                "Items loaded:",
                aFormattedItems
            );
        },


        // =========================================================
        // CLEAR PO
        // =========================================================

        _clearPOData: function () {

            var oPOModel =
                this.getView()
                    .getModel("po");


            oPOModel.setProperty(
                "/ID",
                ""
            );


            oPOModel.setProperty(
                "/RequestID",
                "REQ-" + Date.now()
            );


            oPOModel.setProperty(
                "/poNumber",
                ""
            );


            oPOModel.setProperty(
                "/poDate",
                this._getToday()
            );


            oPOModel.setProperty(
                "/currency",
                "INR"
            );


            oPOModel.setProperty(
                "/mha",
                ""
            );


            oPOModel.setProperty(
                "/deliveryDate",
                ""
            );


            oPOModel.setProperty(
                "/billToCustomer",
                ""
            );


            oPOModel.setProperty(
                "/shipToCustomer",
                ""
            );


            oPOModel.setProperty(
                "/supplier",
                ""
            );


            oPOModel.setProperty(
                "/supplierAddress",
                ""
            );


            oPOModel.setProperty(
                "/specialInstructions",
                ""
            );


            oPOModel.setProperty(
                "/status",
                "Draft"
            );


            oPOModel.setProperty(
                "/sentToApproval",
                false
            );


            oPOModel.setProperty(
                "/items",
                []
            );


            oPOModel.setProperty(
                "/totalItems",
                0
            );


            oPOModel.setProperty(
                "/totalAmount",
                0
            );
        },


        // =========================================================
        // ADD ITEM
        // =========================================================

        onAddItem: function () {

            var oPOModel =
                this.getView()
                    .getModel("po");


            var sPOID =
                oPOModel.getProperty(
                    "/ID"
                );


            if (!sPOID) {

                MessageBox.warning(
                    "Please select a Purchase Order first."
                );

                return;
            }


            var aItems =
                oPOModel.getProperty(
                    "/items"
                ) || [];


            var iNextSubRequestID =
                aItems.length + 1;


            aItems.push({

                ID: "",

                parent_ID:
                    sPOID,

                subRequestID:
                    iNextSubRequestID,

                materialcode:
                    "",

                materialdescription:
                    "",

                plant:
                    "",

                unit:
                    "",

                quantity:
                    0,

                unitPrice:
                    0,

                discountPercent:
                    0,

                totalPrice:
                    0
            });


            oPOModel.setProperty(
                "/items",
                aItems
            );


            this._calculateTotal();


            MessageToast.show(
                "New item added."
            );
        },


        // =========================================================
        // DELETE SELECTED ITEMS
        // =========================================================

        onDeleteItem: function () {

            var oTable =
                this.byId("itemsTable");


            var aSelectedItems =
                oTable.getSelectedItems();


            if (
                aSelectedItems.length === 0
            ) {

                MessageToast.show(
                    "Please select item(s) to delete."
                );

                return;
            }


            var oPOModel =
                this.getView()
                    .getModel("po");


            var aItems =
                oPOModel.getProperty(
                    "/items"
                ) || [];


            var aIndexes = [];


            aSelectedItems.forEach(
                function (oItem) {

                    var oContext =
                        oItem.getBindingContext(
                            "po"
                        );


                    if (!oContext) {
                        return;
                    }


                    var iIndex =
                        parseInt(
                            oContext
                                .getPath()
                                .split("/")
                                .pop(),
                            10
                        );


                    aIndexes.push(
                        iIndex
                    );
                }
            );


            // Delete highest index first
            aIndexes.sort(
                function (a, b) {

                    return b - a;
                }
            );


            aIndexes.forEach(
                function (iIndex) {

                    aItems.splice(
                        iIndex,
                        1
                    );
                }
            );


            // Re-number
            aItems.forEach(
                function (
                    oItem,
                    iIndex
                ) {

                    oItem.subRequestID =
                        iIndex + 1;
                }
            );


            oPOModel.setProperty(
                "/items",
                aItems
            );


            oTable.removeSelections(
                true
            );


            this._calculateTotal();


            MessageToast.show(
                "Selected item(s) deleted."
            );
        },


        // =========================================================
        // DELETE SINGLE ITEM
        // =========================================================

        onDeleteSingleItem: function (
            oEvent
        ) {

            var oButton =
                oEvent.getSource();


            var oContext =
                oButton.getBindingContext(
                    "po"
                );


            if (!oContext) {
                return;
            }


            var iIndex =
                parseInt(
                    oContext
                        .getPath()
                        .split("/")
                        .pop(),
                    10
                );


            var oPOModel =
                this.getView()
                    .getModel("po");


            var aItems =
                oPOModel.getProperty(
                    "/items"
                ) || [];


            aItems.splice(
                iIndex,
                1
            );


            aItems.forEach(
                function (
                    oItem,
                    index
                ) {

                    oItem.subRequestID =
                        index + 1;
                }
            );


            oPOModel.setProperty(
                "/items",
                aItems
            );


            this._calculateTotal();


            MessageToast.show(
                "Item deleted."
            );
        },


        // =========================================================
        // ITEM VALUE CHANGE
        // =========================================================

        onItemValueChange: function (
            oEvent
        ) {

            var oInput =
                oEvent.getSource();


            var oContext =
                oInput.getBindingContext(
                    "po"
                );


            if (!oContext) {
                return;
            }


            var oPOModel =
                this.getView()
                    .getModel("po");


            var sPath =
                oContext.getPath();


            var oItem =
                oPOModel.getProperty(
                    sPath
                );


            if (!oItem) {
                return;
            }


            var fQuantity =
                Number(
                    oItem.quantity
                ) || 0;


            var fUnitPrice =
                Number(
                    oItem.unitPrice
                ) || 0;


            var fDiscount =
                Number(
                    oItem.discountPercent
                ) || 0;


            // Discount validation
            if (fDiscount < 0) {
                fDiscount = 0;
            }


            if (fDiscount > 100) {
                fDiscount = 100;
            }


            oPOModel.setProperty(
                sPath +
                "/discountPercent",
                fDiscount
            );


            var fGross =
                fQuantity *
                fUnitPrice;


            var fDiscountAmount =
                fGross *
                fDiscount /
                100;


            var fTotal =
                fGross -
                fDiscountAmount;


            oPOModel.setProperty(
                sPath +
                "/totalPrice",
                Number(
                    fTotal.toFixed(2)
                )
            );


            this._calculateTotal();
        },


        // =========================================================
        // CALCULATE TOTAL
        // =========================================================

        _calculateTotal: function () {

            var oPOModel =
                this.getView()
                    .getModel("po");


            var aItems =
                oPOModel.getProperty(
                    "/items"
                ) || [];


            var fTotal = 0;


            aItems.forEach(
                function (
                    oItem,
                    iIndex
                ) {

                    var fQuantity =
                        Number(
                            oItem.quantity
                        ) || 0;


                    var fUnitPrice =
                        Number(
                            oItem.unitPrice
                        ) || 0;


                    var fDiscount =
                        Number(
                            oItem.discountPercent
                        ) || 0;


                    var fGross =
                        fQuantity *
                        fUnitPrice;


                    var fDiscountAmount =
                        fGross *
                        fDiscount /
                        100;


                    var fItemTotal =
                        fGross -
                        fDiscountAmount;


                    oPOModel.setProperty(
                        "/items/" +
                        iIndex +
                        "/totalPrice",
                        Number(
                            fItemTotal.toFixed(2)
                        )
                    );


                    fTotal +=
                        fItemTotal;
                }
            );


            oPOModel.setProperty(
                "/totalAmount",
                Number(
                    fTotal.toFixed(2)
                )
            );


            oPOModel.setProperty(
                "/totalItems",
                aItems.length
            );
        },


        // =========================================================
        // CREATE PO PAYLOAD
        // =========================================================

        _createPOPayload: function () {

            var oPOModel =
                this.getView()
                    .getModel("po");


            var oData =
                oPOModel.getData();


            return {

                ID:
                    oData.ID || "",

                RequestID:
                    oData.RequestID || "",

                poNumber:
                    oData.poNumber || "",

                poDate:
                    oData.poDate || null,

                currency:
                    oData.currency || "INR",

                mha:
                    oData.mha || "",

                deliveryDate:
                    oData.deliveryDate || null,

                billToCustomer:
                    oData.billToCustomer || "",

                shipToCustomer:
                    oData.shipToCustomer || "",

                supplier:
                    oData.supplier || "",

                supplierAddress:
                    oData.supplierAddress || "",

                specialInstructions:
                    oData.specialInstructions || "",

                status:
                    oData.status || "Draft",

                sentToApproval:
                    Boolean(
                        oData.sentToApproval
                    ),

                totalAmount:
                    Number(
                        oData.totalAmount
                    ) || 0,

                totalItems:
                    Array.isArray(
                        oData.items
                    )
                        ? oData.items.length
                        : 0,

                items:
                    (
                        oData.items || []
                    ).map(
                        function (oItem) {

                            return {

                                ID:
                                    oItem.ID ||
                                    "",

                                parent_ID:
                                    oItem.parent_ID ||
                                    oData.ID ||
                                    "",

                                subRequestID:
                                    Number(
                                        oItem.subRequestID
                                    ) || 0,

                                materialcode:
                                    oItem.materialcode ||
                                    "",

                                materialdescription:
                                    oItem.materialdescription ||
                                    "",

                                plant:
                                    oItem.plant ||
                                    "",

                                unit:
                                    oItem.unit ||
                                    "",

                                quantity:
                                    Number(
                                        oItem.quantity
                                    ) || 0,

                                unitPrice:
                                    Number(
                                        oItem.unitPrice
                                    ) || 0,

                                discountPercent:
                                    Number(
                                        oItem.discountPercent
                                    ) || 0,

                                totalPrice:
                                    Number(
                                        oItem.totalPrice
                                    ) || 0
                            };
                        }
                    )
            };
        },


        // =========================================================
        // SAVE DRAFT
      // =========================================================
// IMPORT PENDING PURCHASE ORDERS
// =========================================================

onImportPendingPOs: async function () {

    try {

        BusyIndicator.show(0);

        MessageToast.show("Importing pending Purchase Orders...");

        var oODataModel =
            this.getView().getModel();

        if (!oODataModel) {
            throw new Error(
                "OData model is not available."
            );
        }

        console.log(
            "Calling CAP action: ImportPendingPOs"
        );

        var oAction =
            oODataModel.bindContext(
                "/ImportPendingPOs(...)"
            );

        var oResult =
            await oAction.execute();

        console.log(
            "ImportPendingPOs response:",
            oResult
        );

        // Reload PurchaseOrders from CAP
        await this._loadPurchaseOrders();

        MessageBox.success(
            "Pending Purchase Orders imported successfully."
        );

    } catch (oError) {

        console.error(
            "ImportPendingPOs ERROR:",
            oError
        );

        MessageBox.error(
            "Import failed.\n\n" +
            (
                oError.message ||
                String(oError)
            )
        );

    } finally {

        BusyIndicator.hide();
    }
},

        onSaveDraft: async function () {

            var oPOModel =
                this.getView()
                    .getModel("po");


            var oData =
                oPOModel.getData();


            if (!oData.ID) {

                MessageBox.warning(
                    "Please select a Purchase Order first."
                );

                return;
            }


            if (!oData.poNumber) {

                MessageBox.error(
                    "PO Number is required."
                );

                return;
            }


            if (
                !oData.items ||
                oData.items.length === 0
            ) {

                MessageBox.error(
                    "Purchase Order must contain at least one item."
                );

                return;
            }


            // Calculate latest totals
            this._calculateTotal();


            var oPayload =
                this._createPOPayload();


            try {

                BusyIndicator.show(0);


                var oODataModel =
                    this.getView()
                        .getModel();


                if (!oODataModel) {

                    throw new Error(
                        "OData model is not available."
                    );
                }


                var oAction =
                    oODataModel.bindContext(
                        "/SaveDraft(...)"
                    );


                oAction.setParameter(
                    "poData",
                    JSON.stringify(
                        oPayload
                    )
                );


                var oResult =
                    await oAction.execute();


                console.log(
                    "Save Draft response:",
                    oResult
                );


                oPOModel.setProperty(
                    "/status",
                    "Draft"
                );


                oPOModel.setProperty(
                    "/sentToApproval",
                    false
                );


                MessageBox.success(
                    "Purchase Order " +
                    oPayload.poNumber +
                    " and its items were saved successfully."
                );


                // Refresh dropdown data
                await this._loadPurchaseOrders();


            } catch (oError) {

                console.error(
                    "Save Draft Error:",
                    oError
                );


                MessageBox.error(
                    "Unable to save Purchase Order.\n\n" +
                    (
                        oError.message ||
                        "Unknown error"
                    )
                );


            } finally {

                BusyIndicator.hide();
            }
        },


        // SUBMIT FOR APPROVAL
    
        //
        // IMPORTANT:
        //
        // 1. First SaveDraft() so all edits/new items reach DB
        // 2. Then SubmitForApproval(purchaseOrderID)
        // 3. Backend reads final PO/items and calls BPA
    
    onSubmitApproval: async function () {

    var oPOModel =
        this.getView().getModel("po");

    // Recalculate the latest totals
    this._calculateTotal();

    // Get current PO data
    var oData =
        oPOModel.getData();

    console.log("SUBMIT PO DATA:", oData);


    // =========================================================
    // VALIDATION
    // =========================================================

    if (!oData || !oData.ID) {

        MessageBox.warning(
            "Please select a Purchase Order first."
        );

        return;
    }


    if (!oData.poNumber) {

        MessageBox.error(
            "PO Number is required."
        );

        return;
    }


    if (
        !oData.items ||
        oData.items.length === 0
    ) {

        MessageBox.error(
            "Purchase Order must contain at least one item."
        );

        return;
    }


    // =========================================================
    // CONFIRM SUBMISSION
    // =========================================================

    MessageBox.confirm(
        "Submit " +
        oData.poNumber +
        " for approval?",
        {
            title: "Submit for Approval",

            onClose: async function (sAction) {

                if (
                    sAction !==
                    MessageBox.Action.OK
                ) {
                    return;
                }


                try {

                    BusyIndicator.show(0);


                    // =================================================
                    // GET DEFAULT ODATA V4 MODEL
                    // =================================================

                    var oODataModel =
                        this.getView().getModel();


                    if (!oODataModel) {

                        throw new Error(
                            "OData model is not available."
                        );
                    }


                    // =================================================
                    // CALL CAP ACTION
                    // =================================================

                    var oOperation =
                        oODataModel.bindContext(
                            "/SubmitForApproval(...)"
                        );


                    oOperation.setParameter(
                        "purchaseOrderID",
                        oData.ID
                    );


                    console.log(
                        "Submitting PO:",
                        oData.ID
                    );


                    var oResult =
                        await oOperation.execute();


                    console.log(
                        "SubmitForApproval result:",
                        oResult
                    );


                    // =================================================
                    // UPDATE UI
                    // =================================================

                    oPOModel.setProperty(
                        "/status",
                        "Pending Approval"
                    );


                    oPOModel.setProperty(
                        "/sentToApproval",
                        true
                    );


                    MessageBox.success(
                        "Purchase Order " +
                        oData.poNumber +
                        " was submitted for approval."
                    );


                } catch (oError) {

                    console.error(
                        "SubmitForApproval ERROR:",
                        oError
                    );


                    MessageBox.error(
                        "Unable to submit Purchase Order.\n\n" +
                        (
                            oError.message ||
                            String(oError)
                        )
                    );


                } finally {

                    BusyIndicator.hide();
                }

            }.bind(this)
        }
    );
},

        // =========================================================
        // CANCEL
        // =========================================================

        onCancel: function () {

            MessageBox.confirm(
                "Are you sure you want to cancel?",
                {

                    title:
                        "Cancel PO Creation",

                    onClose:
                        function (
                            sAction
                        ) {

                            if (
                                sAction ===
                                MessageBox.Action.OK
                            ) {

                                window.history.back();
                            }
                        }
                }
            );
        },


        // =========================================================
// PO STATUS
// =========================================================

// =========================================================
// PO STATUS
// =========================================================

onPOStatus: async function () {

    try {

        var oPOModel =
            this.getView()
                .getModel("po");

        var oData =
            oPOModel.getData();

        if (!oData || !oData.ID) {

            MessageBox.warning(
                "Please select a Purchase Order first."
            );

            return;
        }

        BusyIndicator.show(0);

        var oODataModel =
            this.getView()
                .getModel();

        if (!oODataModel) {
            throw new Error(
                "OData model is not available."
            );
        }

        // -------------------------------------------------
        // CALL CAP ACTION
        // -------------------------------------------------

        var oOperation =
            oODataModel.bindContext(
                "/GetPOStatus(...)"
            );

        oOperation.setParameter(
            "purchaseOrderID",
            oData.ID
        );

        await oOperation.execute();

        var oResult =
            oOperation
                .getBoundContext()
                .getObject();

        console.log(
            "PO Status response:",
            oResult
        );

        // -------------------------------------------------
        // PARSE RESPONSE
        // -------------------------------------------------

        var oStatusData;

        if (
            oResult &&
            typeof oResult.value === "string"
        ) {

            oStatusData =
                JSON.parse(
                    oResult.value
                );

        } else {

            oStatusData = oResult;
        }

        console.log(
            "PO Status parsed data:",
            oStatusData
        );

        // -------------------------------------------------
        // CURRENT APPROVAL
        // -------------------------------------------------

        var oCurrent =
            oStatusData.currentApproval || {};

        var aHistory =
            oStatusData.approvalHistory || [];

        // -------------------------------------------------
        // BUILD DISPLAY TEXT
        // -------------------------------------------------

        var sHistory = "";

        aHistory.forEach(
            function (oTask) {

                var sIcon = "○";

                if (
                    oTask.status === "READY" ||
                    oTask.status === "RUNNING"
                ) {
                    sIcon = "⏳";
                }

                if (
                    oTask.status === "COMPLETED"
                ) {
                    sIcon = "✓";
                }

                sHistory +=
                    "\n" +
                    sIcon +
                    " " +
                    (
                        oTask.stage ||
                        "Approval"
                    ) +
                    " : " +
                    (
                        oTask.status ||
                        "UNKNOWN"
                    );

                if (oTask.approver) {

                    sHistory +=
                        "\n   Approver: " +
                        oTask.approver;
                }
            }
        );
var oCurrent =
    oStatusData.currentApproval || {};

var aSummary =
    oStatusData.approvalSummary || [];

var sApprovalText = "";

aSummary.forEach(function (item) {

    var sIcon = "○";

    if (item.status === "Approved") {
        sIcon = "✓";
    } else if (item.status === "Pending") {
        sIcon = "⏳";
    }

    sApprovalText +=
        "\n" +
        sIcon +
        " " +
        item.stage +
        " : " +
        item.status;

    if (item.approver) {
        sApprovalText +=
            "\n   " +
            (
                item.status === "Pending"
                    ? "Pending With: "
                    : "Approver: "
            ) +
            item.approver;
    }
});

var sMessage =
    "PO Number: " +
    oStatusData.purchaseOrder.poNumber +

    "\nRequest ID: " +
    oStatusData.purchaseOrder.requestID +

    "\nSupplier: " +
    oStatusData.purchaseOrder.supplier +

    "\nTotal Amount: " +
    oStatusData.purchaseOrder.totalAmount +
    " " +
    oStatusData.purchaseOrder.currency +

    "\nOverall Status: " +
    oStatusData.purchaseOrder.status +

    "\n\nCURRENT STAGE" +

    "\n" +
    oCurrent.currentStage +

    "\nPending With: " +
    oCurrent.pendingWith +

    "\nTask Status: " +
    oCurrent.taskStatus +

    "\n\nAPPROVAL STATUS" +
    sApprovalText;
        // -------------------------------------------------
        // SHOW STATUS
        // -------------------------------------------------

      MessageBox.show(
    sMessage,
    {
        title: "Purchase Order Status",

        icon:
            MessageBox.Icon.INFORMATION,

        contentWidth:
            "600px",

        contentHeight:
            "1500px",

        verticalScrolling:
            true,

        horizontalScrolling:
            false,

        actions: [
            MessageBox.Action.OK
        ],

        styleClass:
            "poStatusMessageBox"
    }
);

    } catch (oError) {

        console.error(
            "PO Status Error:",
            oError
        );

        MessageBox.error(
            "Unable to retrieve PO status.\n\n" +
            (
                oError.message ||
                String(oError)
            )
        );

    } finally {

        BusyIndicator.hide();
    }
},



// =========================================================
// PO SUMMARY
// =========================================================

onPOSummary: async function () {

    try {

        var oPOListModel =
            this.getView().getModel("poList");

        if (!oPOListModel) {

            MessageBox.error(
                "PO list data is not available."
            );

            return;
        }

        var aPOs =
            oPOListModel.getProperty(
                "/PurchaseOrders"
            );

        if (!aPOs || aPOs.length === 0) {

            MessageBox.information(
                "No Purchase Orders found."
            );

            return;
        }

        BusyIndicator.show(0);

        // Get actual workflow status
        var aSummaryPOs =
            await this._loadPOSummaryStatuses(aPOs);


        // Create Summary model
        var oSummaryModel =
            new JSONModel({
                PurchaseOrders: aSummaryPOs
            });


        this.getView().setModel(
            oSummaryModel,
            "poSummary"
        );


        // Open dialog
        var oDialog =
            this.byId("poSummaryDialog");

        if (oDialog) {
            oDialog.open();
        }


    } catch (oError) {

        console.error(
            "PO Summary Error:",
            oError
        );

        MessageBox.error(
            "Unable to load PO Summary.\n\n" +
            (
                oError.message ||
                String(oError)
            )
        );

    } finally {

        BusyIndicator.hide();

    }
},


_loadPOSummaryStatuses: async function (aPOs) {

    var oODataModel =
        this.getView().getModel();

    if (!oODataModel) {

        throw new Error(
            "OData model is not available."
        );
    }


    var aResults = [];


    for (var i = 0; i < aPOs.length; i++) {

        var oPO = aPOs[i];

        try {

            console.log(
                "Getting status for:",   
                oPO.poNumber
            );


            // -------------------------------------------------
            // CALL EXISTING CAP ACTION
            // -------------------------------------------------

            var oOperation =
                oODataModel.bindContext(
                    "/GetPOStatus(...)"
                );


            oOperation.setParameter(
                "purchaseOrderID",
                oPO.ID
            );


            await oOperation.execute();


            var oResult =
                oOperation
                    .getBoundContext()
                    .getObject();


            // -------------------------------------------------
            // PARSE RESPONSE
            // -------------------------------------------------
var oStatusData;

if (
    oResult &&
    typeof oResult.value === "string"
) {

    oStatusData =
        JSON.parse(
            oResult.value
        );

} else {

    oStatusData =
        oResult;
}


console.log(
    "Status for " +
    oPO.poNumber +
    ":",
    oStatusData
);


// -------------------------------------------------
// GET APPROVAL STAGE + STATUS
// -------------------------------------------------

var oStageInfo =
    this._getApprovalStage(
        oStatusData,
        oPO
    );


// -------------------------------------------------
// CREATE SUMMARY ROW
// -------------------------------------------------

aResults.push({

    ID: oPO.ID,

    poNumber: oPO.poNumber,

    RequestID: oPO.RequestID,

    totalAmount: oPO.totalAmount,

    currency: oPO.currency,

    supplier: oPO.supplier,

    status:
        oStageInfo.status,

    approvalStage:
        oStageInfo.approvalStage,

    pendingWith:
        oStageInfo.pendingWith

});
        } catch (oError) {

            console.error(
                "Unable to get status for " +
                oPO.poNumber,
                oError
            );


            // If workflow status fails,
            // keep original PO status
            aResults.push({

                ID:
                    oPO.ID,

                poNumber:
                    oPO.poNumber,

                RequestID:
                    oPO.RequestID,

                totalAmount:
                    oPO.totalAmount,

                currency:
                    oPO.currency,

                supplier:
                    oPO.supplier,

                status:
                    oPO.status || "Unknown"

            });

        }

    }


    return aResults;
},


_getApprovalStage: function (oStatusData, oPO) {

    var aSummary =
        oStatusData.approvalSummary || [];

    var oCurrent =
        oStatusData.currentApproval || {};


    // -------------------------------------------------
    // 1. CHECK REJECTED
    // -------------------------------------------------

    var oRejected =
        aSummary.find(function (oStep) {

            return (
                oStep.status === "Rejected" ||
                oStep.status === "REJECTED"
            );

        });

    if (oRejected) {

        return {

            status: "Rejected",

            approvalStage:
                "Rejected by " +
                (
                    oRejected.approver ||
                    oRejected.stage ||
                    "Approver"
                ),

            pendingWith: "-"

        };
    }


    // -------------------------------------------------
    // 2. FIND PENDING STAGE
    // -------------------------------------------------

    var oPending =
        aSummary.find(function (oStep) {

            return (
                oStep.status === "Pending" ||
                oStep.status === "READY" ||
                oStep.status === "Running" ||
                oStep.status === "RUNNING"
            );

        });


    if (oPending) {

        return {

            status: "Pending Approval",

            approvalStage:
                "Pending from " +
                this._formatStageName(
                    oPending.stage
                ),

            pendingWith:
                oPending.approver ||
                oCurrent.pendingWith ||
                "-"

        };
    }


    // -------------------------------------------------
    // 3. CHECK ALL APPROVED
    // -------------------------------------------------

    if (aSummary.length > 0) {

        var bAllApproved =
            aSummary.every(function (oStep) {

                return (
                    oStep.status === "Approved" ||
                    oStep.status === "APPROVED" ||
                    oStep.status === "Completed" ||
                    oStep.status === "COMPLETED"
                );

            });


        if (bAllApproved) {

            var oLastStep =
                aSummary[aSummary.length - 1];

            return {

                status: "Approved",

                approvalStage:
                    "Approved by " +
                    (
                        oLastStep.approver ||
                        this._formatStageName(
                            oLastStep.stage
                        )
                    ),

                pendingWith: "-"

            };
        }
    }


    // -------------------------------------------------
    // 4. FALLBACK
    // -------------------------------------------------

    return {

        status:
            oPO.status || "Unknown",

        approvalStage:
            oCurrent.currentStage ||
            "Not Started",

        pendingWith:
            oCurrent.pendingWith ||
            "-"

    };
},

_formatStageName: function (sStage) {

    if (!sStage) {
        return "Approval";
    }

    if (
        sStage.toLowerCase()
            .includes("bd")
    ) {
        return "BD Approval";
    }

    if (
        sStage.toLowerCase()
            .includes("senior")
    ) {
        return "Senior Manager Approval";
    }

    if (
        sStage.toLowerCase()
            .includes("director")
    ) {
        return "Director Approval";
    }

    return sStage;
},

getApprovalStageState: function (sStage) {

    if (!sStage) {
        return "None";
    }

    if (
        sStage.startsWith("Pending")
    ) {
        return "Warning";
    }

    if (
        sStage.startsWith("Rejected")
    ) {
        return "Error";
    }

    if (
        sStage.startsWith("Approved")
    ) {
        return "Success";
    }

    return "Information";
},
onClosePOSummary: function () {

    var oDialog =
        this.byId("poSummaryDialog");

    if (oDialog) {
        oDialog.close();
    }
},

onPOSummaryFilter: function (oEvent) {

    var sKey =
        oEvent.getSource().getSelectedKey();

    var oTable =
        this.byId("poSummaryTable");

    var oBinding =
        oTable.getBinding("items");

    if (!oBinding) {
        return;
    }

    if (sKey === "ALL") {

        oBinding.filter([]);

        return;
    }

    var sStatus = "";

    if (sKey === "PENDING") {
        sStatus = "Pending Approval";
    }

    if (sKey === "REJECTED") {
        sStatus = "Rejected";
    }

    if (sKey === "CLOSED") {
        sStatus = "Closed";
    }

    var oFilter =
        new Filter(
            "status",
            FilterOperator.EQ,
            sStatus
        );

    oBinding.filter([oFilter]);
},

getSummaryStatusState: function (sStatus) {

    switch (sStatus) {

        case "Pending Approval":
            return "Warning";

        case "Rejected":
            return "Error";

        case "Approved":
            return "Success";

        default:
            return "None";
    }
},

// =========================================================
// ADD COLUMN
// =========================================================

onAddColumn: function () {

    var oInput = new Input({
        width: "100%",
        placeholder: "Enter column name",
        maxLength: 50
    });

    var oDialog = new Dialog({
        title: "Add Column",
        contentWidth: "400px",

        content: [
            new Label({
                text: "Column Name",
                labelFor: oInput
            }),
            oInput
        ],

        beginButton: new Button({
            text: "Add",
            type: "Emphasized",

            press: function () {

                var sColumnName =
                    oInput.getValue().trim();

                if (!sColumnName) {
                    MessageBox.warning(
                        "Please enter a column name."
                    );
                    return;
                }

                this._createCustomColumn(
                    sColumnName
                );

                oDialog.close();

            }.bind(this)
        }),

        endButton: new Button({
            text: "Cancel",

            press: function () {
                oDialog.close();
            }
        }),

        afterClose: function () {
            oDialog.destroy();
        }
    });

    this.getView().addDependent(oDialog);

    oDialog.open();
},
// =========================================================
// RESET CUSTOM COLUMNS WHEN PO CHANGES
// =========================================================

_resetCustomColumns: function () {

    var oTable = this.byId("itemsTable");

    if (!oTable) {
        return;
    }

    // Remove all dynamically added columns
    oTable.getColumns().slice().forEach(function (oColumn) {

        if (oColumn.data("isCustomColumn")) {

            oTable.removeColumn(oColumn);
            oColumn.destroy();

        }

    });

    // Clear custom column definitions
    this._aCustomColumns = [];

    console.log(
        "Custom columns reset."
    );
},
// =========================================================
// CREATE CUSTOM COLUMN
// =========================================================

// =========================================================
// CREATE CUSTOM COLUMN
// =========================================================

_createCustomColumn: function (sColumnName) {

    var oTable =
        this.byId("itemsTable");

    if (!oTable) {

        MessageBox.error(
            "Purchase Order Items table not found."
        );

        return;
    }

    var oPOModel =
        this.getView().getModel("po");

    if (!oPOModel) {

        MessageBox.error(
            "PO model not found."
        );

        return;
    }

    // -----------------------------------------------------
    // INITIALIZE ARRAY
    // -----------------------------------------------------

    if (!this._aCustomColumns) {
        this._aCustomColumns = [];
    }

    // -----------------------------------------------------
    // DUPLICATE CHECK
    // -----------------------------------------------------

    var bExists =
        this._aCustomColumns.some(
            function (oColumn) {

                return (
                    oColumn.name
                        .trim()
                        .toLowerCase() ===
                    sColumnName
                        .trim()
                        .toLowerCase()
                );

            }
        );

    if (bExists) {

        MessageBox.warning(
            "Column '" +
            sColumnName +
            "' already exists."
        );

        return;
    }

    // -----------------------------------------------------
    // CREATE UNIQUE MODEL PROPERTY
    // -----------------------------------------------------

    var sPropertyName =
        "custom_" +
        Date.now();

    // -----------------------------------------------------
    // ADD PROPERTY TO ALL CURRENT ITEMS
    // -----------------------------------------------------

    var aItems =
        oPOModel.getProperty("/items") || [];

    aItems.forEach(
        function (oItem) {

            oItem[sPropertyName] = "";

        }
    );

    oPOModel.setProperty(
        "/items",
        aItems
    );

    // -----------------------------------------------------
    // STORE COLUMN INFORMATION
    // -----------------------------------------------------

    this._aCustomColumns.push({
        name: sColumnName,
        property: sPropertyName
    });

    // -----------------------------------------------------
    // REBUILD TABLE
    // -----------------------------------------------------

    this._rebuildItemsTable();

    MessageToast.show(
        "Column '" +
        sColumnName +
        "' added successfully."
    );
},

// =========================================================
// REBUILD ITEMS TABLE
// =========================================================

_rebuildItemsTable: function () {

    var oTable = this.byId("itemsTable");

    if (!oTable) {
        return;
    }

    // =====================================================
    // GET ORIGINAL XML ROW TEMPLATE ONCE
    // =====================================================

    if (!this._oBaseItemTemplate) {

        var oBindingInfo =
            oTable.getBindingInfo("items");

        if (
            !oBindingInfo ||
            !oBindingInfo.template
        ) {

            MessageBox.error(
                "Unable to find PO item row template."
            );

            return;
        }

        this._oBaseItemTemplate =
            oBindingInfo.template.clone();
    }

    // =====================================================
    // CREATE FRESH ROW TEMPLATE
    // =====================================================

    var oNewTemplate =
        this._oBaseItemTemplate.clone();

    // =====================================================
    // ADD INPUT CELL FOR EACH CUSTOM COLUMN
    // =====================================================

    (this._aCustomColumns || []).forEach(
        function (oCustomColumn) {

            var oInput =
                new Input({
                    value: {
                        path:
                            "po>" +
                            oCustomColumn.property
                    },
                    width: "100%"
                });

            oNewTemplate.addCell(
                oInput
            );
        }
    );

    // =====================================================
    // REMOVE OLD CUSTOM COLUMNS
    // =====================================================

    oTable.getColumns()
        .slice()
        .forEach(
            function (oColumn) {

                if (
                    oColumn.data(
                        "isCustomColumn"
                    )
                ) {

                    oTable.removeColumn(
                        oColumn
                    );

                    oColumn.destroy();

                }
            }
        );

    // =====================================================
    // ADD CUSTOM COLUMNS
    // =====================================================

    var that = this;
(this._aCustomColumns || []).forEach(
    function (oCustomColumn) {

        // =============================================
        // DELETE BUTTON
        // =============================================

        var oDeleteButton =
            new sap.m.Button({

                icon: "sap-icon://delete",

                type: "Transparent",

                tooltip: "Delete column",

                press: function () {

                    that._removeCustomColumn(
                        oCustomColumn.property
                    );

                }

            });


        // =============================================
        // HEADER TEXT
        // =============================================

        var oHeaderText =
            new sap.m.Text({

                text:
                    oCustomColumn.name,

                wrapping: false

            });


        // =============================================
        // HEADER TOOLBAR
        // =============================================

        var oHeader =
            new sap.m.Toolbar({

                width: "100%",

                content: [

                    oHeaderText,

                    new sap.m.ToolbarSpacer(),

                    oDeleteButton

                ]

            });


        // =============================================
        // CREATE COLUMN
        // =============================================

        var oColumn =
            new sap.m.Column({

                width: "12rem",

                hAlign: "Begin",

                header: oHeader

            });


        // =============================================
        // MARK AS CUSTOM COLUMN
        // =============================================

        oColumn.data(
            "isCustomColumn",
            true
        );

        oColumn.data(
            "property",
            oCustomColumn.property
        );


        // =============================================
        // ADD COLUMN AT RIGHT END
        // =============================================

        oTable.addColumn(
            oColumn
        );


        console.log(
            "CUSTOM COLUMN HEADER:",
            oCustomColumn.name
        );

    }
);

    // =====================================================
    // REBIND TABLE
    // =====================================================

    oTable.unbindItems();

    oTable.bindItems({

        path:
            "po>/items",

        template:
            oNewTemplate,

        templateShareable:
            false

    });

    console.log(
        "Table rebuilt:",
        this._aCustomColumns
    );
},

// =========================================================
// DELETE CUSTOM COLUMN
// =========================================================

_removeCustomColumn: function (sPropertyName) {

    var oPOModel =
        this.getView().getModel("po");

    if (!oPOModel) {
        return;
    }

    // -----------------------------------------------------
    // REMOVE FROM CUSTOM COLUMN ARRAY
    // -----------------------------------------------------

    this._aCustomColumns =
        (this._aCustomColumns || [])
            .filter(
                function (oColumn) {

                    return (
                        oColumn.property !==
                        sPropertyName
                    );

                }
            );

    // -----------------------------------------------------
    // REMOVE PROPERTY FROM CURRENT ITEMS
    // -----------------------------------------------------

    var aItems =
        oPOModel.getProperty("/items") || [];

    aItems.forEach(
        function (oItem) {

            delete oItem[sPropertyName];

        }
    );

    oPOModel.setProperty(
        "/items",
        aItems
    );

    // -----------------------------------------------------
    // REBUILD TABLE
    // -----------------------------------------------------

    this._rebuildItemsTable();

    MessageToast.show(
        "Column deleted successfully."
    );
},

// =========================================================
// RESET CUSTOM COLUMNS
// =========================================================

_resetCustomColumns: function () {

    var oTable =
        this.byId("itemsTable");

    if (!oTable) {

        this._aCustomColumns = [];

        return;
    }

    // Remove dynamic columns
    oTable.getColumns()
        .slice()
        .forEach(
            function (oColumn) {

                if (
                    oColumn.data(
                        "isCustomColumn"
                    )
                ) {

                    oTable.removeColumn(
                        oColumn
                    );

                    oColumn.destroy();

                }

            }
        );

    // Clear custom column definitions
    this._aCustomColumns = [];

    console.log(
        "Custom columns reset."
    );

    // Rebind original table
    if (this._oBaseItemTemplate) {

        oTable.unbindItems();

        oTable.bindItems({

            path:
                "po>/items",

            template:
                this._oBaseItemTemplate.clone(),

            templateShareable:
                false

        });

    }
},



    });
});