using po_workflows from '../db/schema';

@path: '/cat-service'
service CatService {

    entity PurchaseOrders
        as projection on po_workflows.PurchaseOrders;

    entity PurchaseOrderItems
        as projection on po_workflows.PurchaseOrderItems;

        

 action SaveDraft(
        poData : LargeString
    ) returns PurchaseOrders;

    action SubmitForApproval(
        purchaseOrderID : UUID
    ) returns PurchaseOrders;



    action ImportPendingPOs() returns LargeString;

    action GetPOStatus(
    purchaseOrderID : UUID
) returns LargeString;
}