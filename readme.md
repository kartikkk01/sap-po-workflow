# SAP Purchase Order Workflow

## Project Overview

The SAP Purchase Order Workflow application is a CAP-based application developed to create, manage, and monitor Purchase Orders (POs) with a multi-level approval workflow.

The application provides a user-friendly SAPUI5 interface for creating Purchase Orders, managing PO items, viewing PO details, and monitoring the approval status of submitted Purchase Orders.

## Business Requirement

The application is designed to streamline the Purchase Order approval process by providing:

- Purchase Order creation and management
- PO item management
- Multi-level approval workflow
- Approval status monitoring
- Current approval stage tracking
- Pending approver information
- Approval history
- PO status-based filtering

## Technologies Used

- SAP CAP (Cloud Application Programming Model)
- Node.js
- SAPUI5
- OData
- SAP Build Process Automation
- SAP BTP
- JavaScript
- CDS (Core Data Services)
- Visual Studio Code / SAP Business Application Studio

## Key Features

### 1. Purchase Order Creation

Users can create Purchase Orders by entering the required PO header information and adding multiple PO items.

### 2. PO Item Management

The application supports adding and managing multiple items within a Purchase Order with dynamic data binding.

### 3. Approval Workflow

SAP Build Process Automation is integrated to implement a multi-level Purchase Order approval workflow.

The workflow manages the approval process and determines the current approval stage and pending approver.

### 4. PO Workflow Monitoring

The application provides a monitoring interface where users can view:

- PO Number
- RFQ ID
- Supplier
- PO Amount
- Workflow Status
- Current Approval Stage
- Pending Approver
- Approval History

### 5. Status-Based Filtering

Purchase Orders can be filtered based on their workflow status, such as:

- Pending Approval
- Approved
- Rejected
- Closed

## Application Architecture

```text
SAPUI5 Frontend
       |
       | OData
       ↓
SAP CAP Backend
       |
       ↓
Business Logic & Data Model
       |
       ↓
SAP Build Process Automation
       |
       ↓
Multi-Level PO Approval Workflow
