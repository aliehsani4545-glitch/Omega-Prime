# dashboard/

The operator-facing research cockpit lives in [`../frontend`](../frontend) (a
Next.js application). This directory is reserved for **alternative / embedded
dashboard surfaces** on the upgrade path, e.g.:

- a lightweight static read-only board for wall displays,
- exported PDF/HTML research briefs (generated from `reports/`),
- an embeddable widget bundle.

For v1, open the full cockpit at **http://localhost:3000** after starting the
frontend. See the root `README.md` for run instructions.
