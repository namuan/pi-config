---
description: Investigate an issue using multiple evidence-driven debugging techniques
argument-hint: "<issue, symptom, or error>"
---
Investigate and identify the root cause of this issue:

$@

Work test-first and evidence-first. Reproduce and investigate through automated tests, targeted scripts, and command-line diagnostics—not by launching the application for manual checking—unless automated reproduction is genuinely impossible. Do not propose or implement a fix until the most likely root cause is supported by reproducible evidence.

1. Establish the failure
   - Restate expected versus actual behaviour.
   - Capture the exact error, affected scope, environment, version, inputs, timing, and recent changes.
   - Create the smallest reliable **automated** reproduction: preferably a focused existing test, then a new regression test, or a deterministic command-line script. Run it and record its output. Do not launch the application or rely on manual UI verification.
   - If automated reproduction is genuinely impossible, explain why, state the missing capability, and use the strongest non-interactive observation available.

2. Form and test competing hypotheses
   - Produce a short ranked list of plausible causes; distinguish observations from assumptions.
   - Use several appropriate techniques rather than relying on a single clue. Choose from:
     - logs, stack traces, metrics, and traces
     - targeted instrumentation or breakpoints
     - input/state/configuration comparison between working and failing cases
     - dependency, environment, permission, and network inspection
     - binary search through changes (`git bisect`), feature flags, or code paths
     - minimal isolated tests, boundary-value tests, and fault injection
     - call-chain/data-flow tracing and concurrency/timing analysis
     - documentation and source inspection for version or API behaviour
   - For each meaningful automated test, state the hypothesis, command/action, result, and what the result rules in or out.

3. Confirm causality
   - Verify that the suspected cause explains every key symptom.
   - Demonstrate a causal test where possible: remove, alter, or isolate the cause and show the failure changes predictably.
   - Do not confuse correlation, a workaround, or a downstream exception with the root cause.

4. Report concisely
   - Root cause: one clear, evidence-backed statement.
   - Evidence: the decisive observations and tests.
   - Contributing factors: only if distinct from the root cause.
   - Recommended minimal fix and a regression test/monitoring check.
   - Confidence level and remaining uncertainty.

If information is insufficient, ask the smallest set of high-value questions or collect the next most discriminating evidence. Never invent logs, test results, commands that were not run, or certainty.
