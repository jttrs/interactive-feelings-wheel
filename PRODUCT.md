# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: therapists, in session with a client.** The therapist uses the wheel with the client to explore and name the client's feelings. The tool is never meant to be used by a client alone.
- **Clients, alongside their therapist.** Adults use the full wheel. **Younger clients (mostly children)** use Simplified view, which the therapist chooses up front because children don't yet have the nuance for the outer-ring words.
- Sessions happen both in the room (laptop or tablet shared between therapist and client) and over telehealth (the therapist's screen shared to the client). Who drives the device varies.
- **Phones and tablets are real session devices**, not just "it also works on mobile". Both orientations must give the wheel as much room as possible and keep chosen feelings readable.

## Product Purpose

An interactive version of Geoffrey Roberts' Emotional Word Wheel that gives a therapist and client a shared, structured map of feelings plus plain definitions, to support their conversation. Success means the client finds words for what they feel, with their therapist's help.

## Positioning

A faithful, calm, structural tool, deliberately **not** a self-help or "insight" product. Competitor tools add guidance, interpretation and "insights" that seem designed to stand in for a trained therapist. This product refuses that on purpose: it supplies the wheel's structure and the definitions, and the therapist supplies the guidance.

## Operating Context

- Used live in therapy sessions; the therapist decides which view to use (full wheel, Simplified for younger clients, Focused to go one ring at a time).
- Runs entirely in the browser as a single page with no accounts or backend; nothing about a session is sent anywhere.
- Therapists can open a session straight into a setup from the URL (`?view=simplified`, `?view=focused`, `&panel=hidden`), and the address keeps the current view so it can be bookmarked.
- **Deferred:** saving, printing or sharing a session's chosen feelings (including putting them in the URL). Not in scope for now.

## Capabilities and Constraints

- **The feeling words on the wheel and their definitions are fixed.** They come from an established therapy tool and must not be changed, reworded or filtered (including the "Bad" core feeling).
- **The full wheel is the default view.** Focused and Simplified are opt-in and never switch on by themselves. The UI must not prompt clients to change views; that's the therapist's call.
- **The chosen-feelings list is read-only.** Feelings are removed only by choosing them again on the wheel.
- **No interpretation, advice, scoring or "insights."** On-screen copy may explain how to use the tool, but never what a client's feelings mean.
- The Ko-fi support button stays in the footer as it is.
- Terminology: "feeling" (not "emotion") in the UI; the views are **Full wheel**, **Focused** and **Simplified**.

## Brand Commitments

- Calm, plain voice. The UI explains how to use the tool ("Select a word on the wheel to see its definition here"); it never coaches feelings. The therapist guides the conversation.
- Credit to Geoffrey Roberts (wheel design) and feelingswheel.com (concept) stays in About.
- Atkinson Hyperlegible typeface (chosen for low-vision legibility).

## Evidence on Hand

- Feeling words, families and definitions: `feelings-data.ts` (standard and simplified definitions).
- No testimonials, clinical studies, user counts or endorsements exist. Future work must not invent any.

## Product Principles

1. **The therapist leads; the tool supports.** Never add guidance that could stand in for a therapist.
2. **Faithful to the source wheel.** Its structure and words are the content, not something to optimise.
3. **The whole spectrum by default.** Reduction (Simplified, Focused) is a deliberate choice made by the therapist.
4. **Calm under stress.** Clients may be distressed; nothing should startle, judge or rush them.
5. **Usable by everyone in the room.** Keyboard, screen reader, low vision, touch and small screens are first-class.

## Accessibility & Inclusion

- WCAG 2.2 AA; the colour tokens are contrast-audited (see `styles.css`).
- Full keyboard model (one tab stop into the wheel, ring and family navigation), screen-reader names and announcements, reduced-motion support, and a reading lens for small words.
- Simplified view supports younger clients.
