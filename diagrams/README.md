# Trip Tracker 2026 — Architecture & Data Diagrams

This directory contains key system design diagrams and architectural flows for **Trip Tracker 2026**.

These diagrams are written in **Mermaid** syntax. You can view them rendered interactively directly inside GitHub, VS Code (using a Markdown preview extension), or by copying the source to any Mermaid editor online.

---

## 1. Application Architecture & Data Sync Flow

Describes how user interactions flow through the UI layer to update the Zustand global store state, which then persists changes asynchronously through the storage adapter (`localforage` wrapper) to IndexedDB.

```mermaid
graph TD
    %% Styling definitions
    classDef ui fill:#1e293b,stroke:#0f172a,color:#f8fafc,stroke-width:2px;
    classDef store fill:#0e7490,stroke:#0891b2,color:#f8fafc,stroke-width:2px;
    classDef storage fill:#b45309,stroke:#d97706,color:#f8fafc,stroke-width:2px;
    classDef ext fill:#15803d,stroke:#16a34a,color:#f8fafc,stroke-width:2px;

    %% Elements
    subgraph UI_Layer ["React UI / Components"]
        App["App.tsx (Main Coordinator)"]:::ui
        ExList["ExpenseList.tsx"]:::ui
        ExForm["ExpenseForm.tsx"]:::ui
        BalSet["BalancesSettlements.tsx"]:::ui
        MemGrp["MembersGroupsTab.tsx"]:::ui
        SetTab["SettingsTab.tsx"]:::ui
    end

    subgraph Store_Layer ["State Management"]
        Store["tripStore.ts (Zustand)"]:::store
        State["In-Memory State:
        - trips
        - expenses
        - members
        - groups
        - categories
        - activeTripId"]:::store
        PersistWrapper["persist() Store Action Wrapper"]:::store
    end

    subgraph Storage_Layer ["Persistent Cache Services"]
        StorageService["storage.ts (Storage Adapter)"]:::storage
        LocalForage["localforage (IndexedDB Wrapper)"]:::storage
        DB[("IndexedDB (PWA Database)")]:::storage
    end

    subgraph External ["Browser API & Connectivity"]
        NetIndicator["window.navigator.onLine Listener"]:::ext
        StorageEstimate["navigator.storage.estimate()"]:::ext
    end

    %% Relations
    App --> ExList
    App --> ExForm
    App --> BalSet
    App --> MemGrp
    App --> SetTab

    ExList & ExForm & BalSet & MemGrp & SetTab <--> Store
    Store <--> State
    Store --> PersistWrapper
    PersistWrapper --> StorageService
    StorageService --> LocalForage
    LocalForage <--> DB

    SetTab <--> NetIndicator
    SetTab <--> StorageEstimate
```

Source file: [app_architecture.mmd](app_architecture.mmd)

---

## 2. Settlements & Net Balances Calculation Engine

Outlines the pipeline that filters active expenses, resolves shares using different split modes (Equal, Custom weights, Exact amounts, and Percentages), performs rounding correction, and optimizes cash transfers using a greedy settlement matching algorithm.

```mermaid
graph TD
    %% Styling
    classDef startEnd fill:#1e293b,stroke:#0f172a,color:#f8fafc,stroke-width:2px;
    classDef process fill:#0369a1,stroke:#0284c7,color:#f8fafc,stroke-width:1px;
    classDef decision fill:#b45309,stroke:#d97706,color:#f8fafc,stroke-width:2px;
    classDef data fill:#0f766e,stroke:#0d9488,color:#f8fafc,stroke-width:1px;

    %% Flow Node Layout
    Start(["Start calculation: calculateSettlements(trip, members, expenses, groups)"]):::startEnd
    
    %% Input Parsing
    FilterNonSettlements["Filter out expense entries starting with 'Settlement:'"]:::process
    
    %% Split Shares Resolution
    ForEachExpense{"For each expense..."}:::decision
    
    ResolvePayer{"Is payer in trip.memberIds?"}:::decision
    PayerWarning["Flag expense: Payer Deleted warning"]:::process
    
    ResolveShares["Compute share per active participant based on splitMode:"]:::process
    
    EqualMode["splitMode == 'equal':
    Divide amount by active splitMemberIds count"]:::process
    CustomMode["splitMode == 'custom':
    Distribute proportionally using splitConfig weights"]:::process
    ExactMode["splitMode == 'exact':
    Map splitConfig exact amounts to participants"]:::process
    PercentMode["splitMode == 'percentage':
    Multiply amount by splitConfig percentages"]:::process
    
    ApplyRounding["Apply Rounding Adjustment:
    Remaining cents absorbed by payer (or first active participant)"]:::process
    
    AccumulateNet["Accumulate member net balances:
    Balance = Total Paid - Total Resolved Share"]:::process
    
    %% Transfer Optimization
    PartitionBalances["Partition members into two sorted lists:
    1. Creditors (Balance > 0, descending)
    2. Debtors (Balance < 0, ascending by absolute value)"]:::process
    
    GreedyLoop{"Are there remaining non-zero balances?"}:::decision
    
    PerformTransfer["Match largest Debtor (D) and largest Creditor (C):
    Transfer amount = min(|Balance(D)|, |Balance(C)|)"]:::process
    
    RecordTransfer["Record Transfer:
    'D pays C amount'"]:::data
    
    UpdateBalances["Subtract Transfer amount from C and add to D's balance"]:::process
    
    End(["End Calculation: Return optimized transfers & final net balances"]):::startEnd

    %% Connections
    Start --> FilterNonSettlements
    FilterNonSettlements --> ForEachExpense
    ForEachExpense --> ResolvePayer
    
    ResolvePayer -- No --> PayerWarning
    ResolvePayer -- Yes --> ResolveShares
    PayerWarning --> ResolveShares
    
    ResolveShares --> EqualMode & CustomMode & ExactMode & PercentMode
    EqualMode & CustomMode & ExactMode & PercentMode --> ApplyRounding
    ApplyRounding --> AccumulateNet
    
    AccumulateNet --> PartitionBalances
    PartitionBalances --> GreedyLoop
    
    GreedyLoop -- Yes --> PerformTransfer
    PerformTransfer --> RecordTransfer
    RecordTransfer --> UpdateBalances
    UpdateBalances --> PartitionBalances
    
    GreedyLoop -- No --> End
```

Source file: [settlements_engine.mmd](settlements_engine.mmd)

---

## 3. Data Model ER Diagram

Documents entity attributes and relationships within the database schema.

```mermaid
erDiagram
    TRIP {
        string id PK
        string name
        string startDate
        string endDate
        string baseCurrency
        string_array memberIds FK
        string_array groupIds FK
        int createdAt
        int updatedAt
    }

    MEMBER {
        string id PK
        string name
        boolean archived
    }

    GROUP {
        string id PK
        string name
        string_array memberIds FK
    }

    EXPENSE {
        string id PK
        string tripId FK
        string title
        double amount
        string currency
        string category FK
        string date
        string paidBy FK
        string splitMode
        string_array splitMemberIds FK
        object splitConfig
        object resolvedShares
        string receiptImage
        int createdAt
        int updatedAt
    }

    CATEGORY {
        string id PK
        string name
        string icon
        boolean isCustom
    }

    TRIP ||--o{ EXPENSE : contains
    TRIP ||--o{ MEMBER : includes
    TRIP ||--o{ GROUP : includes
    MEMBER ||--o{ GROUP : belongs_to
    MEMBER ||--o{ EXPENSE : pays
    MEMBER ||--o{ EXPENSE : splits
    CATEGORY ||--o{ EXPENSE : classifies
```

Source file: [data_model.mmd](data_model.mmd)
