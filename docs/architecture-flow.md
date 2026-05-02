# Factum architecture flow

This document is a **readable map** of how the stack fits together: **who decides and routes** (management), **what runs in order** (structure), **where Gensyn shows up**, and **where 0G (“OG”) shows up**.

For local bring-up and env profiles, see [nodes-runbook.md](./nodes-runbook.md). For AXL HTTP semantics, see [axl/AGENTS.md](../axl/AGENTS.md).

**Diagram key (throughout this page):** indigo = **management / routing**, green = **specialist structure**, amber / gold = **Gensyn** surfaces, teal / cyan = **0G**, dashed strokes = **keys or optional paths**.

---

## 1. Management vs structure

| Layer | Role | Main code / config |
|--------|------|---------------------|
| **Management** | Job lifecycle, strictness, transport choice, progress to UI, DB | `AgentOrchestratorService`, Bull worker (`jobs/queue.ts`), `AxlAgentRouterService`, `FACTUM_MODE`, `GENSYN_AXL_*`, `AXL_PEER_*` |
| **Structure** | Ordered specialist steps, payloads, ML artifacts, receipt fields | `runExperiment()` sequence in `agent-orchestrator.service.ts`, `ProofService.createReceipt()` |

**Management** answers: *when* does an agent run, *local vs AXL*, and *what happens on timeout / missing peers*.  
**Structure** answers: *which* agent follows which, and *what data* flows (plan → validation → training → proof).

---

## 2. End-to-end flow (management + structure)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '15px', 'primaryTextColor': '#0f172a' }}}%%
flowchart TB
  classDef mgmt fill:#eef2ff,stroke:#4f46e5,stroke-width:2px,color:#1e1b4b
  classDef mgmtHi fill:#c7d2fe,stroke:#4338ca,stroke-width:2px,color:#1e1b4b
  classDef struct fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#064e3b
  classDef structHi fill:#a7f3d0,stroke:#047857,stroke-width:2px,color:#064e3b
  classDef route fill:#fff7ed,stroke:#ea580c,stroke-width:2px,color:#7c2d12
  classDef axl fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f
  classDef danger fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#7f1d1d
  classDef side fill:#f1f5f9,stroke:#64748b,stroke-width:2px,color:#334155
  classDef loop fill:#faf5ff,stroke:#9333ea,stroke-width:2px,color:#581c87

  subgraph mgmt [" Management — who routes & how "]
    direction TB
    WEB([apps/web])
    API([Hono API · :4000])
    Q[("Redis · Bull queue")]
    W([Experiment worker])
    ORCH([AgentOrchestratorService.runExperiment])
    ROUTER([AxlAgentRouterService.invoke])
    MODE{{FACTUM_MODE · GENSYN_AXL · peers}}
    WEB --> API -->|enqueueExperiment| Q --> W --> ORCH --> ROUTER
    ROUTER --> MODE
    MODE -->|dev · AXL off or no peer| LOCAL[localHandler · in-process TS]
    MODE -->|gensyn · peer missing| THROW[Throw · peer required]
    MODE -->|AXL on · peer set| AXL[AxlTransportClient · /send → /recv]
    class WEB,API,Q,W,ORCH mgmt
    class ROUTER mgmtHi
    class MODE route
    class LOCAL mgmt
    class THROW danger
    class AXL axl
  end

  subgraph struct [" Structure — ordered specialists "]
    direction TB
    C1[evidence_classifier]
    C2[experiment_planner]
    C3[validation_agent]
    C4[diagnosis_agent]
    LOOP{{"Up to 4 attempts"}}
    C5[strategy_agent]
    C6[training_agent]
    C7[reflection_agent]
    C8[verifier]
    C9[answer_generator]
    PROOF[ProofService.createReceipt]
    ORCH -.->|invoke chain| C1
    C1 --> C2 --> C3 --> C4 --> LOOP
    LOOP --> C5 --> C6 --> C7
    C7 -->|retry / finish| LOOP
    LOOP --> C8 --> C9 --> PROOF
    class C1,C2,C3,C4,C5,C6,C7,C8,C9 struct
    class PROOF structHi
    class LOOP loop
  end

  subgraph side [" Side — heavy compute "]
    ML([workers/ml-runner · :8000])
    C6 -.->|MlWorkerService.runExperiment| ML
    class ML side
  end

  style mgmt fill:#f8fafc,stroke:#4f46e5,stroke-width:2px
  style struct fill:#f0fdf4,stroke:#059669,stroke-width:2px
  style side fill:#f8fafc,stroke:#94a3b8,stroke-dasharray: 5 3
```

**Notes**

- Every boxed specialist goes through **`axlRouter.invoke`**: same *structure*, but **transport** is either **in-process** (`localHandler`) or **AXL** to a worker peer (topic `factum.<agent>`).
- **`training_agent`** is structural routing to the same invoke pattern; the **heavy compute** is typically the ML worker when running locally (`MlWorkerService.runExperiment`).

---

## 3. Agent-to-agent interaction (logical vs wire)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '15px' }}}%%
flowchart LR
  classDef logic fill:#e0e7ff,stroke:#4338ca,stroke-width:2px,color:#1e1b4b
  classDef wire fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f

  subgraph logical [" Logical · always true "]
    direction TB
    O([Orchestrator in API])
    A1[Specialist n]
    A2[Specialist n+1]
    O -->|synchronous invoke| A1
    A1 -->|then| A2
    class O,A1,A2 logic
  end

  subgraph wirefr [" Wire · env-dependent "]
    direction TB
    O2([Orchestrator])
    N["Go AXL node · HTTP :9002"]
    P["Peer AXL node · specialist"]
    W2([TS worker ↔ peer])
    O2 -->|GENSYN_AXL_API_URL| N
    N -->|P2P · /send| P
    P --> W2
    W2 -->|reply · mesh| N
    N -->|poll · /recv| O2
    class O2,N,P,W2 wire
  end

  style logical fill:#eef2ff,stroke:#6366f1,stroke-width:2px
  style wirefr fill:#fffbeb,stroke:#d97706,stroke-width:2px
```

Specialists do **not** call each other directly. The **orchestrator** owns order, state, and DB updates; AXL only **relocates** where a given specialist’s code runs.

---

## 4. Where **Gensyn** is used

Gensyn appears in **three** separate places; they are **not** the same subsystem.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '15px' }}}%%
flowchart TB
  classDef axl fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
  classDef ree fill:#ffe4e6,stroke:#be123c,stroke-width:2px,color:#881337
  classDef chain fill:#e0e7ff,stroke:#3730a3,stroke-width:2px,color:#1e1b4b
  classDef key fill:#f1f5f9,stroke:#64748b,stroke-width:2px,stroke-dasharray: 4 2

  subgraph g_axl [" ① AXL — agent transport "]
    R([AxlAgentRouterService])
    T[AxlTransportClient]
    GK[AXL_PEER_* · 64-hex keys]
    R --> T
    GK -.->|resolve · to| R
    class R,T axl
    class GK key
  end

  subgraph g_ree [" ② REE — optional verifier run "]
    V([VerifierService.run])
    REE[GensynReeService · gensyn-sdk / ReeClient]
    OAI[OpenAI JSON · fallback]
    V -->|GENSYN_REE_ENABLED| REE
    V -->|else / REE failure| OAI
    class V,REE,OAI ree
  end

  subgraph g_chain [" ③ Gensyn chain — optional L1 anchor "]
    ANC([ProofService.anchorReceipt])
    GC[GensynChainService.anchorExperiment]
    OG0[Skip on disabled / error]
    ANC -->|client configured| GC
    ANC -->|disabled or error| OG0
    class ANC,GC,OG0 chain
  end

  style g_axl fill:#fffbeb,stroke:#d97706,stroke-width:2px
  style g_ree fill:#fff1f2,stroke:#e11d48,stroke-width:2px
  style g_chain fill:#eef2ff,stroke:#4f46e5,stroke-width:2px
```

| Gensyn piece | Purpose |
|--------------|---------|
| **AXL** | Route specialist work to **remote peers** over the Go node (`/send` / `/recv`), using **Ed25519 peer IDs** from env. |
| **REE** (`@factum/gensyn-ree`) | When enabled, run **verifier**-style checks via **`gensyn-sdk`** with receipts; optional **OpenAI** fallback inside `VerifierService`. |
| **Gensyn chain** | When `GENSYN_CHAIN_ENABLED` and keys/registry are valid, **anchor** experiment hashes on **Gensyn L1** before considering 0G. |

---

## 5. Where **0G (“OG”)** is used

0G is the **proof and persistence** stack: storage for artifacts, optional **compute** attestation on the narrative, and **on-chain** receipt registration.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '15px' }}}%%
flowchart TB
  classDef og fill:#ccfbf1,stroke:#0d9488,stroke-width:2px,color:#134e4a
  classDef ogHi fill:#5eead4,stroke:#0f766e,stroke-width:2px,color:#042f2e
  classDef anchor fill:#ecfeff,stroke:#0891b2,stroke-width:2px,color:#164e63

  subgraph og [" 0G · proof pipeline "]
    PR([createReceipt])
    ST[OgStorageService · uploads]
    CP[OgComputeService · verifyNarrative]
    CH[OgChainService · registerReceipt]
    PR --> ST
    PR --> CP
    PR --> CH
    class PR,ST,CP og
    class CH ogHi
  end

  subgraph anchor [" Anchoring order · ProofService "]
    A1([Try Gensyn chain first])
    A2([Then 0G receipt registry])
    A1 --> A2
    class A1,A2 anchor
  end

  style og fill:#f0fdfa,stroke:#14b8a6,stroke-width:2px
  style anchor fill:#ecfeff,stroke:#06b6d4,stroke-width:2px
```

| 0G piece | Role |
|----------|------|
| **Storage** (`OG_STORAGE_*`) | Upload dataset, reports, manifest, final `proof_receipt.json`; URIs go into the receipt. |
| **Compute** (`OG_COMPUTE_*`) | Third-party-style **LLM check** on the verification narrative; metadata embedded as `computeProof` on the receipt when the client loads. |
| **Chain** (`OG_CHAIN_*`) | **Register** the receipt hash and related hashes; used when Gensyn anchoring is off or fails. |

---

## 6. Single swimlane view (compact)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '15px' }}}%%
flowchart TB
  classDef bandM fill:#eef2ff,stroke:#4f46e5,stroke-width:2px,color:#1e1b4b
  classDef bandS fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#064e3b
  classDef bandG fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f
  classDef bandO fill:#ccfbf1,stroke:#0d9488,stroke-width:2px,color:#134e4a

  subgraph M [" Band A · Management "]
    direction LR
    m1([User / API])
    m2([Bull worker])
    m3([Orchestrator + AXL router])
    m1 --> m2 --> m3
    class m1,m2,m3 bandM
  end

  subgraph S [" Band B · Structure "]
    direction TB
    s1[/classify · plan · validate · diagnose/]
    s2[/strategy · train · reflect loop/]
    s3[/verify · answer/]
    s1 --> s2 --> s3
    class s1,s2,s3 bandS
  end

  subgraph G [" Band C · Gensyn "]
    direction TB
    g1[AXL · routing]
    g2[REE · verifier optional]
    g3[Chain · L1 anchor optional]
    g1 ~~~ g2 ~~~ g3
    class g1,g2,g3 bandG
  end

  subgraph O [" Band D · 0G "]
    direction LR
    o1[Storage]
    o2[Compute check]
    o3[Chain registry]
    o1 --> o2 --> o3
    class o1,o2,o3 bandO
  end

  m3 --> s1
  m3 --> g1
  s3 --> g2
  s3 --> o1
  g3 -.->|successful anchor before OG registry| o3

  style M fill:#f8fafc,stroke:#6366f1,stroke-width:3px
  style S fill:#ecfdf5,stroke:#10b981,stroke-width:3px
  style G fill:#fffbeb,stroke:#f59e0b,stroke-width:3px
  style O fill:#f0fdfa,stroke:#14b8a6,stroke-width:3px
```

**Note:** In the **Gensyn** band, **AXL / REE / Chain** are **different hooks** (not a pipeline); `~~~` only stacks them for layout.

---

## Related files

- Orchestration sequence: `apps/api/src/services/agent-orchestrator.service.ts`
- AXL routing: `apps/api/src/services/axl-agent-router.service.ts`
- Verifier + REE: `apps/api/src/services/agents/verifier.service.ts`, `apps/api/src/services/gensyn-ree.service.ts`
- Proof + 0G + Gensyn chain: `apps/api/src/services/proof.service.ts`
