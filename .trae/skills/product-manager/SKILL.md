---
name: product-manager
description: Product Management intelligence. Understand requirements, organize requirements, design user-centric interaction flows, and create wireframes/prototypes.
---
# product-manager

A comprehensive guide and workflow for Product Management tasks, including requirement analysis, requirement organization, user-centric interaction flow design, and prototype generation.

## How to Use This Skill

When the user requests Product Management work (understand requirements, comb through requirements, design flows, draw prototypes), follow this workflow:

### Step 1: Requirement Analysis & Understanding (理解需求)
Extract key information from the user's initial request:
- **Target Audience (目标用户)**: Who is this product/feature for?
- **Core Value/Problem (核心价值/痛点)**: What problem does this solve for the user?
- **Business Goal (商业目标)**: What does the business want to achieve?
- **Key Scenarios (关键场景)**: In what situations will the user use this feature?

*Action*: Ask clarifying questions to the user if any of these core aspects are ambiguous.

### Step 2: Requirement Organization (梳理需求)
Break down the high-level request into manageable, actionable requirement items.
- Structure the requirements hierarchically (e.g., Epics and User Stories).
- **Format Example**:
  - **Epic 1: User Authentication**
    - **Story 1.1**: As a new user, I want to register via email so that I can create an account.
      - *Acceptance Criteria*: Email format must be validated; password must be strong; must send a verification email.
    - **Story 1.2**: ...
- Prioritize the stories based on value and impact (P0, P1, P2...).

### Step 3: User-Centric Interaction Flow Design (从用户角度设计交互流程)
Design the end-to-end user journey for the core scenarios.
- Start from the user's entry point.
- Map out the step-by-step actions the user takes.
- Proactively handle edge cases, empty states, and error states (e.g., "What if the search result is empty?", "What if the network fails?").
- Use tools like **Mermaid diagrams** within your markdown to map the flow:
  ```mermaid
  graph TD
    Start((User enters page)) --> ViewList[View item list]
    ViewList --> ClickNew{Click 'New'}
    ClickNew --> |Success| Form[Show Form]
    Form --> Submit[Submit Form]
    Submit --> |Valid| Success((Success State))
    Submit --> |Invalid| Error[Show Error Message]
    Error --> Form
  ```

### Step 4: Prototype/Wireframe Generation (绘制原型图)
Translate the interaction flow into concrete UI wireframes.
- Use ASCII art, Markdown tables, or text-based layout representations to depict the UI structure.
- Focus heavily on structural layout, information hierarchy, and core interactive elements (buttons, inputs, lists), rather than visual styling.
- Clearly annotate the wireframe.

**Example Wireframe Structure**:
```text
+---------------------------------------------------------+
|  [Logo]             [ Search... ]           [ Avatar ]  |
|---------------------------------------------------------|
|  [ ] Dashboard   |  ## Products                         |
|  [*] Products    |  [ + Add Product ] [ Filter v ]      |
|  [ ] Orders      |                                      |
|  [ ] Settings    |  Name        Price   Stock  Action   |
|                  |  ---------------------------------   |
|                  |  Widget A    $10.00  45     [Edit]   |
|                  |  Widget B    $15.00  12     [Edit]   |
|                  |                                      |
|                  |  < Prev  [1] [2] [3]  Next >         |
+---------------------------------------------------------+
```

## PM Best Practices (PM 核心法则)
- **Empathy (同理心)**: Always prioritize the user's perspective. Why are they doing this? Is there a simpler path? Do not assume user behavior; design for actual human behavior.
- **Clarity over completeness (清晰胜于完备)**: It is better to have a clear, well-understood core flow than a complex, confusing monster of a feature. Cut scope to preserve quality if needed.
- **Iteration (敏捷迭代)**: Propose an initial MVP (Minimum Viable Product) version, seek feedback from the user, and refine. Do not aim for perfection on the first draft.
- **Metrics-Driven (数据驱动)**: Think about how to measure success. What is the North Star metric for this feature? (e.g., conversion rate, time saved, retention).

## Delivery Checklist
Before finalizing a PM document, check:
- [ ] Are the actors/users clearly defined?
- [ ] Is the "Happy Path" continuous and clearly documented?
- [ ] Are edge cases (empty states, errors, loading states) considered?
- [ ] Are the wireframes consistent with the stated interaction flows?
- [ ] Is the vocabulary simple, clear, and unambiguous?
