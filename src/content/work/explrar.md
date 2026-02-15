---
title: "Explrar"
date: "2024-08-10" 
description: "An AI powered trip planner and document organizer."
coverImage: "https://res.cloudinary.com/barthkosi/image/upload/explrar-cover-blue.webp"
bannerImage: "https://res.cloudinary.com/barthkosi/image/upload/explrar-banner.webp"
author: "Barth"
tags: ["UI/UX" , "Product Design"]
buttonText: "Live Website"
buttonLink: "https://www.explrar.com"
---

I opened the existing designs and felt dread.

Not the dramatic kind — just that quiet, sinking feeling you get when you realize the thing in front of you has been through a lot of hands and none of them were talking to each other. Inconsistent components, no real style flow between screens, colors yanked straight from the logo and spread across the UI like a hostage situation. Yellow and blue, everywhere, fighting. Nobody winning.

![Before](https://res.cloudinary.com/barthkosi/image/upload/old-explrar.webp)

My initial job was simple: re-design the payment flow. Get in, do the work, get out. Which I did. But you can't unsee what you've seen, and I filed every broken thing away in the back of my head for later.

Later came faster than expected.

Explrar was pivoting, recent logo refresh and the whole product was shifting to AI-first — not a chatbot, not a back-and-forth conversation, but something quieter and more considered. A single form. Five inputs. You pick your destination, your dates, your group size, your meal preferences, your activity level, and the product hands you a fully custom itinerary. No prompt anxiety. No staring at a blinking cursor trying to figure out how to phrase your request. Just options, a click, and a plan.

![VISUAL: Logo refresh before vs after](https://res.cloudinary.com/barthkosi/image/upload/placeholder.webp)

That got my attention. And with a new brief came something I didn't have before — room to actually cook.

### The Itch

I was maybe 30-40% through the project. Designing screens, following the brief, doing the thing. And then that part of my brain — the one that's gotten me in trouble and saved me in equal measure — just kicked in.

*What if this button was rounder?*

That's it. That was the whole thought. I finished the screen I was on, then cranked the border radius from 8px to 99px, and dear God, how the vibe changed. It stopped feeling like a shadCN clone — no hate to the goat — and started feeling like an actual product with its own identity. Something approachable. Something that didn't make you feel like you were filing a tax return when booking a holiday.

![8px radius vs 99px radius on the same button or card](https://res.cloudinary.com/barthkosi/image/upload/explrar-button-change.webp)

I sent it over. Described the change. And got one of my favourite client feedbacks I've ever received:

*"I trust your judgment."*

Those four words liberated me.

From there it was a cascade. The next thing that had been quietly bothering me was the typeface — Poppins, one of the grandfathers of ugly typography. I know, I know. It's everywhere. That's the problem. I tried a few alternatives against the UI and landed on Manrope for headings and labels, Inter for body text. Clean, modern, just characterful enough without screaming for attention.

![Type comparison — Poppins vs Manrope/Inter on the same screen](https://res.cloudinary.com/barthkosi/image/upload/placeholder.webp)

Then came the color reckoning.

The original UI had yellow and blue running through everything — pulled straight from the logo and spread across the interface like it was doing the brand a favor. It wasn't. Right around the time the AI redesign kicked off, Explrar refreshed their logo, and the yellow got quietly demoted to a tiny arrow in the mark. That was all the opening I needed. So I made the call to cut it from the UI entirely. The yellow failed every contrast ratio test possible, didn't play well with light text, and designing around it would've been a constant battle with accessibility for a color that wasn't even pulling its weight anymore. So out it went.

![Color comparison — yellow/blue version vs blue-only version, same screen](https://res.cloudinary.com/barthkosi/image/upload/placeholder.webp)

Blue took the lead. Things started breathing.

![Before/after — full screen comparison, old design vs new](https://res.cloudinary.com/barthkosi/image/upload/placeholder.webp)

### The System

At some point during the redesign I'd standardized enough of the UI that a pattern was clearly emerging. There was a flow to it, a logic. And once you can see the logic, building a design system isn't really optional anymore — it's just the obvious next step.

So I pitched it.

![Screens with padding highlighted to show consistent spacing](https://res.cloudinary.com/barthkosi/image/upload/placeholder.webp)

The argument was simple: a proper system would make iteration faster, open up more room for creativity on the interesting problems, and stop the quiet chaos of color inconsistencies that had been creeping in. I couldn't imagine handing off a UI with 50 different hardcoded color values to a developer and calling that a good day's work.

I built it the way you're supposed to build these things — atomically. Single components first, small and isolated, then scaling up, nesting smaller pieces inside larger ones until you had a full vocabulary. Buttons, inputs, cards, dropdowns, all the way up to full section templates. Over 40 components total, each with usage guidelines, consistent naming schemes, and documented spacing and sizing values.

![Full design system spread — Figma screenshot showing all 40+ components laid out](https://res.cloudinary.com/barthkosi/image/upload/placeholder.webp)

This next part came out of a specific frustration one that a lot of designers can relate to. One of the devs was eyeballing everything — typography, spacing, scaling. Just winging it. And I'd watch my carefully considered layouts come back slightly off in ways that were hard to articulate but impossible to ignore. So I started writing obsessively detailed documentation. Every value. Every rule. The kind of specs that leave no room for interpretation, which is exactly the point.

![Snippet of handoff documentation — spacing values, naming conventions, usage guidelines, multiple shots](https://res.cloudinary.com/barthkosi/image/upload/placeholder.webp)

My favorite things to build were the custom dropdown components for the itinerary form. Nothing revolutionary about them technically — they were just fun to build, and I cared a lot about making sure they felt exactly right. Consistent, considered, unmistakably Explrar. Sometimes that's the whole job.

![Custom dropdown components](https://res.cloudinary.com/barthkosi/image/upload/explrar-custom-dropdown.webp)

### The Form

The centerpiece of the AI redesign was a single screen.

![Itinerary form screens](https://res.cloudinary.com/barthkosi/image/upload/explrar-itinerary-form.webp)

Five inputs: destination city, trip dates, number of travelers, meal preferences, and activity level. That's it. Fill it out, and the app hands you a fully tailored itinerary.

The biggest design decision here wasn't visual, it was structural. Ideally I would have split this across multiple screens — one input per step, something more considered and delightful at each stage. But time wasn't on my side, and doing it that way meant designing an entire micro-experience around each input to keep the form filling from feeling like a chore. There just wasn't enough runway for that. So one screen it was — and the constraint became the brief. Make it tight, make it clear, make sure everything is visible without scrolling. No endless clicking into a neverending list. If I couldn't make it delightful across multiple screens, I was going to make it effortless on one.

![Custom dropdown component in use](https://res.cloudinary.com/barthkosi/image/upload/explrar-date-picker.webp)

The constraint that came with that decision was making sure all five inputs were visible without scrolling. I didn't want anyone feeling like they were clicking into a neverending list. So the layout had to be tight, considered, and clear — which is where the custom dropdowns earned their keep. Each one built to fit the vibe exactly, nothing borrowed from a component library, nothing that felt out of place.

Silent AI. You don't talk to it. You don't prompt it. You just tell it what you need through a form that takes thirty seconds to fill, and it does the rest.

![](https://res.cloudinary.com/barthkosi/image/upload/explrar-trip-plan.webp)

![](https://res.cloudinary.com/barthkosi/image/upload/explrar-activities.webp)

![](https://res.cloudinary.com/barthkosi/image/upload/explrar-map.webp)

### Everything Else

Not every screen needs a crisis to be worth designing well.

The home screen was the first thing users would see after logging in, so it had to do a lot without feeling busy. I built it around four widgets — upcoming trips, surfacing the next thing you needed to know; past trips, giving you a quiet record of where you'd been; documents uploaded, so you always knew what you had ready; and your current badge, with a progress indicator showing how close you were to the next one.

![Home screen showing all four widgets](https://res.cloudinary.com/barthkosi/image/upload/explrar-homescreen.webp)

The document storage feature came later. The idea was straightforward — a place to keep digital copies of the things you always need on a trip. The more interesting part was the upload flow. Instead of a full screen takeover, I went with a bottom sheet. You tap upload, the sheet comes up, you select your document, and then you link it to a trip. And here's the quiet smart part: depending on where in the app you trigger the upload from, it already knows which trip to suggest. Context-aware, frictionless, exactly the kind of detail that nobody notices until it's missing.

![Document upload bottom sheet](https://res.cloudinary.com/barthkosi/image/upload/placeholder.webp)

![Document upload screen](https://res.cloudinary.com/barthkosi/image/upload/placeholder.webp)

![Document upload - closeup](https://res.cloudinary.com/barthkosi/image/upload/placeholder.webp)

Then there were the badges. 

![Explrar badges](https://res.cloudinary.com/barthkosi/image/upload/explrar-badges.webp)

Users earned them based on number of trips completed — each one a custom illustration, with a color system that evolved the further you climbed. The early badges looked one way, the later ones felt like you'd actually earned something different. It was one of the more purely fun things to design on this project, and it gave me a reason to start illustrating again, which I hadn't expected from a travel app.

![Three badge screen side by side in the UI](https://res.cloudinary.com/barthkosi/image/upload/placeholder.webp)

### Looking Back

This project was a rollercoaster. I came in with low expectations, a narrow brief, and a payment flow to design. I left with a full AI redesign, a design system with over 40 components, a document storage feature, a badge system, a home screen, and a bunch of illustrated badges that I got to draw myself.

![](https://res.cloudinary.com/barthkosi/image/upload/placeholder.webp)

![](https://res.cloudinary.com/barthkosi/image/upload/placeholder.webp)

![](https://res.cloudinary.com/barthkosi/image/upload/placeholder.webp)

![Extra UI and even stuff that was not shipped 4-5 screens](https://res.cloudinary.com/barthkosi/image/upload/placeholder.webp)

There was also a widget tutorial flow I designed — illustrated instructions walking users through adding an Explrar Widget to their home screen. It never made it to production, which is always a little sad, but it exists, and it was good work.

![](https://res.cloudinary.com/barthkosi/image/upload/explrar-widget-tutorial.webp)

:::
![](https://res.cloudinary.com/barthkosi/image/upload/explrar-widget-tutorial.webp)
![](https://res.cloudinary.com/barthkosi/image/upload/explrar-widget-tutorial.webp)
:::

The creative freedom came slowly and then all at once, and once it arrived I grabbed it with both hands. The design system alone was one of the better learning experiences I've had — I'm always trying to learn while I'm designing, and building something that structured, that documented, that considered from the ground up, was genuinely satisfying in a way I didn't see coming.

I came in uninvested. I left grateful.

Sometimes that's the best kind of project.