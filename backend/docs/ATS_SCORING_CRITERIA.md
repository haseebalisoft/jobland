# ATS deep scoring criteria (HiredLogics)

This document defines what the AI evaluates when producing **`overallAtsScore`** and dimension scores. It mirrors the system prompt sent to Groq/Gemini so product and engineering stay aligned.

## Purpose

Go beyond checklist completeness (name, email, section headers). Assess how well a resume is likely to perform in **applicant tracking systems** and **recruiter skim**—keywords, impact, structure, and risk factors.

## Weighted dimensions (must sum to conceptually 100%)

| ID | Dimension | Weight | What we look for |
|----|-----------|--------|------------------|
| `keywords_semantic` | Keywords & semantic fit | **25%** | Role-relevant nouns/skills/tools; natural use; synonym coverage; **keyword stuffing risk** (repetition without context). |
| `impact_metrics` | Impact & quantification | **25%** | Numbers, %, $, timelines; strong action verbs; outcomes vs duties-only bullets. |
| `structure_parsing` | Structure & ATS parsing | **20%** | Logical section labels; readable plain text; flags for **tables/columns/graphics** that confuse parsers (inferred from text structure). |
| `summary_headline` | Summary & headline | **15%** | Professional title/headline clarity; summary length and value proposition; alignment with experience. |
| `completeness` | Completeness & consistency | **15%** | Contact, skills, experience depth, education, links; gaps and contradictions. |

## Derived analyses (not separate top-level scores)

- **Keyword analysis**: strong terms, missing/weak terms, stuffing risk (`low` / `medium` / `high`).
- **Impact analysis**: whether quantified results appear, examples called out, gaps listed.
- **Recommendations**: prioritized, actionable bullets.

## Overall score

`overallAtsScore` (0–100) should reflect the weighted dimensions and be **defensible** from the resume text—conservative when data is thin.
