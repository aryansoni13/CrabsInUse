# CRABS Construction ERP System
## Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** November 14, 2024  
**Document Type:** Product Requirements Document  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Technical Architecture](#technical-architecture)
4. [Core Features](#core-features)
5. [User Interface & Navigation](#user-interface--navigation)
6. [Data Models](#data-models)
7. [Feature Specifications](#feature-specifications)
8. [Business Logic](#business-logic)
9. [Integration & Export Features](#integration--export-features)
10. [Security & Data Management](#security--data-management)

---

## Executive Summary

CRABS (Construction Resource & Billing System) is a comprehensive Enterprise Resource Planning (ERP) system specifically designed for construction companies to manage projects, orders, items, measurements, and billing processes. The system provides end-to-end project lifecycle management with sophisticated measurement tracking and milestone-based billing capabilities.

### Key Value Propositions
- **Hierarchical Project Management**: Structured project → order → item → measurement workflow
- **Milestone-Based Billing**: Flexible billing breakup with percentage-based milestones
- **Shared Measurement Sheets**: Department-wise collaborative measurement tracking
- **Automated Bill Generation**: RA (Running Account) bill creation with locked measurement data
- **Professional PDF Export**: High-quality PDF generation for bills and abstract sheets
- **Real-time Calculations**: Dynamic financial and progress tracking

---

## System Overview

CRABS is a web-based application built using modern React technologies, designed to streamline construction project management from initial project setup through final billing and documentation.

### Primary Users
- **Project Managers**: Overall project oversight and management
- **Site Engineers**: Measurement data entry and progress tracking
- **Billing Teams**: Invoice generation and financial tracking
- **Department Heads**: Department-specific progress monitoring

### Core Workflow
1. **Project Creation**: Establish new construction projects with client information
2. **Order Management**: Create and manage work orders within projects
3. **Item Definition**: Define billable items with department categorization and billing breakup
4. **Measurement Tracking**: Record detailed measurements with milestone completion
5. **Bill Generation**: Create RA bills based on completed milestones
6. **Documentation**: Generate professional PDF reports and bills

---

## Technical Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Routing**: React Router v6 with nested routing structure
- **State Management**: React hooks with local component state
- **Icons**: Lucide React icon library

### Data Storage
- **Primary Storage**: Browser localStorage for client-side data persistence
- **Data Structure**: Normalized relational data models with foreign key relationships
- **Sample Data**: Built-in sample data initialization for demonstration

### Key Libraries & Dependencies
- **PDF Generation**: jsPDF + html2canvas for high-quality PDF export
- **Form Handling**: React Hook Form with validation
- **UI Components**: shadcn/ui component system
- **Date Handling**: Native JavaScript Date objects
- **Notifications**: Toast notifications for user feedback

---

## Core Features

### 1. Project Management Dashboard
**Purpose**: Central hub for managing all construction projects

**Key Capabilities**:
- Create, edit, and delete projects
- View project statistics (total budget, order count)
- Client information management
- Project-level financial summaries
- Quick navigation to project orders

**Business Value**: Provides executive-level overview of all active projects with key financial metrics

### 2. Order Management System
**Purpose**: Manage work orders within specific projects

**Key Capabilities**:
- Create orders with unique order codes and descriptions
- Link orders to parent projects
- Track order-level financial totals
- Manage order lifecycle from creation to completion
- Navigate to order items for detailed management

**Business Value**: Enables structured breakdown of project work into manageable orders

### 3. Item & Billing Management
**Purpose**: Define billable items with sophisticated billing structures

**Key Capabilities**:
- Create items with detailed specifications (code, description, unit, quantity, rate)
- Department-based categorization
- Flexible billing breakup with multiple milestones
- Percentage-based milestone definitions
- Real-time amount calculations
- Department filtering and sorting

**Business Value**: Supports complex billing structures common in construction projects

### 4. Measurement Sheet System
**Purpose**: Detailed measurement tracking with milestone completion

**Key Capabilities**:
- Shared measurement sheets across department items
- Row-based measurement entry (mark, dimensions, quantities)
- Milestone completion tracking with partial completion support
- Real-time weight and quantity calculations
- Measurement validation and error checking
- Progress visualization

**Business Value**: Ensures accurate measurement tracking and progress monitoring

### 5. RA Bill Generation
**Purpose**: Automated bill creation based on completed measurements

**Key Capabilities**:
- Generate RA (Running Account) bills from locked measurement data
- Milestone-based billing with completed quantities
- Bill numbering and tracking
- Historical bill management
- PDF export for professional documentation

**Business Value**: Streamlines billing process and ensures accuracy

### 6. Bill History & Documentation
**Purpose**: Comprehensive bill tracking and document management

**Key Capabilities**:
- View all generated RA bills
- Bill details with project and order context
- PDF generation and download
- Bill status tracking
- Historical data preservation

**Business Value**: Maintains complete audit trail of all billing activities

---

## User Interface & Navigation

### Navigation Structure
```
/ (Projects Dashboard)
├── /projects/:projectId/orders (Order Management)
│   └── /projects/:projectId/orders/:orderId/items (Item Management)
│       └── /projects/:projectId/orders/:orderId/items/:itemId/measurement (Measurement Sheet)
└── /bill-history (Bill History & Documentation)
```

### Design Principles
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Consistent UI**: shadcn/ui component system for unified experience
- **Intuitive Navigation**: Breadcrumb navigation and clear hierarchy
- **Action-Oriented**: Prominent action buttons for key workflows
- **Data Visualization**: Cards, tables, and statistics for data presentation

### Key UI Components
- **Dashboard Cards**: Project, order, and item summary cards
- **Data Tables**: Sortable, filterable tables for list views
- **Modal Dialogs**: Create/edit forms in overlay dialogs
- **Confirmation Dialogs**: Safety confirmations for destructive actions
- **Toast Notifications**: Real-time feedback for user actions

---

## Data Models

### Project Model
```typescript
interface Project {
  id: string;
  name: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
}
```

### Order Model
```typescript
interface Order {
  id: string;
  projectId: string;
  orderNumber: string;
  orderCode?: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Item Model
```typescript
interface Item {
  id: string;
  orderId: string;
  itemCode?: string;
  description: string;
  unitOfMeasurement: string;
  quantity: number;
  unitRate: number;
  amount: number;
  department: string;
  billingBreakup: BillingBreakup[];
  createdAt: string;
  updatedAt: string;
}
```

### Measurement Row Model
```typescript
interface MeasurementRow {
  id: string;
  itemId: string;
  check: boolean;
  type: string;
  mark: string;
  unit: number;
  length: number;
  width?: number | null;
  thickness?: number | null;
  qty: number;
  totalWeight: number;
  breakupStatus: Record<string, MilestoneStatus>;
  createdAt: string;
  updatedAt: string;
  department: string;
}
```

### RA Bill Model
```typescript
interface RABill {
  id: string;
  orderId: string;
  raNumber: string;
  createdAt: string;
  updatedAt: string;
  lockedData: LockedMeasurementData[];
}
```

---

## Feature Specifications

### Project Management Features

#### Project Creation & Management
- **Create Project**: Form-based project creation with name and client validation
- **Edit Project**: In-place editing of project details
- **Delete Project**: Cascading deletion with confirmation (removes all orders, items, measurements)
- **Project Statistics**: Real-time calculation of total budget and order count
- **Project Navigation**: Direct links to project orders and management

#### Project Dashboard
- **Project Cards**: Visual cards showing key project information
- **Financial Summary**: Total budget calculations across all project items
- **Order Count**: Number of orders per project
- **Creation Date**: Project timeline information
- **Quick Actions**: Edit, delete, and view project actions

### Order Management Features

#### Order Lifecycle Management
- **Order Creation**: Form-based order creation with project linking
- **Order Editing**: Modify order details and descriptions
- **Order Deletion**: Safe deletion with item cascade confirmation
- **Order Statistics**: Item count and total amount calculations
- **Order Navigation**: Links to order items and measurement sheets

#### Order Organization
- **Order Numbering**: Automatic order number generation
- **Order Codes**: Optional custom order codes
- **Descriptions**: Detailed order descriptions and notes
- **Project Context**: Clear project association and navigation

### Item Management Features

#### Item Definition & Configuration
- **Item Creation**: Comprehensive item setup with all required fields
- **Item Editing**: Modify item specifications and billing structure
- **Item Deletion**: Safe deletion with measurement data cascade
- **Unit Management**: Support for multiple units (MT, KG, PCS, SQM, etc.)
- **Department Assignment**: Department-based item categorization

#### Billing Breakup System
- **Milestone Definition**: Create multiple billing milestones per item
- **Percentage Allocation**: Flexible percentage-based milestone distribution
- **Milestone Naming**: Custom milestone names (e.g., "Advance Payment", "Against Structure")
- **Validation**: Ensure milestone percentages total 100%
- **Dynamic Calculation**: Real-time amount calculations based on milestones

#### Item Management Interface
- **Filtering**: Department-based filtering with "All Departments" option
- **Sorting**: Multi-column sorting (description, department, amount, etc.)
- **Search**: Quick item lookup and filtering
- **Bulk Operations**: Mass item management capabilities

### Measurement Sheet Features

#### Measurement Data Entry
- **Row-Based Entry**: Individual measurement rows with complete specifications
- **Dimension Tracking**: Length, width, thickness measurements
- **Quantity Management**: Unit quantities and total weight calculations
- **Mark System**: Identification marks for measurement tracking
- **Type Classification**: Measurement type categorization

#### Shared Measurement Sheets
- **Department Sharing**: Single measurement sheet per department across all items
- **Cross-Item Visibility**: View measurements for all department items
- **Collaborative Entry**: Multiple users can contribute to same measurement sheet
- **Data Consistency**: Shared data model ensures consistency across items

#### Milestone Completion Tracking
- **Milestone Status**: Track completion status for each billing milestone
- **Partial Completion**: Support for partial milestone completion with quantities
- **Progress Visualization**: Visual indicators for milestone progress
- **Date Tracking**: Completion date recording for audit trails
- **Lock Mechanism**: Prevent modification of completed milestones

#### Measurement Calculations
- **Weight Calculations**: Automatic total weight computation
- **Quantity Summation**: Real-time quantity totals
- **Milestone Totals**: Column-wise milestone completion totals
- **Progress Percentages**: Completion percentage calculations
- **Validation**: Data validation and error checking

### RA Bill Generation Features

#### Bill Creation Process
- **Milestone-Based Generation**: Create bills based on completed milestones
- **Data Locking**: Lock measurement data to prevent post-bill modifications
- **RA Numbering**: Automatic RA bill number generation
- **Multi-Item Support**: Include multiple items in single RA bill
- **Department Filtering**: Generate bills for specific departments

#### Bill Content & Structure
- **Abstract Sheet**: Professional bill format with project details
- **Measurement Summary**: Detailed measurement breakdown
- **Milestone Breakdown**: Clear milestone completion status
- **Financial Calculations**: Accurate amount calculations
- **Project Context**: Complete project and order information

#### Bill Management
- **Bill History**: Complete history of all generated bills
- **Bill Viewing**: Detailed bill preview and review
- **PDF Export**: High-quality PDF generation for printing/sharing
- **Bill Status**: Track bill status and completion
- **Audit Trail**: Complete audit trail of bill generation

### PDF Generation Features

#### Professional PDF Output
- **High-Quality Rendering**: 2x scale rendering for crisp output
- **Landscape Orientation**: Optimized for wide construction tables
- **Table Optimization**: Proper handling of wide measurement tables
- **Font Loading**: Ensure proper font rendering in PDFs
- **Image Support**: Include logos and images in PDF output

#### PDF Customization
- **Custom Filenames**: Descriptive filename generation with project/date info
- **Multiple Formats**: Support for different PDF layouts
- **Print Optimization**: Optimized for both screen and print viewing
- **Loading Indicators**: User feedback during PDF generation
- **Error Handling**: Graceful error handling with user notifications

---

## Business Logic

### Financial Calculations
- **Item Amounts**: quantity × unitRate = amount
- **Milestone Amounts**: itemAmount × milestonePercentage / 100
- **Project Totals**: Sum of all item amounts within project
- **Order Totals**: Sum of all item amounts within order
- **Completion Values**: completedQuantity × unitRate × milestonePercentage / 100

### Measurement Calculations
- **Total Weight**: unit × length × width × thickness × qty (where applicable)
- **Milestone Quantities**: Partial or complete quantities per milestone
- **Progress Percentages**: completedWeight / totalWeight × 100
- **Column Totals**: Sum of completed quantities per milestone column

### Data Validation Rules
- **Project Names**: Required, non-empty strings
- **Client Names**: Required, non-empty strings
- **Item Quantities**: Positive numbers only
- **Unit Rates**: Positive numbers only
- **Milestone Percentages**: Must total exactly 100%
- **Measurement Dimensions**: Positive numbers where applicable

### Business Rules
- **Cascading Deletes**: Deleting projects removes all child orders, items, and measurements
- **Department Consistency**: Items in same department share measurement sheets
- **Milestone Locking**: Completed milestones cannot be modified after RA bill generation
- **Data Integrity**: Foreign key relationships maintained across all entities

---

## Integration & Export Features

### PDF Export System
- **Bill PDFs**: Professional RA bill documents
- **Abstract Sheet PDFs**: Detailed project abstract sheets
- **Measurement Summary PDFs**: Comprehensive measurement reports
- **Custom Formatting**: Construction industry standard formatting

### Data Export Capabilities
- **Local Storage**: All data persisted in browser localStorage
- **JSON Export**: Structured data export for backup/migration
- **PDF Reports**: Professional document generation
- **Print Support**: Optimized printing layouts

### Sample Data System
- **Demo Data**: Built-in sample projects, orders, and items
- **Data Initialization**: Automatic sample data setup for new users
- **Reset Capability**: Ability to reset to sample data state
- **Learning Aid**: Helps users understand system capabilities

---

## Security & Data Management

### Data Security
- **Client-Side Storage**: All data stored locally in browser
- **No Server Dependencies**: Eliminates server-side security concerns
- **Data Isolation**: Each browser instance maintains separate data
- **Privacy Protection**: No data transmission to external servers

### Data Persistence
- **localStorage**: Reliable browser-based data storage
- **Structured Storage**: Organized data models with relationships
- **Data Integrity**: Validation and consistency checks
- **Backup Considerations**: Users responsible for data backup

### Error Handling
- **Validation Errors**: Clear user feedback for invalid inputs
- **System Errors**: Graceful error handling with user notifications
- **Data Recovery**: Robust error recovery mechanisms
- **User Guidance**: Helpful error messages and guidance

---

## Conclusion

CRABS Construction ERP System provides a comprehensive solution for construction project management, offering sophisticated measurement tracking, milestone-based billing, and professional documentation capabilities. The system's hierarchical structure, combined with shared measurement sheets and automated bill generation, makes it an ideal solution for construction companies seeking to streamline their project management and billing processes.

The modern React-based architecture ensures a responsive, user-friendly experience while the local storage approach provides simplicity and data privacy. With features like PDF generation, milestone tracking, and department-based organization, CRABS addresses the specific needs of the construction industry while maintaining flexibility for various project types and organizational structures.

---

**Document End**
