---
name: Ravidu Abeywardana · Portfolio
description: A cinematic dark portfolio read through an analyst's lens.
colors:
  bg: "#0a0607"
  bg-2: "#130b0c"
  bg-3: "#1c0f11"
  cream: "#f6efe9"
  cream-2: "#cfc5bf"
  mute: "#958a85"
  red: "#e8161e"
  red-hot: "#ff4a3d"
  red-deep: "#6e0205"
  blood: "#2a0306"
typography:
  display:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(3rem, 6.8vw, 7rem)"
    fontWeight: 700
    lineHeight: 0.94
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 5.4vw, 5rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  accent:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "1.08em"
    fontWeight: 400
    lineHeight: 1
  title:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(1.35rem, 2vw, 1.8rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  data:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "10px"
  card: "26px"
  pill: "999px"
spacing:
  gutter: "clamp(20px, 4.5vw, 64px)"
  section: "clamp(110px, 14vw, 180px)"
  head-gap: "clamp(48px, 7vw, 88px)"
components:
  button-primary:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.bg}"
    rounded: "{rounded.pill}"
    padding: "0 1.55em"
    height: "52px"
  button-ghost:
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: "0 1.55em"
    height: "52px"
  nav:
    backgroundColor: "{colors.bg-2}"
    textColor: "{colors.cream-2}"
    rounded: "{rounded.pill}"
    height: "60px"
  skill-pill:
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: "0.66em 1em"
  skill-pill-hot:
    backgroundColor: "{colors.red}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
  case-card:
    backgroundColor: "{colors.bg-2}"
    textColor: "{colors.cream}"
    rounded: "{rounded.card}"
  tag:
    textColor: "{colors.cream-2}"
    typography: "{typography.data}"
    rounded: "{rounded.pill}"
---

# Design System: Ravidu Abeywardana · Portfolio

## Overview

A cinematic dark portfolio in the register Ravidu chose (hameduiux.online, "make it darker"), rebuilt around an analyst's habits. The page is a dark stage lit in red. The portrait is the hero, and visitors read it through a cursor lens that shows the true-colour photo, a grid and a coordinate readout. Skills fall into a bar chart made of the skills themselves. Each case study draws its own real figures. Every fact comes from the CV.

## Colors

- **Ground:** `bg` (warm near-black) everywhere; `bg-2` and `bg-3` for raised surfaces (nav, case cards, chart band).
- **Type:** `cream` for headings and key text; `cream-2` for body; `mute` for data labels only.
- **Signal red:** `red` for filled marks (the hot pill per chart column, intro squares, logo dot); `red-hot` for italic accent words, case numbers, chart fills and the timeline line. `red-deep` and `blood` exist only as stage light (radial washes) and as the multiply tint on the portrait.
- The primary action is cream, not red: red is light and data, and cream is what you click.

## Typography

- **Bricolage Grotesque** 600–800 for display, headings and big figures, tracked tight (−0.03 to −0.05em).
- **Instrument Serif italic** for exactly one accent word per heading (*numbers*, *builder*, *table*, *work*, *worked*, *dataset*), in `red-hot`, set about 1.08× larger.
- **Archivo** for body and controls. **Martian Mono** for data: labels, readouts, dates, tags, notes under charts.

## Layout

- Content width is 1240px with a fluid gutter. The hero is full-bleed: the portrait fills the right 64% and fades into the ground on its left edge.
- Section heads put the headline on the left and a short paragraph on the right; they stack below 900px.
- Pacing: hero, then a quiet lit statement, then dense facts, the skill chart, sideways work (pinned on screens 1024px and wider, stacked below), the timeline, and a big close with an outline marquee.
- Breakpoints: 1080 (facts and chart go 2-up), 900 (nav menu, stacked hero, single-column timeline), 560 (single-column facts, compact chart).

## Elevation & Depth

Depth comes from light, not shadow: radial red washes behind the hero, skills and contact, and the portrait's red multiply. Raised surfaces are a step lighter than the ground, with a 1px cream hairline at 10–20% opacity. There are no drop shadows except the timeline dot's halo.

## Shapes

Pills for every control and tag (999px). Case cards use 26px corners; the readout and small chips 6–10px. The lens is a perfect circle with a 1px cream ring.

## Components

- **Intro:** a full-screen name marquee and a typed query (`SELECT insight FROM ravidu;`) with a load counter. It runs once per session, skips on any input, and doesn't run under reduced motion.
- **Analyst lens:** the portrait is greyscale under a red multiply. The lens clips a true-colour copy plus a grid, and its readout shows x/y and a "Detected:" tool name. The readout flips side near the edges.
- **Lit statement:** words light from 14% to full cream as the paragraph scrolls through.
- **Skill chart:** four columns of pills, stacked bottom-up, on a hairline baseline with the count above. The first pill in each column is the hot one. Pills drop in once.
- **Case card:** a visual panel (bars, a 1,000-square SKU grid, a big figure, index bars, or SOP and people marks), each with a mono note explaining the scale. Then the number, meta line, title, text and tags.
- **Timeline:** a hairline rule with a red progress line, and a dot that fills as each row passes.
- **Nav:** a floating blurred pill with the serif logo, links, and a cream "Let's talk" button. It hides on scroll down and becomes a dropdown below 900px.

## Do's and Don'ts

- Do keep every number traceable to the CV and say how each chart is scaled.
- Do keep red to light and data; keep cream for actions.
- Do use one italic serif word per heading, never more.
- Don't bring back cards, suits or magic framing (rejected by Ravidu).
- Don't add eyebrow labels above headings.
- Don't add testimonials, client logos or invented projects.
