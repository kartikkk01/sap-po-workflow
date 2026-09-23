namespace po_workflows;

using { cuid, managed } from '@sap/cds/common';

entity PurchaseOrders : cuid, managed {

    RequestID           : String(50);
    poNumber            : String(50);
    poDate              : Date;
    currency            : String(10);
    subtotal             : Decimal(15,2);
    gst                  : Decimal(15,2);
    source             :  String(30);

    mha                 : String(50);
    deliveryDate        : Date;

    billToCustomer      : String(200);
    shipToCustomer      : String(200);

    supplier            : String(200);
    supplierAddress     : String(500);

    specialInstructions : String(1000);

    status              : String(50);
    sentToApproval      : Boolean default false;

    totalAmount         : Decimal(15,2);
    totalItems          : Integer;

    bpaJobId            : String(100);
    bpaStatus           : String(50);

    items : Composition of many PurchaseOrderItems
        on items.parent = $self;
}

entity PurchaseOrderItems : cuid {

    parent              : Association to PurchaseOrders;

    subRequestID        : Integer;

    materialcode        : String(100);
    materialdescription : String(500);

    plant               : String(100);
    unit                : String(20);

    quantity            : Decimal(15,3);
    unitPrice           : Decimal(15,2);
    discountPercent     : Decimal(5,2);
    totalPrice          : Decimal(15,2);
}