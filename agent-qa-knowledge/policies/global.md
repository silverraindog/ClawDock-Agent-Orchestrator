<!--
agent-qa policies — global scope

Write one rule per line, in plain imperative English. Every active (non-comment)
line in this file becomes a QA rule the agent follows.

Example (inactive — it lives inside this comment):
Always dismiss the cookie banner before asserting page content

Scoping: this file is the global scope. Add sibling files named <product>.md
next to it for product-scoped rules.

Sovereignty: policies are human-asserted and win every conflict. agent-qa serves
every active line here to the planner verbatim on every run, never summarized,
so keep rules few and deliberate. A long file draws a warning; it is never cut.

agent-qa strips HTML comments before serving, so a comment-only file like this
one is an empty policy. Comments cannot nest: close one before opening another.
Add rules below this comment block to activate them.
-->
