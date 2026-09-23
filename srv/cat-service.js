const cds = require("@sap/cds");

const {
    getDestination
} = require("@sap-cloud-sdk/connectivity");

const {
    executeHttpRequest
} = require("@sap-cloud-sdk/http-client");


module.exports = cds.service.impl(function () {

    const {
        PurchaseOrders,
        PurchaseOrderItems
    } = cds.entities("po_workflows");

     // =========================================================
// SAVE DRAFT
// =========================================================

this.on("SaveDraft", async (req) => {

    let poData;

    // ---------------------------------------------------------
    // Parse incoming JSON
    // ---------------------------------------------------------

    try {

        poData =
            JSON.parse(
                req.data.poData
            );

    } catch (error) {

        return req.error(
            400,
            "Invalid PO data."
        );
    }


    // ---------------------------------------------------------
    // Validate PO ID
    // ---------------------------------------------------------

    if (!poData.ID) {

        return req.error(
            400,
            "Purchase Order ID is required."
        );
    }


    // ---------------------------------------------------------
    // Validate PO Number
    // ---------------------------------------------------------

    if (!poData.poNumber) {

        return req.error(
            400,
            "PO Number is required."
        );
    }


    // ---------------------------------------------------------
    // Validate Items
    // ---------------------------------------------------------

    if (
        !Array.isArray(poData.items) ||
        poData.items.length === 0
    ) {

        return req.error(
            400,
            "Purchase Order must contain at least one item."
        );
    }


    // ---------------------------------------------------------
    // USE REQUEST TRANSACTION
    // ---------------------------------------------------------

    const tx =
        cds.tx(req);


    try {

        // =====================================================
        // 1. CHECK EXISTING PO
        // =====================================================

        const existingPO =
            await tx.run(
                SELECT.one
                    .from(PurchaseOrders)
                    .where({
                        ID: poData.ID
                    })
            );


        if (!existingPO) {

            return req.error(
                404,
                "Purchase Order not found."
            );
        }


        // =====================================================
        // 2. CALCULATE TOTAL
        // =====================================================

        let totalAmount = 0;


        poData.items.forEach(
            function (item) {

                const quantity =
                    Number(
                        item.quantity
                    ) || 0;

                const unitPrice =
                    Number(
                        item.unitPrice
                    ) || 0;

                const discount =
                    Number(
                        item.discountPercent
                    ) || 0;


                const amount =
                    quantity *
                    unitPrice *
                    (
                        1 -
                        discount / 100
                    );


                totalAmount += amount;
            }
        );


        totalAmount =
            Number(
                totalAmount.toFixed(2)
            );


        // =====================================================
        // 3. UPDATE PO HEADER
        // =====================================================

        await tx.run(
            UPDATE(PurchaseOrders)
                .set({

                    RequestID:
                        poData.RequestID || "",

                    poNumber:
                        poData.poNumber || "",

                    poDate:
                        poData.poDate || null,

                    currency:
                        poData.currency || "INR",

                    mha:
                        poData.mha || "",

                    deliveryDate:
                        poData.deliveryDate || null,

                    billToCustomer:
                        poData.billToCustomer || "",

                    shipToCustomer:
                        poData.shipToCustomer || "",

                    supplier:
                        poData.supplier || "",

                    supplierAddress:
                        poData.supplierAddress || "",

                    specialInstructions:
                        poData.specialInstructions || "",

                    source:
                        "UI",
                    status:
                        "Draft",

                    sentToApproval:
                        false,

                    totalAmount:
                        totalAmount,

                    totalItems:
                        poData.items.length

                })
                .where({
                    ID: poData.ID
                })
        );


        // =====================================================
        // 4. DELETE CURRENT ITEMS
        // =====================================================

        await tx.run(
            DELETE
                .from(
                    PurchaseOrderItems
                )
                .where({
                    parent_ID:
                        poData.ID
                })
        );


        // =====================================================
        // 5. INSERT CURRENT UI ITEMS
        // =====================================================

        const aItems =
            poData.items.map(
                function (
                    item,
                    index
                ) {

                    return {

                        ID:
                            cds.utils.uuid(),

                        parent_ID:
                            poData.ID,

                        subRequestID:
                            index + 1,

                        materialcode:
                            item.materialcode ||
                            "",

                        materialdescription:
                            item.materialdescription ||
                            "",

                        plant:
                            item.plant ||
                            "",

                        unit:
                            item.unit ||
                            "",

                        quantity:
                            Number(
                                item.quantity
                            ) || 0,

                        unitPrice:
                            Number(
                                item.unitPrice
                            ) || 0,

                        discountPercent:
                            Number(
                                item.discountPercent
                            ) || 0,

                        totalPrice:
                            Number(
                                item.totalPrice
                            ) || 0
                    };
                }
            );


        await tx.run(
            INSERT
                .into(
                    PurchaseOrderItems
                )
                .entries(
                    aItems
                )
        );


        // =====================================================
        // 6. READ UPDATED PO
        // =====================================================

        const updatedPO =
            await tx.run(
                SELECT.one
                    .from(PurchaseOrders)
                    .where({
                        ID: poData.ID
                    })
            );


        console.log(
            "SaveDraft successful:",
            poData.poNumber
        );


        return updatedPO;


    } catch (error) {

        console.error(
            "SaveDraft error:",
            error
        );


        return req.error(
            500,
            "Unable to save Purchase Order: " +
            error.message
        );
    }

});
    // =========================================================
// SUBMIT PURCHASE ORDER FOR APPROVAL
// =========================================================

this.on("SubmitForApproval", async (req) => {

    const purchaseOrderID =
        req.data.purchaseOrderID;

    // =====================================================
    // 1. VALIDATE
    // =====================================================

    if (!purchaseOrderID) {

        return req.error(
            400,
            "Purchase Order ID is required."
        );
    }

    const tx = cds.tx(req);

    try {

        // =================================================
        // 2. GET PURCHASE ORDER
        // =================================================

        const purchaseOrder =
            await tx.run(
                SELECT.one
                    .from(PurchaseOrders)
                    .where({
                        ID: purchaseOrderID
                    })
            );

        if (!purchaseOrder) {

            return req.error(
                404,
                "Purchase Order not found."
            );
        }

        // =================================================
        // 3. GET PURCHASE ORDER ITEMS
        // =================================================

        const items =
            await tx.run(
                SELECT
                    .from(PurchaseOrderItems)
                    .where({
                        parent_ID: purchaseOrderID
                    })
            );

        if (
            !items ||
            items.length === 0
        ) {

            return req.error(
                400,
                "Purchase Order must contain at least one item."
            );
        }

        // =================================================
        // 4. CALCULATE TOTAL
  
let totalAmount;

if (purchaseOrder.source === "OCR_API") {

    // Imported PO:
    // Use the total received from the external API.
    totalAmount =
        Number(
            purchaseOrder.totalAmount
        ) || 0;

} else {

    // Manually created PO:
    // Calculate total from the PO items.
    totalAmount = 0;

    items.forEach(function (item) {

        const quantity =
            Number(item.quantity) || 0;

        const unitPrice =
            Number(item.unitPrice) || 0;

        const discount =
            Number(item.discountPercent) || 0;

        const amount =
            quantity *
            unitPrice *
            (1 - discount / 100);

        totalAmount += amount;

    });

    totalAmount =
        Number(
            totalAmount.toFixed(2)
        );
}
        // =================================================
        // 5. CREATE BPA PAYLOAD
        // =================================================

        const workflowPayload = {

            definitionId:
                "us10.f084fcdetrial.poapprovalworkflow.pOApprovalProcess",

            context: {

                poid:
                    String(
                        purchaseOrder.ID
                    ),

                requestid:
                    String(
                        purchaseOrder.RequestID || ""
                    ),

                ponumber:
                    String(
                        purchaseOrder.poNumber || ""
                    ),

                supplier:
                    String(
                        purchaseOrder.supplier || ""
                    ),

                supplieraddress:
                    String(
                        purchaseOrder.supplierAddress || ""
                    ),

                billtocustomer:
                    String(
                        purchaseOrder.billToCustomer || ""
                    ),

                shiptocustomer:
                    String(
                        purchaseOrder.shipToCustomer || ""
                    ),

                currency:
                    String(
                        purchaseOrder.currency || "INR"
                    ),

                totalamount:
                    String(
                        totalAmount
                    ),

                deliverydate:
                    purchaseOrder.deliveryDate
                        ? String(
                            purchaseOrder.deliveryDate
                        )
                        : "",

                submittedby:
                    String(
                        purchaseOrder.createdBy ||
                        "anonymous"
                    ),

                items:
                    items.map(function (item) {

                        return JSON.stringify({

                            ID:
                                item.ID,

                            subRequestID:
                                item.subRequestID,

                            materialcode:
                                item.materialcode,

                            materialdescription:
                                item.materialdescription,

                            plant:
                                item.plant,

                            unit:
                                item.unit,

                            quantity:
                                Number(
                                    item.quantity
                                ) || 0,

                            unitPrice:
                                Number(
                                    item.unitPrice
                                ) || 0,

                            discountPercent:
                                Number(
                                    item.discountPercent
                                ) || 0,

                            totalPrice:
                                Number(
                                    item.totalPrice
                                ) || 0
                        });
                    })
            }
        };

        console.log(
            "========================================"
        );

        console.log(
            "BPA REQUEST PAYLOAD"
        );

        console.log(
            JSON.stringify(
                workflowPayload,
                null,
                2
            )
        );

        console.log(
            "========================================"
        );

        // =================================================
        // 6. GET DESTINATION
        // =================================================

        const destination =
            await getDestination({
                destinationName: "PO_BPA"
            });

        console.log(
            "PO_BPA destination found."
        );

        // =================================================
        // 7. CALL BPA
        // =================================================

        const response =
            await executeHttpRequest(
                destination,
                {
                    method: "POST",

                    url:
                        "/workflow/rest/v1/workflow-instances",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    data:
                        workflowPayload
                }
            );

        // =================================================
        // 8. BPA SUCCESS
        // =================================================

        console.log(
            "BPA HTTP STATUS:",
            response.status
        );

        console.log(
            "BPA RESPONSE:",
            response.data
        );

        const workflowInstanceId =
            response.data &&
            response.data.id
                ? String(
                    response.data.id
                )
                : "";

        // =================================================
        // 9. UPDATE PO ONLY AFTER BPA SUCCESS
        // =================================================

        await tx.run(
            UPDATE(PurchaseOrders)
                .set({

                    status:
                        "Pending Approval",

                    sentToApproval:
                        true,

                    totalAmount:
                        totalAmount,

                    totalItems:
                        items.length,

                    bpaJobId:
                        workflowInstanceId,

                    bpaStatus:
                        "TRIGGERED"
                })
                .where({
                    ID: purchaseOrderID
                })
        );

        // =================================================
        // 10. RETURN UPDATED PO
        // =================================================

        const updatedPO =
            await tx.run(
                SELECT.one
                    .from(PurchaseOrders)
                    .where({
                        ID: purchaseOrderID
                    })
            );

        console.log(
            "BPA workflow triggered successfully."
        );

        console.log(
            "Workflow Instance ID:",
            workflowInstanceId
        );

        return updatedPO;

    } catch (error) {

        console.error(
            "========================================"
        );

        console.error(
            "BPA SUBMISSION FAILED"
        );

        console.error(
            error
        );

        console.error(
            "========================================"
        );

         return req.error(
            500,
            "Unable to trigger BPA workflow: " +
            (
                error.message ||
                String(error)
            )
        );
    }

}); 


// get po status start

// =========================================================
// GET PO STATUS
// =========================================================

this.on("GetPOStatus", async (req) => {

    try {

        const { purchaseOrderID } = req.data;

        if (!purchaseOrderID) {

            return req.error(
                400,
                "Purchase Order ID is required."
            );
        }

        // =====================================================
        // USE REQUEST TRANSACTION
        // =====================================================

        const tx = cds.tx(req);

        // =====================================================
        // 1. READ SELECTED PURCHASE ORDER
        // =====================================================

        const purchaseOrder =
            await tx.run(
                SELECT.one
                    .from(PurchaseOrders)
                    .where({
                        ID: purchaseOrderID
                    })
            );

        if (!purchaseOrder) {

            return req.error(
                404,
                "Purchase Order not found."
            );
        }

        console.log(
            "PO STATUS - PURCHASE ORDER:",
            purchaseOrder
        );

        // =====================================================
        // 2. CHECK BPA WORKFLOW
        // =====================================================

        if (!purchaseOrder.bpaJobId) {

            return JSON.stringify({

                success: true,

                purchaseOrder: {
                    poNumber:
                        purchaseOrder.poNumber,

                    requestID:
                        purchaseOrder.RequestID,

                    poDate:
                        purchaseOrder.poDate,

                    supplier:
                        purchaseOrder.supplier,

                    currency:
                        purchaseOrder.currency,

                    totalAmount:
                        purchaseOrder.totalAmount,

                    status:
                        purchaseOrder.status
                },

                workflow: {
                    started: false,
                    message:
                        "Approval workflow has not been started."
                }

            });
        }

        // =====================================================
        // 3. GET BPA DESTINATION
        // =====================================================

        const destination =
            await getDestination({
                destinationName: "PO_BPA"
            });

        console.log(
            "PO_BPA destination found for PO status."
        );

        console.log(
            "BPA JOB ID:",
            purchaseOrder.bpaJobId
        );

        // =====================================================
        // 4. TEMPORARY BPA STATUS CALL
        // =====================================================
        //
        // We will finalize the exact BPA status endpoint
        // after testing the workflow-instance response.
        //

        const response =
            await executeHttpRequest(
                destination,
                {
                    method: "GET",

                    url:
                        "/workflow/rest/v1/workflow-instances/" +
                        encodeURIComponent(
                            purchaseOrder.bpaJobId
                        ),

                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );

        console.log(
            "BPA STATUS HTTP:",
            response.status
        );

        console.log(
            "BPA STATUS RESPONSE:",
            response.data
        );
          // =========================================================
// GET WORKFLOW TASKS
// =========================================================

const taskResponse =
    await executeHttpRequest(
        destination,
        {
            method: "GET",

            url:
                "/workflow/rest/v1/task-instances?workflowInstanceId=" +
                encodeURIComponent(
                    purchaseOrder.bpaJobId
                ),

            headers: {
                "Accept": "application/json"
            }
        }
    );

console.log(
    "BPA TASK RESPONSE:",
    taskResponse.data
);


// =========================================================
// NORMALIZE BPA TASK RESPONSE
// =========================================================

const rawTasks = taskResponse.data;

let tasks = [];

if (Array.isArray(rawTasks)) {
    tasks = rawTasks;
} else if (Array.isArray(rawTasks?.value)) {
    tasks = rawTasks.value;
} else if (Array.isArray(rawTasks?.tasks)) {
    tasks = rawTasks.tasks;
}

// =========================================================
// FIND CURRENT ACTIVE TASK
// =========================================================

const currentTask = tasks.find(function (task) {
    return (
        task.status === "READY" ||
        task.status === "RESERVED" ||
        task.status === "RUNNING"
    );
});

// =========================================================
// CREATE APPROVAL SUMMARY
// =========================================================

const approvalSummary = [
    {
        stage: "BD Approval",
        status: "Not Started",
        approver: ""
    },
    {
        stage: "Senior Manager Approval",
        status: "Not Started",
        approver: ""
    },
    {
        stage: "Director Approval",
        status: "Not Started",
        approver: ""
    }
];

// =========================================================
// MAP BPA TASKS
// =========================================================

tasks.forEach(function (task) {

    const subject =
        task.subject || "";

    let stage = "";

    if (subject.includes("BD Approval")) {
        stage = "BD Approval";
    } else if (subject.includes("Senior Manager")) {
        stage = "Senior Manager Approval";
    } else if (subject.includes("Director")) {
        stage = "Director Approval";
    }

    if (!stage) {
        return;
    }

    const row =
        approvalSummary.find(function (item) {
            return item.stage === stage;
        });

    if (!row) {
        return;
    }

    // Completed task = approved
    if (task.status === "COMPLETED") {

        row.status = "Approved";

    }

    // Active task = pending
    else if (
        task.status === "READY" ||
        task.status === "RESERVED" ||
        task.status === "RUNNING"
    ) {

        row.status = "Pending";

    }

    // Other status
    else {

        row.status = task.status;
    }

    if (
        task.recipientUsers &&
        task.recipientUsers.length > 0
    ) {

        row.approver =
            task.recipientUsers.join(", ");

    } else if (task.processor) {

        row.approver =
            task.processor;
    }
});

// =========================================================
// DETERMINE CURRENT STAGE
// =========================================================

let currentStage = "Workflow in progress";
let pendingWith = "Not available";

if (currentTask) {

    if (
        currentTask.subject &&
        currentTask.subject.includes("BD Approval")
    ) {

        currentStage = "BD Approval";

    } else if (
        currentTask.subject &&
        currentTask.subject.includes("Senior Manager")
    ) {

        currentStage =
            "Senior Manager Approval";

    } else if (
        currentTask.subject &&
        currentTask.subject.includes("Director")
    ) {

        currentStage =
            "Director Approval";
    }

    if (
        currentTask.recipientUsers &&
        currentTask.recipientUsers.length > 0
    ) {

        pendingWith =
            currentTask.recipientUsers.join(", ");

    } else if (currentTask.processor) {

        pendingWith =
            currentTask.processor;
    }
}

// =========================================================
// RETURN CLEAN RESPONSE
// =========================================================

return JSON.stringify({

    success: true,

    purchaseOrder: {
        poNumber: purchaseOrder.poNumber,
        requestID: purchaseOrder.RequestID,
        poDate: purchaseOrder.poDate,
        supplier: purchaseOrder.supplier,
        currency: purchaseOrder.currency,
        totalAmount: purchaseOrder.totalAmount,
        status: purchaseOrder.status
    },

    workflow: {
        id: response.data.id,
        status: response.data.status,
        startedAt: response.data.startedAt,
        completedAt: response.data.completedAt
    },

    currentApproval: {
        currentStage: currentStage,
        pendingWith: pendingWith,
        taskStatus:
            currentTask?.status || "NO_ACTIVE_TASK"
    },

    approvalSummary: approvalSummary

});
    } catch (error) {

        console.error(
            "========================================"
        );

        console.error(
            "GET PO STATUS FAILED"
        );

        console.error(
            "STATUS:",
            error.response?.status
        );

        console.error(
            "RESPONSE:",
            error.response?.data
        );

        console.error(
            "MESSAGE:",
            error.message
        );

        console.error(
            "========================================"
        );

        return req.error(
            500,
            "Unable to retrieve PO approval status: " +
            (
                error.response?.data?.message ||
                error.message ||
                String(error)
            )
        );
    }
});
// =========================================================
// IMPORT PENDING PURCHASE ORDERS FROM OCR PARTNER API
// =========================================================
this.on("ImportPendingPOs", async (req) => {

    const tx = cds.tx(req);

    try {

        // =====================================================
        // 1. GET OCR ODATA DESTINATION
        // =====================================================

        const destination = await getDestination({
            destinationName: "OCR_PO_API"
        });

        console.log(
            "========================================"
        );

        console.log(
            "OCR DESTINATION"
        );

        console.log(
            "Destination name:",
            destination.name
        );

        console.log(
            "Destination URL:",
            destination.url
        );

        console.log(
            "========================================"
        );


        // =====================================================
        // 2. CALL FRIEND'S ODATA
        // =====================================================

        const response =
            await executeHttpRequest(
                destination,
                {
                    method: "GET",

                    url:
                        "/odata/v4/invoice/OcrPurchaseOrders?$expand=items",

                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        // =====================================================
        // 3. READ ODATA RESPONSE
        // =====================================================

        const apiData =
            response.data;


        console.log(
            "OCR ODATA STATUS:",
            response.status
        );

        console.log(
            "OCR ODATA RESPONSE:",
            JSON.stringify(
                apiData,
                null,
                2
            )
        );


        // =====================================================
        // 4. GET PO ARRAY
        // =====================================================

        const externalPOs =
            Array.isArray(
                apiData?.value
            )
                ? apiData.value
                : [];


        console.log(
            "EXTERNAL PO COUNT:",
            externalPOs.length
        );


        if (
            !Array.isArray(
                externalPOs
            )
        ) {

            return req.error(
                500,
                "Invalid OData response."
            );
        }


        // =====================================================
        // 5. COUNTERS
        // =====================================================

        let imported = 0;
        let skipped = 0;

        const importedPOs = [];


        // =====================================================
        // 6. PROCESS EACH PURCHASE ORDER
        // =====================================================

        for (
            const externalPO
            of externalPOs
        ) {

            // -------------------------------------------------
            // PO NUMBER
            // -------------------------------------------------

            const poNumber =
                String(
                    externalPO.po_no ||
                    ""
                ).trim();


            if (!poNumber) {

                console.warn(
                    "Skipping PO because po_no is missing."
                );

                skipped++;

                continue;
            }


            // -------------------------------------------------
            // ITEMS
            // -------------------------------------------------

            const lineItems =
                Array.isArray(
                    externalPO.items
                )
                    ? externalPO.items
                    : [];


            // -------------------------------------------------
            // CHECK DUPLICATE
            // -------------------------------------------------

            const existingPO =
                await tx.run(
                    SELECT.one
                        .from(PurchaseOrders)
                        .where({
                            poNumber:
                                poNumber
                        })
                );


            if (existingPO) {

                console.log(
                    `PO ${poNumber} already exists. Skipping duplicate.`
                );

                skipped++;

                continue;
            }


            // -------------------------------------------------
            // INTERNAL PO ID
            // -------------------------------------------------

            const purchaseOrderID =
                cds.utils.uuid();


            // -------------------------------------------------
            // NORMALIZE PO DATE
            // -------------------------------------------------

            let poDate = null;

            if (
                externalPO.po_date
            ) {

                const parsedDate =
                    new Date(
                        externalPO.po_date
                    );

                if (
                    !Number.isNaN(
                        parsedDate.getTime()
                    )
                ) {

                    poDate =
                        parsedDate
                            .toISOString()
                            .substring(
                                0,
                                10
                            );
                }
            }


            // -------------------------------------------------
            // NUMERIC VALUES
            // -------------------------------------------------

            const subtotal =
                Number(
                    externalPO.subtotal
                ) || 0;


            const gst =
                Number(
                    externalPO.gst_amount
                ) || 0;


            const totalAmount =
                Number(
                    externalPO.total_amount
                ) || 0;


            // -------------------------------------------------
            // INSERT PURCHASE ORDER HEADER
            // -------------------------------------------------

            await tx.run(
                INSERT
                    .into(PurchaseOrders)
                    .entries({

                        ID:
                            purchaseOrderID,

                        RequestID:
                            "EXT-" +
                            poNumber,

                        poNumber:
                            poNumber,

                        poDate:
                            poDate,

                        currency:
                            String(
                                externalPO.currency ||
                                "INR"
                            ),

                        subtotal:
                            subtotal,

                        gst:
                            gst,

                        source:
                            "OCR_API",

                        mha:
                            "",

                        deliveryDate:
                            null,

                        billToCustomer:
                            "",

                        shipToCustomer:
                            "",

                        supplier:
                            "",

                        supplierAddress:
                            "",

                        specialInstructions:
                            "Imported from OCR OData",

                        status:
                            "Draft",

                        sentToApproval:
                            false,

                        totalAmount:
                            totalAmount,

                        totalItems:
                            lineItems.length,

                        bpaJobId:
                            "",

                        bpaStatus:
                            "NOT_TRIGGERED"

                    })
            );


            // -------------------------------------------------
            // INSERT PURCHASE ORDER ITEMS
            // -------------------------------------------------

            const itemsToInsert =
                lineItems.map(
                    function (
                        item,
                        index
                    ) {

                        return {

                            ID:
                                cds.utils.uuid(),

                            parent_ID:
                                purchaseOrderID,

                            subRequestID:
                                Number(
                                    item.line_no
                                ) ||
                                index + 1,

                            materialcode:
                                String(
                                    item.material_code ||
                                    ""
                                ),

                            materialdescription:
                                String(
                                    item.material_description ||
                                    ""
                                ),

                            plant:
                                String(
                                    item.plant ||
                                    ""
                                ),

                            unit:
                                String(
                                    item.unit ||
                                    ""
                                ),

                            quantity:
                                Number(
                                    item.qty
                                ) || 0,

                            unitPrice:
                                Number(
                                    item.rate
                                ) || 0,

                            discountPercent:
                                Number(
                                    item.discount_percent
                                ) || 0,

                            totalPrice:
                                Number(
                                    item.amount
                                ) || 0

                        };
                    }
                );


            if (
                itemsToInsert.length > 0
            ) {

                await tx.run(
                    INSERT
                        .into(
                            PurchaseOrderItems
                        )
                        .entries(
                            itemsToInsert
                        )
                );

            }


            // -------------------------------------------------
            // IMPORT SUCCESS
            // -------------------------------------------------

            imported++;

            importedPOs.push(
                poNumber
            );


            console.log(
                `PO ${poNumber} imported successfully with ${lineItems.length} item(s).`
            );

        }


        // =====================================================
        // 7. RETURN RESULT
        // =====================================================

        const result = {

            success:
                true,

            imported:
                imported,

            skipped:
                skipped,

            purchaseOrders:
                importedPOs,

            message:
                imported +
                " Purchase Order(s) imported successfully."

        };


        console.log(
            "========================================"
        );

        console.log(
            "OCR PO IMPORT COMPLETED"
        );

        console.log(
            JSON.stringify(
                result,
                null,
                2
            )
        );

        console.log(
            "========================================"
        );


        return JSON.stringify(
            result
        );


    } catch (error) {

        console.error(
            "========================================"
        );

        console.error(
            "OCR PO IMPORT FAILED"
        );

        console.error(
            "Status:",
            error.response?.status
        );

        console.error(
            "Response:",
            error.response?.data
        );

        console.error(
            "Message:",
            error.message
        );

        console.error(
            "========================================"
        );


        return req.error(
            500,
            "Unable to import pending Purchase Orders: " +
            (
                error.message ||
                String(error)
            )
        );
    }

});
});