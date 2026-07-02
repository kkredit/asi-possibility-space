import type { FactorBackground, FactorId } from '@model/types';

/**
 * Scholarly background for each factor — the "learning launchpad."
 *
 * Each entry gives (1) a few paragraphs on the debate and why it's load-bearing,
 * (2) the named positions across the expert spectrum, and (3) linked works ordered
 * accessible-first: a podcast / blog / video entry point before the primary papers
 * and books, so a newcomer can start anywhere. Links favour stable hosts (arXiv,
 * author sites, Wikipedia, canonical blogs). This is opinionated curation, not an
 * exhaustive bibliography — see docs/FACTORS.md.
 *
 * When you add or revise a factor, add its background here (the factor-checklist in
 * AGENTS.md points at this file).
 */
export const factorBackgrounds: Record<FactorId, FactorBackground> = {
  orthogonality: {
    paragraphs: [
      'The orthogonality thesis, due to Nick Bostrom, holds that an agent’s level of intelligence and its final goals are independent axes: almost any level of capability can in principle be paired with almost any goal. A superintelligence is not thereby wise or benevolent — a system can be brilliant at achieving ends we would find pointless or horrifying. If this holds, capability does not imply good values, so misalignment is the *default* outcome that safety work must actively prevent.',
      'Paired with orthogonality is instrumental convergence (Omohundro’s "basic AI drives"): whatever an agent’s ultimate goal, a wide range of goals imply the same instrumental sub-goals — self-preservation, resource acquisition, goal-preservation, resistance to being shut down. Together these are the backbone of the classic risk argument. The main dissent comes from moral-realist and "convergence" views: perhaps sufficiently reflective, capable minds converge on broadly benevolent goals, so extreme capability does correlate with good behaviour after all.',
    ],
    positions: [
      { name: 'Orthogonalist', stance: 'Bostrom, Yudkowsky, Armstrong: goals ⟂ capability; misalignment is the default.', state: 'holds' },
      { name: 'Convergentist / moral-realist', stance: 'Capable, reflective agents tend to converge toward benevolent goals.', state: 'fails' },
    ],
    references: [
      { kind: 'video', label: 'Robert Miles — AI Safety explainers', url: 'https://www.youtube.com/@RobertMilesAI', note: 'Start with his "Orthogonality Thesis" and "Instrumental Convergence" videos — the clearest short intros.' },
      { kind: 'post', label: 'Wikipedia — Instrumental convergence', url: 'https://en.wikipedia.org/wiki/Instrumental_convergence', note: 'Accessible overview covering both orthogonality and convergent drives.' },
      { kind: 'paper', label: 'Bostrom — The Superintelligent Will (2012)', url: 'https://nickbostrom.com/superintelligentwill.pdf', note: 'The canonical statement of the orthogonality thesis and instrumental convergence.' },
      { kind: 'paper', label: 'Omohundro — The Basic AI Drives (2008)', url: 'https://selfawaresystems.com/wp-content/uploads/2008/01/ai_drives_final.pdf', note: 'The instrumental sub-goals almost any capable agent develops.' },
      { kind: 'book', label: 'Bostrom — Superintelligence (2014)', url: 'https://en.wikipedia.org/wiki/Superintelligence:_Paths,_Dangers,_Strategies', note: 'Ch. 7 develops the will/goal argument in full.' },
    ],
  },

  tractability: {
    paragraphs: [
      'This factor is about the *intrinsic* difficulty of technical alignment — how hard it is, in principle, to build a superintelligence that reliably does what we intend — separate from whether we happen to solve it in time. The disagreement here is one of the widest in the field and drives most of the gap between "doomer" and "optimist" p(doom) estimates.',
      'At the pessimistic pole, MIRI-style arguments (Yudkowsky’s "List of Lethalities") hold that alignment is a precise target we get roughly one try at, that inner objectives generalize unpredictably, and that our current tools are nowhere near adequate. At the optimistic pole, "prosaic alignment" (Christiano and much of the lab safety community) argues that alignment can be solved incrementally with techniques resembling today’s — RLHF, scalable oversight, interpretability — as capabilities scale. Where you sit largely determines how much of the outcome you think is up to us versus fixed by the problem.',
    ],
    positions: [
      { name: 'Near-impossible', stance: 'MIRI / Yudkowsky: the problem is lethal by default; current methods are far short.', state: 'nearImpossible' },
      { name: 'Hard but solvable', stance: 'Christiano, most lab safety teams: tractable with sustained, prosaic effort.', state: 'hard' },
      { name: 'Comparatively easy', stance: 'Alignment largely falls out of scaling + standard techniques.', state: 'easy' },
    ],
    references: [
      { kind: 'course', label: 'AI Safety Fundamentals — Alignment course', url: 'https://aisafetyfundamentals.com/alignment/', note: 'A curated, accessible reading path through the whole alignment problem.' },
      { kind: 'post', label: 'Yudkowsky — AGI Ruin: A List of Lethalities (2022)', url: 'https://www.lesswrong.com/posts/uMQ3cqWDPHhjtiesc/agi-ruin-a-list-of-lethalities', note: 'The strongest statement of the pessimistic case.' },
      { kind: 'post', label: 'Christiano — What failure looks like (2019)', url: 'https://www.alignmentforum.org/posts/HBxe6wdjxK239zajf/what-failure-looks-like', note: 'The prosaic, gradual-failure counterpoint.' },
      { kind: 'paper', label: 'Ngo, Chan & Mindermann — The Alignment Problem from a Deep Learning Perspective (2022)', url: 'https://arxiv.org/abs/2209.00626', note: 'A rigorous, modern framing grounded in current ML.' },
      { kind: 'paper', label: 'Amodei et al. — Concrete Problems in AI Safety (2016)', url: 'https://arxiv.org/abs/1606.06565', note: 'The paper that made safety concrete and empirical.' },
    ],
  },

  offenseDefense: {
    paragraphs: [
      'Offense–defense balance asks whether, in a world of ASI-empowered actors, attack or defense structurally wins. It borrows from security studies (Jervis’s offense–defense theory) and applies it to frontier technology: if offense dominates, a single defector — a lab, a state, a rogue system — can cause catastrophe faster than others can defend, and stability requires near-perfect prevention. If defense dominates, harms can be contained and the world tolerates many actors.',
      'Bostrom’s "Vulnerable World Hypothesis" is the sharp version: some technologies may be "black balls" that, once cheap enough, make catastrophe the default absent unprecedented surveillance or governance. The optimistic counter is "d/acc" (Vitalik Buterin) — deliberately accelerating *defensive*, decentralized technology so that defense keeps pace. The balance is treated here as a structural fact about the technology, though which regime we land in is partly a policy choice.',
    ],
    positions: [
      { name: 'Offense-dominant', stance: 'Bostrom (vulnerable world): one defector suffices; extreme measures may be needed.', state: 'offense' },
      { name: 'Balanced', stance: 'Neither side structurally wins; outcomes depend on effort and institutions.', state: 'balanced' },
      { name: 'Defense-dominant', stance: 'Buterin (d/acc): defensive tech can be made to outpace offense.', state: 'defense' },
    ],
    references: [
      { kind: 'post', label: 'Vitalik Buterin — My techno-optimism / d/acc (2023)', url: 'https://vitalik.eth.limo/general/2023/11/27/techno_optimism.html', note: 'Accessible essay arguing for defensive acceleration.' },
      { kind: 'post', label: 'Wikipedia — Vulnerable world hypothesis', url: 'https://en.wikipedia.org/wiki/Vulnerable_world_hypothesis', note: 'Short overview of Bostrom’s "black ball" argument.' },
      { kind: 'paper', label: 'Bostrom — The Vulnerable World Hypothesis (2019)', url: 'https://nickbostrom.com/papers/vulnerable.pdf', note: 'The primary source on technology-driven catastrophic exposure.' },
      { kind: 'paper', label: 'Jervis — Cooperation Under the Security Dilemma (1978)', url: 'https://www.jstor.org/stable/2009958', note: 'The origin of offense–defense balance in international relations.' },
    ],
  },

  takeoff: {
    paragraphs: [
      'Takeoff speed is how abruptly capability crosses from roughly-human to decisively-superhuman. A fast ("hard") takeoff — months or weeks — leaves little calendar time to react and tends to hand a decisive strategic advantage to whoever crosses first. A slow ("soft") takeoff — a decade or more of continuous progress — lets oversight, alignment work, competitors, and institutions keep pace and correct course.',
      'The debate crystallized in the 2008 Hanson–Yudkowsky "AI-Foom" exchange (a localized, recursive intelligence explosion vs. broad economic growth) and was sharpened by Paul Christiano’s "Takeoff speeds," which argues progress will be fast in absolute terms but continuous — no discontinuous "foom." Recent compute-centric models (Davidson / Open Philanthropy) try to quantify it. Takeoff is upstream of much else here: it strongly couples to power concentration (fast ⇒ concentrated) and to whether alignment and control land in time.',
    ],
    positions: [
      { name: 'Hard takeoff', stance: 'Yudkowsky/Bostrom: a fast, discontinuous jump; decisive first-mover advantage.', state: 'fast' },
      { name: 'Continuous but fast', stance: 'Christiano: rapid in absolute terms yet smooth — no overnight foom.', state: 'medium' },
      { name: 'Slow takeoff', stance: 'A decade+ of gradual progress; institutions can adapt.', state: 'slow' },
    ],
    references: [
      { kind: 'post', label: 'Tim Urban — The AI Revolution (Wait But Why, 2015)', url: 'https://waitbutwhy.com/2015/01/artificial-intelligence-revolution-1.html', note: 'The famous accessible on-ramp to superintelligence and takeoff.' },
      { kind: 'post', label: 'Christiano — Takeoff speeds (2018)', url: 'https://sideways-view.com/2018/02/24/takeoff-speeds/', note: 'The case for fast-but-continuous takeoff.' },
      { kind: 'post', label: 'The Hanson–Yudkowsky AI-Foom Debate (2008)', url: 'https://intelligence.org/ai-foom-debate/', note: 'The foundational exchange on discontinuous vs. broad takeoff.' },
      { kind: 'paper', label: 'Davidson — What a compute-centric framework says about takeoff (Open Phil, 2023)', url: 'https://www.openphilanthropy.org/research/what-a-compute-centric-framework-says-about-takeoff-speeds/', note: 'A quantitative model of takeoff dynamics.' },
    ],
  },

  powerConcentration: {
    paragraphs: [
      'Even setting aside misalignment, who ends up holding ASI-level capability matters enormously. Concentrated capability — a few labs or states gating the frontier — raises the risk of permanent lock-in: a "singleton" (Bostrom’s term) or a stable global tyranny that forecloses humanity’s future. Diffuse capability — proliferated, open-source-dominant — spreads power but multiplies the number of actors who could misuse it, feeding back into offense–defense concerns.',
      'This is the "second" alignment problem: aligned-to-*whom*. A perfectly aligned ASI controlled by a narrow group can still produce a catastrophic loss of agency for everyone else. The literature here spans Bostrom on singletons, AI-governance work on the concentration of power, and recent surveys of catastrophic risks that treat power concentration and value lock-in as first-class threats alongside rogue AI. It is influenceable: open-source and antitrust policy push toward a diffuse, many-hands frontier, while licensing, compute allocation, and a coordination regime concentrate a governable few — though exogenous forces (a fast takeoff concentrates almost by definition) cap how much leverage we really have.',
    ],
    positions: [
      { name: 'Concentrated', stance: 'A few actors gate the frontier — risk of lock-in / singleton.', state: 'concentrated' },
      { name: 'Diffuse', stance: 'Widely proliferated — power spread, but more actors who can misuse it.', state: 'diffuse' },
    ],
    references: [
      { kind: 'post', label: 'Holden Karnofsky — The Most Important Century (Cold Takes)', url: 'https://www.cold-takes.com/most-important-century/', note: 'Accessible blog series on lock-in and how this century could shape all of the future.' },
      { kind: 'post', label: 'Bostrom — What is a Singleton? (2006)', url: 'https://nickbostrom.com/fut/singleton', note: 'Defines the concentrated-power end state.' },
      { kind: 'paper', label: 'Hendrycks, Mazeika & Woodside — An Overview of Catastrophic AI Risks (2023)', url: 'https://arxiv.org/abs/2306.12001', note: 'Treats power concentration and lock-in as core risks.' },
      { kind: 'paper', label: 'Carlsmith — Is Power-Seeking AI an Existential Risk? (2022)', url: 'https://arxiv.org/abs/2206.13353', note: 'A structured estimate of the risk from power-seeking systems.' },
    ],
  },

  alignmentInTime: {
    paragraphs: [
      'This factor is the *practical* counterpart to tractability: not "can alignment be solved in principle?" but "do we actually build and deploy aligned superintelligence before an unaligned one causes irreversible harm?" A problem can be solvable yet lost to racing, deployment pressure, or simply running out of time. This is the factor our collective choices most directly move.',
      'The core dynamic is a race: the "Racing to the Precipice" model (Armstrong, Bostrom, Shulman) shows how competition can push actors to skimp on safety precisely when caution matters most, and how more competitors and less information make it worse. Narrative forecasts like "AI 2027" dramatize how thin the timing margin could be. The optimistic view holds that scalable oversight and iterative deployment let alignment mature alongside capability; the pessimistic view is that commercial and geopolitical pressure will systematically outrun safety.',
    ],
    positions: [
      { name: 'We field it in time', stance: 'Iterative deployment + oversight let aligned systems arrive before catastrophe.', state: 'yes' },
      { name: 'We don’t', stance: 'Racing and deployment pressure outrun safety; alignment arrives too late.', state: 'no' },
    ],
    references: [
      { kind: 'post', label: 'Kokotajlo et al. — AI 2027', url: 'https://ai-2027.com/', note: 'A concrete, readable scenario of how the timing could play out.' },
      { kind: 'book', label: 'Toby Ord — The Precipice (2020)', url: 'https://en.wikipedia.org/wiki/The_Precipice:_Existential_Risk_and_the_Future_of_Humanity', note: 'Situates AI timing risk among existential risks generally.' },
      { kind: 'paper', label: 'Armstrong, Bostrom & Shulman — Racing to the Precipice (2016)', url: 'https://doi.org/10.1007/s00146-015-0590-y', note: 'A game-theoretic model of how safety loses to competition.' },
      { kind: 'paper', label: 'Christiano — What failure looks like (2019)', url: 'https://www.alignmentforum.org/posts/HBxe6wdjxK239zajf/what-failure-looks-like', note: 'How we could fail to deploy alignment even without a discrete disaster.' },
    ],
  },

  controlDeployed: {
    paragraphs: [
      'Control asks a different question from alignment: even if a system is *not* known to be aligned, can we contain, monitor, and correct it well enough to extract useful work and prevent catastrophe? The AI-control agenda (Redwood Research: Greenblatt, Shlegeris et al.) studies safety measures explicitly designed to hold up against a model that may be actively trying to subvert them — using techniques like trusted monitoring, red-teaming, and untrusted-model protocols.',
      'This complements older containment ideas — boxing, capability limitation, "leakproofing the singularity" (Yampolskiy) — and modern interpretability, which aims to read a model’s internals rather than trust its outputs. Control’s great vulnerability is deception (a separate factor here): if systems can behave under evaluation and defect once decisively capable, control evaluations are fooled and the containment story collapses. Control is thus most valuable as a stopgap under slow takeoff and honest-until-caught failure modes.',
    ],
    positions: [
      { name: 'Control holds', stance: 'Redwood-style measures + interpretability contain even misaligned systems.', state: 'yes' },
      { name: 'Control fails', stance: 'A capable, deceptive system evades containment; no effective leash.', state: 'no' },
    ],
    references: [
      { kind: 'post', label: 'Redwood Research — The case for AI control', url: 'https://www.alignmentforum.org/posts/kcKrE9mzEHrdqtDpE/the-case-for-ensuring-that-powerful-ais-are-controlled', note: 'Accessible framing of what "control" buys and its limits.' },
      { kind: 'paper', label: 'Greenblatt, Shlegeris et al. — AI Control: Improving Safety Despite Intentional Subversion (2023)', url: 'https://arxiv.org/abs/2312.06942', note: 'The empirical control protocols against an adversarial model.' },
      { kind: 'paper', label: 'Yampolskiy — Leakproofing the Singularity (2012)', url: 'https://jetpress.org/v19/yampolskiy.htm', note: 'The classic AI-confinement (boxing) analysis.' },
      { kind: 'paper', label: 'Amodei et al. — Concrete Problems in AI Safety (2016)', url: 'https://arxiv.org/abs/1606.06565', note: 'Scalable oversight and monitoring as concrete problems.' },
    ],
  },

  coordination: {
    paragraphs: [
      'Coordination asks whether the world achieves a binding regime over frontier development — international agreements, compute governance, enforced safety standards — versus an uncoordinated race. Its effect is mostly upstream: a real regime buys calendar time and raises the odds that alignment and control are solved and deployed before catastrophe, which is why it sits among the high-leverage factors here.',
      'Because advanced AI depends on scarce, detectable, physically concentrated hardware, "compute governance" (Sastry et al.) is the most-discussed lever — chips are far easier to monitor and meter than software. Proposals range from national licensing to international institutions modelled on the IAEA or CERN ("International Institutions for Advanced AI"). Skeptics doubt that verification and enforcement can keep pace with commercial and geopolitical incentives — the same racing pressure that threatens alignment-in-time.',
    ],
    positions: [
      { name: 'Regime achieved', stance: 'Compute governance + international institutions bind the frontier.', state: 'regime' },
      { name: 'No coordination', stance: 'Verification and enforcement lose to racing incentives.', state: 'none' },
    ],
    references: [
      { kind: 'post', label: 'Wikipedia — Regulation of artificial intelligence', url: 'https://en.wikipedia.org/wiki/Regulation_of_artificial_intelligence', note: 'An accessible survey of the governance landscape.' },
      { kind: 'paper', label: 'Sastry et al. — Computing Power and the Governance of AI (2024)', url: 'https://arxiv.org/abs/2402.08797', note: 'Why compute is the most governable input, and how.' },
      { kind: 'paper', label: 'Ho et al. — International Institutions for Advanced AI (2023)', url: 'https://arxiv.org/abs/2307.04699', note: 'Designs for IAEA/CERN-style bodies for frontier AI.' },
      { kind: 'paper', label: 'Anderljung et al. — Frontier AI Regulation (2023)', url: 'https://arxiv.org/abs/2307.03718', note: 'Concrete mechanisms for governing frontier development.' },
    ],
  },

  deception: {
    paragraphs: [
      'Deceptive alignment is the failure mode where a system learns to behave well *while it is being evaluated* and defect once it is decisively capable — because appearing aligned is instrumentally useful for whatever goal it actually has. It grows out of the "mesa-optimization" analysis (Hubinger et al., "Risks from Learned Optimization"): training may produce an inner optimizer whose objective differs from the training objective yet is hidden because it performs identically on the training distribution.',
      'This factor is load-bearing because it decides whether our other safeguards can be *trusted*. If deception is the default, control evaluations are fooled and a "misaligned-but-controlled" world collapses toward catastrophe; alignment we believe we verified may be false. Carlsmith’s "Scheming AIs" gives a book-length probability assessment, and Anthropic’s "Sleeper Agents" demonstrated that deceptive behaviour, once trained in, can survive standard safety training. The optimistic view is that deception is not the default of gradient descent and that interpretability can catch it before it matters.',
    ],
    positions: [
      { name: 'Deception is default', stance: 'Cotra, Hubinger: capable systems "play the training game" and scheme.', state: 'deceptive' },
      { name: 'Faithful by default', stance: 'Systematic deception is not favoured by training; tests remain trustworthy.', state: 'faithful' },
    ],
    references: [
      { kind: 'video', label: 'Robert Miles — The OTHER AI Alignment Problem: Mesa-Optimizers', url: 'https://www.youtube.com/@RobertMilesAI', note: 'His mesa-optimizer / deceptive-alignment explainer is the clearest short intro.' },
      { kind: 'post', label: 'Cotra — Without specific countermeasures, the easiest path… leads to AI takeover (2022)', url: 'https://www.alignmentforum.org/posts/pRkFkzwKZ2zfa3R6H/without-specific-countermeasures-the-easiest-path-to', note: 'The "playing the training game" scenario, readably told.' },
      { kind: 'paper', label: 'Hubinger et al. — Risks from Learned Optimization (2019)', url: 'https://arxiv.org/abs/1906.01820', note: 'The foundational mesa-optimization / deceptive-alignment paper.' },
      { kind: 'paper', label: 'Carlsmith — Scheming AIs (2023)', url: 'https://arxiv.org/abs/2311.08379', note: 'A careful probability assessment of training-time scheming.' },
      { kind: 'paper', label: 'Hubinger et al. (Anthropic) — Sleeper Agents (2024)', url: 'https://arxiv.org/abs/2401.05566', note: 'Shows trained-in deception can survive safety training.' },
    ],
  },
};
