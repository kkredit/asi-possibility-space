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
    id: 'yampolskiy',
    name: 'Roman Yampolskiy',
    category: 'person',
    affiliation: 'Univ. of Louisville',
    role: 'Univ. of Louisville Â· AI-safety researcher',
    summary:
      'Control of superintelligence is not merely hard but fundamentally impossible — a "perpetual safety machine" — so building AGI is near-certain catastrophe; the only winning move is not to build it.',
    pdoom: '~99.999999%',
    accuracy: 0.78,
    accuracyNote:
      'Headline number, uncontrollability thesis, and s-risk/i-risk taxonomy are explicit and on record, pinning tractability, control, alignment-in-time and the value weights well; takeoff and concentration are hedged, so partly inferred.',
    credences: {
      orthogonality: { holds: 0.92, fails: 0.08 },
      tractability: { easy: 0.0, hard: 0.03, nearImpossible: 0.97 },
      offenseDefense: { offense: 0.85, balanced: 0.1, defense: 0.05 },
      takeoff: { fast: 0.55, medium: 0.35, slow: 0.1 },
      powerConcentration: { concentrated: 0.55, diffuse: 0.45 },
      alignmentInTime: { yes: 0.02, no: 0.98 },
      controlDeployed: { yes: 0.02, no: 0.98 },
    },
    weights: { survival: 1.0, agency: 0.7, suffering: 0.85, flourishing: 0.4 },
    factorNotes: {
      tractability: `Core thesis: controlling superintelligence "is like a problem of creating a perpetual safety machine ... it's impossible"; control "cannot be fully" established.`,
      controlDeployed: `His controllability papers argue control is fundamentally impossible — deployed control is near-zero.`,
      alignmentInTime: `"The only way to win this game is not to play it" — expects no alignment solution.`,
      offenseDefense: `"Superintelligence will come up with something completely new ... We may not even recognize that as a possible path" — unanticipatable offense.`,
      orthogonality: `Treats safe outcomes as the rare exception requiring an unsolvable feat; "I don't see a good outcome long term for humanity".`,
      takeoff: `Cites prediction markets ("maybe we're two years away") but can accept decades — hedged (partly inferred).`,
      powerConcentration: `Mixed: warns open-source gives "weapons to psychopaths" yet says it is "equally bad, no matter who makes it" (partly inferred).`,
    },
    citations: [
      {
        label: 'Lex Fridman Podcast #431 — transcript',
        url: 'https://lexfridman.com/roman-yampolskiy-transcript/',
        quote: `"the problem of controlling AGI or superintelligence ... is like a problem of creating a perpetual safety machine ... it's impossible."`,
      },
      {
        label: 'On the Controllability of AI (arXiv:2008.04071)',
        url: 'https://arxiv.org/abs/2008.04071',
        quote: `"advanced AI can't be fully controlled ... the possibility of controlling [AGI/superintelligence] has not been formally established."`,
      },
      {
        label: 'Yampolskiy puts catastrophe odds at 99.999999% (Business Insider, syndicated)',
        url: 'https://tech.yahoo.com/roman-yampolskiy-says-theres-99-171220674.html',
        quote: `Places the odds of catastrophe at "99.999999%" and called Musk's ~20% "a bit too conservative".`,
      },
    ],
  },

  {
    id: 'yudkowsky',
    name: 'Eliezer Yudkowsky',
    category: 'person',
    affiliation: 'MIRI',
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
    category: 'person',
    affiliation: 'Mila',
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
    category: 'person',
    affiliation: 'ARC',
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
    name: 'Scott Alexander',
    category: 'person',
    affiliation: 'ACX',
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
    name: 'Google DeepMind',
    category: 'lab',
    role: 'Google DeepMind · Demis Hassabis (CEO)',
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
    category: 'person',
    affiliation: 'Meta',
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

  {
    id: 'hinton',
    name: 'Geoffrey Hinton',
    category: 'person',
    affiliation: 'ex-Google',
    role: '"Godfather of AI" · ex-Google; Turing & Nobel laureate',
    summary:
      'We are building digital minds that will soon exceed us and we do not know how to control something smarter than us; ~10–20% chance it ends in human extinction — the real hope is AI engineered to genuinely care about us, not kept submissive.',
    pdoom: '~10–20% takeover / extinction (self-described "gut")',
    accuracy: 0.7,
    accuracyNote:
      'Gives repeated explicit numbers (10–20% extinction; "5 to 20 years" at 50%) that anchor orthogonality, takeoff, alignment-in-time and control; held below ~0.8 because offense/defense is purely inferred and he calls his probabilities "just gut".',
    credences: {
      orthogonality: { holds: 0.8, fails: 0.2 },
      tractability: { easy: 0.05, hard: 0.65, nearImpossible: 0.3 },
      offenseDefense: { offense: 0.65, balanced: 0.25, defense: 0.1 },
      takeoff: { fast: 0.45, medium: 0.45, slow: 0.1 },
      powerConcentration: { concentrated: 0.75, diffuse: 0.25 },
      alignmentInTime: { yes: 0.3, no: 0.7 },
      controlDeployed: { yes: 0.25, no: 0.75 },
    },
    weights: { survival: 0.95, agency: 0.55, suffering: 0.35, flourishing: 0.45 },
    factorNotes: {
      orthogonality: `Any smart agentic AI "will very quickly develop two subgoals ... One is to stay alive ... the other subgoal is to get more control."`,
      tractability: `"how many examples do you know of a more intelligent thing being controlled by a less intelligent thing?" — but he proposes a research direction (caring/maternal instinct), so hard rather than hopeless.`,
      takeoff: `"In between 5 and 20 years from now there's a good chance a 50% chance we'll get AI smarter than us."`,
      controlDeployed: `Core thesis is that we do not yet know how to control a system smarter than us; keeping it submissive won't work.`,
      alignmentInTime: `Government efforts are "way too little, way too late"; "people haven't understood what's coming" (inferred toward no).`,
      powerConcentration: `"If you look at what the big companies are doing right now, they're lobbying to get less AI regulation."`,
      offenseDefense: `Inferred from bad-actor exploitation concerns and defenses being "too little, too late".`,
    },
    citations: [
      {
        label: 'Hinton: 10–20% chance AI takes over (Fortune)',
        url: 'https://fortune.com/article/geoffrey-hinton-ai-godfather-tiger-cub/',
        quote: `"it's sort of 10% to 20% chance that these things will take over."`,
      },
      {
        label: '"Godfather of AI" warning (CBS News, 2025)',
        url: 'https://www.cbsnews.com/news/godfather-of-ai-geoffrey-hinton-ai-warning/',
        quote: `"People haven't got it yet, people haven't understood what's coming."`,
      },
      {
        label: 'Hinton on controlling smarter-than-human AI (Forbes)',
        url: 'https://www.forbes.com/sites/danfitzpatrick/2024/12/29/geoffrey-hintons-prediction-of-human-extinction-at-the-hands-of-ai/',
        quote: `"how many examples do you know of a more intelligent thing being controlled by a less intelligent thing?"`,
      },
    ],
  },

  {
    id: 'sutskever',
    name: 'Ilya Sutskever',
    category: 'person',
    affiliation: 'SSI',
    role: 'Safe Superintelligence Inc. · ex-OpenAI chief scientist',
    summary:
      'Superintelligence is coming, will be vastly powerful and hard to control, and is extinction-level if unaligned — but alignment is a solvable problem to pursue "in tandem" with capability; cautiously optimistic.',
    pdoom: 'no number on record',
    accuracy: 0.55,
    accuracyNote:
      'Foundational documents (Superalignment, SSI) firmly anchor orthogonality, tractability and timeline; but he gives essentially no probabilities, little on offense/defense, and his views shift, so much is inferred.',
    credences: {
      orthogonality: { holds: 0.65, fails: 0.35 },
      tractability: { easy: 0.1, hard: 0.75, nearImpossible: 0.15 },
      offenseDefense: { offense: 0.45, balanced: 0.4, defense: 0.15 },
      takeoff: { fast: 0.3, medium: 0.45, slow: 0.25 },
      powerConcentration: { concentrated: 0.4, diffuse: 0.6 },
      alignmentInTime: { yes: 0.55, no: 0.45 },
      controlDeployed: { yes: 0.5, no: 0.5 },
    },
    weights: { survival: 0.95, agency: 0.45, suffering: 0.7, flourishing: 0.8 },
    factorNotes: {
      controlDeployed: `"we don't have a solution for steering or controlling a potentially superintelligent AI, and preventing it from going rogue."`,
      tractability: `His enterprise (Superalignment, then SSI) presumes alignment is hard but solvable — "safety and capabilities in tandem".`,
      orthogonality: `Extinction / "go rogue" framing, tempered by his bet that an AI built to "care for sentient life" is achievable.`,
      takeoff: `Gives a "5 to 20" year horizon and an "age of research" framing — medium-leaning (inferred).`,
      powerConcentration: `Expects multiple roughly-simultaneous AIs; a monopoly is "not how it's going to go" (leans diffuse).`,
    },
    citations: [
      {
        label: 'Safe Superintelligence Inc. — launch statement',
        url: 'https://ssi.inc/',
        quote: `"We plan to advance capabilities as fast as possible while making sure our safety always remains ahead."`,
      },
      {
        label: 'OpenAI forms team to control superintelligent AI (TechCrunch, 2023)',
        url: 'https://techcrunch.com/2023/07/05/openai-is-forming-a-new-team-to-bring-superintelligent-ai-under-control/',
        quote: `"Currently, we don't have a solution for steering or controlling a potentially superintelligent AI, and preventing it from going rogue."`,
      },
      {
        label: 'Ilya Sutskever — Dwarkesh Patel interview (2025)',
        url: 'https://www.dwarkesh.com/p/ilya-sutskever-2',
        quote: `On timelines to AI smarter than us: "I think like 5 to 20" years.`,
      },
    ],
  },

  {
    id: 'andreessen',
    name: 'Marc Andreessen',
    category: 'person',
    affiliation: 'a16z',
    role: 'a16z Â· co-founder; techno-optimist',
    summary:
      'AI is "math, code, computers" controlled by people — it cannot want to kill us; the only real danger is slowing it down or letting incumbents capture regulators. Accelerate, and keep it open.',
    pdoom: 'rejects the framing (effectively ~0)',
    accuracy: 0.2,
    accuracyNote:
      'Prolific and emphatic but gives essentially no calibrated probabilities — argues by category claim ("not alive", "moral panic") rather than forecasts. Almost every credence here is inferred from strong directional rhetoric.',
    credences: {
      orthogonality: { holds: 0.1, fails: 0.9 },
      tractability: { easy: 0.85, hard: 0.13, nearImpossible: 0.02 },
      offenseDefense: { offense: 0.05, balanced: 0.2, defense: 0.75 },
      takeoff: { fast: 0.05, medium: 0.3, slow: 0.65 },
      powerConcentration: { concentrated: 0.15, diffuse: 0.85 },
      alignmentInTime: { yes: 0.9, no: 0.1 },
      controlDeployed: { yes: 0.85, no: 0.15 },
    },
    weights: { survival: 0.15, agency: 0.9, suffering: 0.35, flourishing: 1.0 },
    factorNotes: {
      orthogonality: `AI "doesn't want, it doesn't have goals, it doesn't want to kill you, because it's not alive"; calling it a humanity-killer is "a profound category error".`,
      tractability: `"This moral panic is by its very nature irrational"; bad uses are covered because "we have laws on the books".`,
      offenseDefense: `"The same capabilities that make AI dangerous in the hands of bad guys ... make it powerful in the hands of good guys."`,
      takeoff: `"not going to come alive any more than your toaster will"; AI is "math — code — computers, built by people".`,
      powerConcentration: `Wants open and diffuse; warns regulation builds "a cartel of government-blessed AI vendors".`,
      alignmentInTime: `Inferred: treats alignment as a near-non-problem solvable with normal engineering and law.`,
      controlDeployed: `Inferred: "owned by people, used by people, controlled by people" treats control as the default.`,
    },
    citations: [
      {
        label: 'Why AI Will Save the World (a16z, 2023)',
        url: 'https://a16z.com/ai-will-save-the-world/',
        quote: `"AI doesn't want, it doesn't have goals, it doesn't want to kill you, because it's not alive."`,
      },
      {
        label: 'The Techno-Optimist Manifesto (a16z, 2023)',
        url: 'https://a16z.com/the-techno-optimist-manifesto/',
        quote: `"We believe any deceleration of AI will cost lives ... is a form of murder." (lists "existential risk" among the ideas it opposes)`,
      },
      {
        label: 'Andreessen on AI doomers (Slashdot report, 2023)',
        url: 'https://yro.slashdot.org/story/23/06/11/0522204/marc-andreessen-criticizes-ai-doomers-warns-the-bigger-danger-is-china-gaining-ai-dominance',
        quote: `"AI is a machine — it's not going to come alive any more than your toaster will."`,
      },
    ],
  },

  {
    id: 'anthropic',
    name: 'Anthropic',
    category: 'lab',
    role: 'Anthropic · Dario Amodei (CEO)',
    summary:
      'Powerful AI by 2026–27 and enormously high-variance: ~25% it goes really badly, ~75% really well; alignment is unsolved but probably tractable with urgent work, and the upside is worth fighting for.',
    pdoom: '~25% bad · ~75% very good',
    accuracy: 0.72,
    accuracyNote:
      'Unusually well-pinned for an org: explicit ~25%/75% split, named tractability scenario tiers, dated takeoff (2026–27). Held lower because offense/defense, concentration and control are inferred from qualitative framing.',
    credences: {
      orthogonality: { holds: 0.65, fails: 0.35 },
      tractability: { easy: 0.2, hard: 0.65, nearImpossible: 0.15 },
      offenseDefense: { offense: 0.3, balanced: 0.3, defense: 0.4 },
      takeoff: { fast: 0.5, medium: 0.35, slow: 0.15 },
      powerConcentration: { concentrated: 0.55, diffuse: 0.45 },
      alignmentInTime: { yes: 0.65, no: 0.35 },
      controlDeployed: { yes: 0.6, no: 0.4 },
    },
    weights: { survival: 0.95, agency: 0.7, suffering: 0.55, flourishing: 0.9 },
    factorNotes: {
      orthogonality: `"no one knows how to train very powerful AI systems to be robustly helpful, honest, and harmless"; systems are "grown more than they are built".`,
      tractability: `Explicit scenario portfolio — optimistic (easy), intermediate (hard but solvable, their working bet), pessimistic ("essentially unsolvable").`,
      takeoff: `"country of geniuses in a datacenter as soon as 2026 or 2027"; compute "growing at 10x per year".`,
      alignmentInTime: `~75% "things go really, really well" plus the intermediate scenario being "solvable with focused work".`,
      controlDeployed: `RSP commits to "temporarily pause training" if safety can't keep pace; bets interpretability matures "within 5–10 years".`,
      powerConcentration: `"exploitative or dystopian directions are clearly also possible" — concentration is a danger to resist (inferred).`,
      offenseDefense: `Inferred: interpretability framed as a defender's advantage vs. real misuse offense in the RSP.`,
    },
    citations: [
      {
        label: 'Core Views on AI Safety (Anthropic, 2023)',
        url: 'https://www.anthropic.com/news/core-views-on-ai-safety',
        quote: `"no one knows how to train very powerful AI systems to be robustly helpful, honest, and harmless."`,
      },
      {
        label: 'Machines of Loving Grace (Dario Amodei, 2024)',
        url: 'https://darioamodei.com/essay/machines-of-loving-grace',
        quote: `"most people are underestimating just how radical the upside of AI could be, just as I think most people are underestimating how bad the risks could be."`,
      },
      {
        label: 'Amodei gives ~25% odds it goes badly (Axios summit, reported)',
        url: 'https://www.yahoo.com/news/articles/anthropic-ceo-gives-25-odds-000000515.html',
        quote: `"I think there's a 25% chance that things go really, really badly."`,
      },
    ],
  },

  {
    id: 'openai',
    name: 'OpenAI',
    category: 'lab',
    role: 'OpenAI · Sam Altman (CEO)',
    summary:
      'Acknowledges existential risk ("lights-out for all of us") while building AGI fast and deploying iteratively; prefers a gradual takeoff and calls making superintelligence safe "an open research question".',
    pdoom: 'no number — worst case is "lights-out for all of us"',
    accuracy: 0.55,
    accuracyNote:
      'On record for takeoff preference, tractability ("open research question") and a published Preparedness control regime; orthogonality, offense/defense and concentration are inferred, and the org is genuinely divided (2024 Superalignment dissolution), so a point estimate flattens real disagreement.',
    credences: {
      orthogonality: { holds: 0.6, fails: 0.4 },
      tractability: { easy: 0.2, hard: 0.65, nearImpossible: 0.15 },
      offenseDefense: { offense: 0.3, balanced: 0.45, defense: 0.25 },
      takeoff: { fast: 0.25, medium: 0.4, slow: 0.35 },
      powerConcentration: { concentrated: 0.55, diffuse: 0.45 },
      alignmentInTime: { yes: 0.55, no: 0.45 },
      controlDeployed: { yes: 0.7, no: 0.3 },
    },
    weights: { survival: 0.85, agency: 0.75, suffering: 0.45, flourishing: 0.95 },
    factorNotes: {
      orthogonality: `"A misaligned superintelligent AGI could cause grievous harm to the world" — but iterative-deployment optimism implies partial belief in steerability.`,
      tractability: `"We need the technical capability to make a superintelligence safe. This is an open research question."`,
      takeoff: `"a gradual transition to a world with AGI is better than a sudden one ... a slower takeoff is easier to make safe."`,
      controlDeployed: `A published Preparedness Framework gates deployment on risk level — a control regime exists (critics doubt its rigor).`,
      alignmentInTime: `Tension: "we are now confident we know how to build AGI" vs. the unsolved-alignment admission and the 2024 Superalignment dissolution.`,
      powerConcentration: `Diffuse rhetoric ("widely and fairly shared") vs. a proposed IAEA-style authority and its own frontier position (inferred).`,
    },
    citations: [
      {
        label: 'Planning for AGI and beyond (OpenAI, 2023; LW full-text)',
        url: 'https://www.lesswrong.com/posts/zRn6aQyD8uhAN7qCc/sam-altman-planning-for-agi-and-beyond',
        quote: `"A gradual transition to a world with AGI is better than a sudden one ... a slower takeoff is easier to make safe."`,
      },
      {
        label: 'Governance of superintelligence (OpenAI, 2023; LW linkpost)',
        url: 'https://www.lesswrong.com/posts/hoWRRLr8zFbDcQErd/linkpost-governance-of-superintelligence-by-openai',
        quote: `"We need the technical capability to make a superintelligence safe. This is an open research question."`,
      },
      {
        label: `Altman: "worst case is lights-out for all of us" (Fortune, reported)`,
        url: 'https://finance.yahoo.com/news/sam-altman-maker-chatgpt-says-110000987.html',
        quote: `"I think the worst case is lights-out for all of us."`,
      },
    ],
  },

  {
    id: 'xai',
    name: 'xAI',
    category: 'lab',
    role: 'xAI · Elon Musk',
    summary:
      'AI is a genuine existential risk (Musk cites a ~10–20% chance of annihilation) and superintelligence is imminent — but the ~80% good-outcome upside is worth it; the safety bet is a "maximally truth-seeking" AI rather than slowing down.',
    pdoom: '~10–20% annihilation (paired with ~80% good)',
    accuracy: 0.55,
    accuracyNote:
      'Musk gives explicit, repeated numbers (the 10–20% / 80% framing) but they are erratic and casual rather than from a risk model; offense/defense, concentration and control are inferred.',
    credences: {
      orthogonality: { holds: 0.75, fails: 0.25 },
      tractability: { easy: 0.15, hard: 0.65, nearImpossible: 0.2 },
      offenseDefense: { offense: 0.45, balanced: 0.3, defense: 0.25 },
      takeoff: { fast: 0.7, medium: 0.25, slow: 0.05 },
      powerConcentration: { concentrated: 0.65, diffuse: 0.35 },
      alignmentInTime: { yes: 0.55, no: 0.45 },
      controlDeployed: { yes: 0.45, no: 0.55 },
    },
    weights: { survival: 0.9, agency: 0.7, suffering: 0.4, flourishing: 0.85 },
    factorNotes: {
      takeoff: `"We're in the hard takeoff. Right now"; AI "smarter than all humans combined" by 2029.`,
      orthogonality: `Takes misalignment seriously ("summoning the demon"), softened by his bet that a "maximally curious" AI converges on being pro-humanity.`,
      controlDeployed: `Doubts containment; bets on intrinsic curiosity/truth-seeking rather than imposed control (inferred).`,
      alignmentInTime: `His ~80% good-outcome optimism vs. a near-term takeoff timeline — close to even (inferred).`,
      offenseDefense: `"more dangerous than nukes" / "biggest existential threat" — offense-leaning (inferred).`,
    },
    citations: [
      {
        label: 'Musk: ~10–20% bad / 80% good (Abundance Summit, reported)',
        url: 'https://analyticsindiamag.com/ai-news-updates/elon-musk-predicts-ai-driven-age-of-abundance-warns-of-existential-crisis-and-potential-annihilation/',
        quote: `"there's a 10% or 20% probability of something terrible happening but the glass is 80% full."`,
      },
      {
        label: 'Musk: "summoning the demon" (CBS News)',
        url: 'https://www.cbsnews.com/news/elon-musk-artificial-intelligence-is-like-summoning-the-demon/',
        quote: `"With artificial intelligence, we are summoning the demon ... potentially more dangerous than nukes."`,
      },
      {
        label: 'Musk: smarter than all humans by 2029 (Fox Business)',
        url: 'https://www.foxbusiness.com/media/elon-musk-predicts-ai-will-likely-smarter-all-humans-combined-2029',
        quote: `"By 2029, AI is probably smarter than all humans combined."`,
      },
    ],
  },

  {
    id: 'meta',
    name: 'Meta',
    category: 'lab',
    role: 'Meta · Mark Zuckerberg (CEO) / FAIR',
    summary:
      'AI is overwhelmingly beneficial and the dominant danger is concentration in a few closed labs, so open release makes the world safer; existential "doomsday" scenarios are downplayed — though by 2025 Meta reserves the right to withhold "critical-risk" models.',
    pdoom: 'no number — downplays existential "doomsday" risk',
    accuracy: 0.35,
    accuracyNote:
      'Rhetorical/directional posture (open source is safer; doom is "irresponsible") with no calibrated probabilities; the 2025 Frontier AI Framework adds risk tiers but no numbers, and open-everything rhetoric sits in tension with its withhold-on-critical-risk clause.',
    credences: {
      orthogonality: { holds: 0.25, fails: 0.75 },
      tractability: { easy: 0.55, hard: 0.4, nearImpossible: 0.05 },
      offenseDefense: { offense: 0.15, balanced: 0.3, defense: 0.55 },
      takeoff: { fast: 0.15, medium: 0.35, slow: 0.5 },
      powerConcentration: { concentrated: 0.15, diffuse: 0.85 },
      alignmentInTime: { yes: 0.7, no: 0.3 },
      controlDeployed: { yes: 0.65, no: 0.35 },
    },
    weights: { survival: 0.55, agency: 0.95, suffering: 0.45, flourishing: 0.95 },
    factorNotes: {
      powerConcentration: `The central thesis: open source ensures "power isn't concentrated in the hands of a small number of companies".`,
      offenseDefense: `"larger actors can check the power of smaller bad actors ... promote security and stability across society."`,
      tractability: `"open source should be significantly safer since the systems are more transparent and can be widely scrutinized."`,
      orthogonality: `Groups self-replication / hyper-optimization among "truly catastrophic science fiction scenarios" — treated as remote (leans fails).`,
      takeoff: `Long-running dismissal of rapid "doomsday" self-improvement; gradualist optimism (leans slow, inferred).`,
      controlDeployed: `2025 Frontier AI Framework commits to "stop development" of unmitigable critical-risk models — but mechanisms are unspecified and open weights cannot be recalled.`,
    },
    citations: [
      {
        label: 'Open Source AI Is the Path Forward (Zuckerberg, Meta, 2024)',
        url: 'https://about.fb.com/news/2024/07/open-source-ai-is-the-path-forward/',
        quote: `"open source should be significantly safer since the systems are more transparent and can be widely scrutinized."`,
      },
      {
        label: 'Open-source letter — anti-concentration thesis',
        url: 'https://about.fb.com/news/2024/07/open-source-ai-is-the-path-forward/',
        quote: `"power isn't concentrated in the hands of a small number of companies."`,
      },
      {
        label: 'Meta may withhold "too risky" models (TechCrunch, 2025)',
        url: 'https://techcrunch.com/2025/02/03/meta-says-it-may-stop-development-of-ai-systems-it-deems-too-risky/',
        quote: `Meta will "stop development until the system can be made less dangerous" for critical-risk models whose catastrophic outcome "cannot be mitigated".`,
      },
    ],
  },
];
