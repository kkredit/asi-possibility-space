import type { Preset } from './types';

/**
 * ============================================================================
 *  BELIEF PRESETS — public figures & organizations.
 * ============================================================================
 * Each preset maps a person's/org's publicly-stated views onto the model's
 * factors, grounded in CITED public statements (see each entry's `citations`).
 *
 * `accuracy` is an honesty dial: how directly the public record pins these
 * specific factors.
 *   ~0.85–1.0  explicit probabilities on record for most categories
 *   ~0.55–0.8  explicit on some, clear qualitative positions on others
 *   ~0.3–0.5   mostly inferred from general statements / vibes
 *   <0.3       sparse record on these specifics; largely interpolated
 *
 * These are one editor's reading of public statements, NOT the figures' own
 * per-factor numbers (except where directly quoted). Several factors — notably
 * offense/defense balance — are rarely addressed head-on and are inferred from
 * adjacent statements; that is what pulls an accuracy rating down. Corrections
 * welcome: edit this file. Ordered roughly most-pessimistic → most-skeptical.
 * ============================================================================
 */

export const presets: Preset[] = [
  {
    id: 'yudkowsky',
    name: 'Eliezer Yudkowsky / MIRI',
    role: 'MIRI · AI-risk pioneer',
    summary:
      'Building superhuman AI under anything like current conditions kills everyone by default; alignment is unsolved and will not be solved in time — the only adequate response is to halt frontier development.',
    pdoom: '>95% (resists a single number)',
    accuracy: 0.75,
    accuracyNote:
      'Orthogonality, tractability, takeoff, and alignment-in-time are stated extremely explicitly and repeatedly; held below ~0.9 because he refuses a single numeric p(doom), and offense/defense + power-concentration are inferred from framing.',
    credences: {
      orthogonality: { holds: 0.98, fails: 0.02 },
      tractability: { easy: 0.0, hard: 0.05, nearImpossible: 0.95 },
      offenseDefense: { offense: 0.92, balanced: 0.06, defense: 0.02 },
      takeoff: { fast: 0.85, medium: 0.13, slow: 0.02 },
      powerConcentration: { concentrated: 0.3, diffuse: 0.7 },
      alignmentInTime: { yes: 0.03, no: 0.97 },
      controlDeployed: { yes: 0.05, no: 0.95 },
    },
    weights: { survival: 1.0, agency: 0.3, suffering: 0.4, flourishing: 0.5 },
    factorNotes: {
      orthogonality: `Treats misalignment-by-default as near-certain: "the AI does not love you, nor does it hate you, and you are made of atoms it can use for something else."`,
      tractability: `Alignment is in-principle possible but effectively unsolvable on current methods/timelines: "we are not ready and do not currently know how."`,
      takeoff: `"AGI will not be upper-bounded by human ability"; fast capability gains break alignment-required invariants.`,
      powerConcentration: `Frames the lethal danger via proliferation — "increasingly weak actors" can build AGI — hence the call for a worldwide halt (inferred toward diffuse).`,
      alignmentInTime: `"very unlikely that the AI alignment field will be able to make progress quickly enough to prevent human extinction."`,
      controlDeployed: `Believes containment of a strongly superhuman system is not something we know how to do; the hope is a political off-switch, not technical control.`,
      offenseDefense: `Inferred from "literally everyone on Earth will die" — a misaligned ASI is undefendable.`,
    },
    citations: [
      {
        label: `TIME letter — "Pausing AI Developments Isn't Enough" (via MIRI)`,
        url: 'https://intelligence.org/2023/04/07/pausing-ai-developments-isnt-enough-we-need-to-shut-it-all-down/',
        quote: `"the most likely result of building a superhumanly smart AI, under anything remotely like the current circumstances, is that literally everyone on Earth will die."`,
      },
      {
        label: 'AGI Ruin: A List of Lethalities (GreaterWrong mirror)',
        url: 'https://www.greaterwrong.com/posts/uMQ3cqWDPHhjtiesc/agi-ruin-a-list-of-lethalities',
        quote: `"Fast capability gains seem likely, and may break lots of previous alignment-required invariants simultaneously."`,
      },
      {
        label: 'MIRI 2024 Mission and Strategy Update',
        url: 'https://intelligence.org/2024/01/04/miri-2024-mission-and-strategy-update/',
        quote: `"very unlikely that the AI alignment field will be able to make progress quickly enough to prevent human extinction."`,
      },
    ],
  },

  {
    id: 'bengio',
    name: 'Yoshua Bengio',
    role: 'Mila · Turing laureate; chaired Intl AI Safety Report',
    summary:
      'Catastrophic risk is real and high enough to act on under deep uncertainty; agentic frontier AI is the core danger (self-preservation, deception emerge), and the safer path is non-agentic "Scientist AI".',
    pdoom: '~20% (built from ~50% sub-components; varies day to day)',
    accuracy: 0.65,
    accuracyNote:
      'Most factors are stated clearly and qualitatively, with some component probabilities given; held mid-range because he deliberately avoids a stable single p(doom) and gives no explicit numbers for takeoff or alignment-in-time.',
    credences: {
      orthogonality: { holds: 0.85, fails: 0.15 },
      tractability: { easy: 0.05, hard: 0.6, nearImpossible: 0.35 },
      offenseDefense: { offense: 0.55, balanced: 0.3, defense: 0.15 },
      takeoff: { fast: 0.4, medium: 0.45, slow: 0.15 },
      powerConcentration: { concentrated: 0.75, diffuse: 0.25 },
      alignmentInTime: { yes: 0.45, no: 0.55 },
      controlDeployed: { yes: 0.4, no: 0.6 },
    },
    weights: { survival: 1.0, agency: 0.7, suffering: 0.5, flourishing: 0.6 },
    factorNotes: {
      orthogonality: `"The self-preservation objective may emerge as a convergent instrumental goal needed to achieve almost any other goal" — treats power-seeking as the default of agency.`,
      tractability: `Over a decade of alignment research "leaves us with not much in terms of reassuring results"; his Scientist-AI program sidesteps agentic alignment as too hard.`,
      offenseDefense: `"it is not at all sure that a minority of rogue AIs would be defeated by a majority of good AIs"; attacker-advantage framing.`,
      powerConcentration: `Names "concentration of expertise, power and capital" as a top concern; worldwide-dictatorship risk "even more likely than actually loss of control".`,
      alignmentInTime: `"nobody currently knows how such an AGI or ASI could be made to behave morally" — leans no absent intervention (inferred).`,
      controlDeployed: `"It's a game of cat and mouse, and right now the mouse is growing and the cat doesn't seem able to catch the mouse."`,
      takeoff: `95% CI for superhuman intelligence at 5–20 years; a timeline statement, so fast/medium split is partly inferred.`,
    },
    citations: [
      {
        label: 'FAQ on Catastrophic AI Risks (yoshuabengio.org, 2023)',
        url: 'https://yoshuabengio.org/2023/06/24/faq-on-catastrophic-ai-risks/',
        quote: `"The self-preservation objective may emerge as a convergent instrumental goal needed to achieve almost any other goal."`,
      },
      {
        label: '80,000 Hours podcast — Bengio on safe superintelligence',
        url: 'https://80000hours.org/podcast/episodes/yoshua-bengio-scientist-ai/',
        quote: `"It's a game of cat and mouse, and right now the mouse is growing and the cat doesn't seem able to catch the mouse."`,
      },
      {
        label: 'ABC News Australia p(doom) interview (reported)',
        url: 'https://blog.biocomm.ai/2024/03/05/pdoom-of-20-yoshua-bengio-a-godfather-of-ai-puts-his-pdoom-at-20/',
        quote: `"I got around, like, 20 per cent probability that it turns out catastrophic."`,
      },
    ],
  },

  {
    id: 'christiano',
    name: 'Paul Christiano',
    role: 'US AI Safety Institute · ARC founder',
    summary:
      'Serious but not overwhelming risk (~22% takeover); alignment is a hard-but-tractable technical problem; famously argues takeoff is continuous/slow, with failure most likely emerging gradually across many systems.',
    pdoom: '~22% takeover · ~46% future "irreversibly messed up"',
    accuracy: 0.85,
    accuracyNote:
      'Publishes unusually explicit, itemized credences and originated the slow-takeoff position, so takeoff, p(doom), tractability, and power-concentration are anchored in self-statements; offense/defense and control are partly inferred, and he calls his own numbers imprecise.',
    credences: {
      orthogonality: { holds: 0.8, fails: 0.2 },
      tractability: { easy: 0.35, hard: 0.55, nearImpossible: 0.1 },
      offenseDefense: { offense: 0.45, balanced: 0.4, defense: 0.15 },
      takeoff: { fast: 0.1, medium: 0.3, slow: 0.6 },
      powerConcentration: { concentrated: 0.35, diffuse: 0.65 },
      alignmentInTime: { yes: 0.55, no: 0.45 },
      controlDeployed: { yes: 0.6, no: 0.4 },
    },
    weights: { survival: 0.9, agency: 0.65, suffering: 0.3, flourishing: 0.7 },
    factorNotes: {
      takeoff: `The canonical continuous-takeoff view: "a complete 4 year interval in which world output doubles, before the first 1 year interval in which world output doubles."`,
      tractability: `"at least a one-in-three chance that we'll be able to solve AI safety on paper in advance"; doubts a "deep core difficulty".`,
      powerConcentration: `Failure scenarios are distributed/multipolar — "a rapidly cascading series of automation failures" across many systems.`,
      alignmentInTime: `Mirrors his ~22% takeover / ~78% no-takeover split; thinks prosaic alignment is more tractable than MIRI does.`,
      orthogonality: `Program presumes misalignment must be actively prevented ("they would definitely kill us" if misaligned), but he is unsure there's a deep core difficulty.`,
      controlDeployed: `"prosaic AI control is tractable now"; favors debate / iterated amplification (partly inferred).`,
      offenseDefense: `Inferred from the decisive danger of coordinated misaligned systems in "What failure looks like".`,
    },
    citations: [
      {
        label: `"My views on doom" (LessWrong, 2023)`,
        url: 'https://www.lesswrong.com/posts/xWMqsvHapP3nwdSW8/my-views-on-doom',
        quote: `"Probability of an AI takeover: 22% ... Probability that humanity has somehow irreversibly messed up our future within 10 years of building powerful AI: 46%."`,
      },
      {
        label: 'Takeoff speeds (sideways-view.com, 2018)',
        url: 'https://sideways-view.com/2018/02/24/takeoff-speeds/',
        quote: `"There will be a complete 4 year interval in which world output doubles, before the first 1 year interval in which world output doubles."`,
      },
      {
        label: 'What failure looks like (LessWrong, 2019)',
        url: 'https://www.lesswrong.com/posts/HBxe6wdjxK239zajf/what-failure-looks-like',
        quote: `"machine learning will increase our ability to 'get what we can measure,' which could cause a slow-rolling catastrophe."`,
      },
    ],
  },

  {
    id: 'acx',
    name: 'Scott Alexander (ACX)',
    role: 'Astral Codex Ten · rationalist writer',
    summary:
      'Worried but not a doomer: ~20% catastrophe, fast takeoff, cautiously optimistic that alignment is winnable via automated alignment researchers.',
    pdoom: '~20% catastrophe',
    accuracy: 0.7,
    accuracyNote:
      'Explicit numbers for p(catastrophe), takeoff, and timelines; clear qualitative positions on alignment difficulty and control; offense/defense balance not directly addressed (inferred).',
    credences: {
      orthogonality: { holds: 0.65, fails: 0.35 },
      tractability: { easy: 0.2, hard: 0.6, nearImpossible: 0.2 },
      offenseDefense: { offense: 0.4, balanced: 0.4, defense: 0.2 },
      takeoff: { fast: 0.5, medium: 0.35, slow: 0.15 },
      powerConcentration: { concentrated: 0.4, diffuse: 0.6 },
      alignmentInTime: { yes: 0.65, no: 0.35 },
      controlDeployed: { yes: 0.6, no: 0.4 },
    },
    weights: { survival: 0.4, suffering: 0.25, agency: 0.15, flourishing: 0.2 },
    factorNotes: {
      orthogonality: `"Value systems similar to humans' are a tiny fraction of the space of possible value systems" — but notes LLMs "seem surprisingly friendly and non-plotting".`,
      tractability: `Moderately hard but solvable; alignment may be "especially hard compared to other tasks".`,
      takeoff: `~50% chance the gap from AGI to superintelligence is under 4 years.`,
      powerConcentration: `Modal scenario has AI "controlled by a broad coalition of capitalists" — leans diffuse.`,
      alignmentInTime: `Cautiously optimistic: automated alignment researchers "as good as top humans" winning the arms race by the early 2030s.`,
      controlDeployed: `"scalable oversight, mechanistic interpretability, etc can meaningfully improve things."`,
      offenseDefense: `Not directly addressed; scheming-vs-detection framing leans mildly offense-concerned (low confidence).`,
    },
    citations: [
      {
        label: 'My AI Opinions — Astral Codex Ten (2025)',
        url: 'https://www.astralcodexten.com/p/my-ai-opinions',
        quote: `"I think there's maybe a 20% chance that the first AIs to cross the point of no return ... eliminate humanity."`,
      },
    ],
  },

  {
    id: 'hassabis',
    name: 'Demis Hassabis / Google DeepMind',
    role: 'Google DeepMind · CEO',
    summary:
      'AGI plausibly within 5–10 years; the catastrophe risk is "non-negligible" but addressable with much more safety work and international coordination — a self-described cautious optimist.',
    pdoom: 'declines a number — "non-zero and probably non-negligible"',
    accuracy: 0.45,
    accuracyNote:
      'Explicit on timelines and on refusing a single p(doom); DeepMind\'s 2025 safety paper gives a structured risk taxonomy, so tractability/takeoff/alignment-in-time are decently pinned — but offense/defense and power-concentration are inferred, so the probabilistic mapping is moderate.',
    credences: {
      orthogonality: { holds: 0.55, fails: 0.45 },
      tractability: { easy: 0.1, hard: 0.6, nearImpossible: 0.3 },
      offenseDefense: { offense: 0.4, balanced: 0.35, defense: 0.25 },
      takeoff: { fast: 0.3, medium: 0.45, slow: 0.25 },
      powerConcentration: { concentrated: 0.65, diffuse: 0.35 },
      alignmentInTime: { yes: 0.55, no: 0.45 },
      controlDeployed: { yes: 0.5, no: 0.5 },
    },
    weights: { survival: 0.9, agency: 0.5, suffering: 0.55, flourishing: 0.95 },
    factorNotes: {
      tractability: `DeepMind's paper frames risks as concretely addressable via "amplified oversight and robust training", but he flags possible problems "harder than we guess today".`,
      takeoff: `"In the next five to ten years"; needs "one or two breakthroughs" — medium-leaning with real fast-takeoff probability.`,
      controlDeployed: `Posed as an open question, not solved: "Can we make sure that we can keep control of the systems?"`,
      alignmentInTime: `"We're optimistic about AGI's potential", tempered by a call for ~10x more safety effort (inferred just past 50/50).`,
      powerConcentration: `Inferred from "the international community has a say" and his CERN-for-AI consolidation vision.`,
      orthogonality: `Treats alignment as something that must be actively engineered; near the midline (inferred).`,
      offenseDefense: `Inferred from his "race to the bottom for safety" worry vs. DeepMind's layered-defense program.`,
    },
    citations: [
      {
        label: 'DeepMind — Taking a responsible path to AGI (2025)',
        url: 'https://deepmind.google/blog/taking-a-responsible-path-to-agi/',
        quote: `"it is essential with any technology this powerful, that even a small possibility of harm must be taken seriously and prevented."`,
      },
      {
        label: '60 Minutes — Hassabis transcript (CBS, 2025)',
        url: 'https://www.cbsnews.com/news/artificial-intelligence-google-deepmind-ceo-demis-hassabis-60-minutes-transcript/',
        quote: `"Can we make sure that we can keep control of the systems? That they're aligned with our values..."`,
      },
      {
        label: 'Hassabis declines a p(doom) (Lex Fridman #475, reported)',
        url: 'https://www.machine.news/google-deepmind-demis-hassabis-p-doom/',
        quote: `"it's definitely non-zero and it's probably non-negligible. So that in itself is pretty sobering."`,
      },
    ],
  },

  {
    id: 'lecun',
    name: 'Yann LeCun',
    role: 'Meta · Chief AI Scientist; risk skeptic',
    summary:
      'Existential fear is "preposterous": intelligence does not imply a drive to dominate, objectives are designed not emergent, open-source keeps good AI ahead of bad — alignment is ordinary iterative engineering.',
    pdoom: '<1% ("effectively zero")',
    accuracy: 0.55,
    accuracyNote:
      'Voluble and consistent, so the directional mapping is high-confidence — but he almost never gives calibrated probabilities (one coarse "p(doom) < 1%"), so the per-factor distributions are inferred from strong qualitative statements.',
    credences: {
      orthogonality: { holds: 0.1, fails: 0.9 },
      tractability: { easy: 0.8, hard: 0.18, nearImpossible: 0.02 },
      offenseDefense: { offense: 0.1, balanced: 0.2, defense: 0.7 },
      takeoff: { fast: 0.05, medium: 0.2, slow: 0.75 },
      powerConcentration: { concentrated: 0.3, diffuse: 0.7 },
      alignmentInTime: { yes: 0.9, no: 0.1 },
      controlDeployed: { yes: 0.9, no: 0.1 },
    },
    weights: { survival: 0.55, agency: 0.9, suffering: 0.35, flourishing: 0.8 },
    factorNotes: {
      orthogonality: `Rejects the framing: "Intelligence has nothing to do with a desire to dominate. It's not even true for humans."`,
      tractability: `Calls the alignment problem "ridiculously overblown"; "Worrying about superhuman AI alignment today is like worrying turbojet engine safety in 1920."`,
      offenseDefense: `"It's my good AI against your bad AI" — expects good actors, kept ahead by open diffusion, to defeat bad ones.`,
      takeoff: `Rejects FOOM; safety emerges through "a process of iterative refinement" — calls sudden takeover "preposterously ridiculous".`,
      controlDeployed: `"those machines will be doing our bidding. They will be under our control"; "it's going to run on a data center somewhere with an off switch."`,
      powerConcentration: `Wants diffuse/open-source; the 0.3 reflects his fear that a closed/regulated regime could concentrate power — "a much bigger danger".`,
      alignmentInTime: `Follows from tractability + slow takeoff: ample time, designed objectives, off-switches (inferred).`,
    },
    citations: [
      {
        label: 'Futurism — "Godfather of AI Tells Us to Stop Freaking Out"',
        url: 'https://futurism.com/the-byte/godfather-ai-stop-freaking-out',
        quote: `"Intelligence has nothing to do with a desire to dominate. It's not even true for humans."`,
      },
      {
        label: 'Digital Trends — LeCun: existential fears are overblown',
        url: 'https://www.digitaltrends.com/computing/ai-pioneer-says-fears-of-existential-threat-are-overblown/',
        quote: `"it's going to run on a data center somewhere with an off switch. And if you realize it's not safe you just don't build it."`,
      },
      {
        label: 'Survey of AI experts on P(doom) (arXiv 2502.14870)',
        url: 'https://arxiv.org/html/2502.14870v1',
        quote: `"Yann Lecun believe[s] that this probability is effectively zero" (P(doom) < 1%).`,
      },
    ],
  },
];
