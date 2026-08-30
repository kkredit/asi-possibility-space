import type { FactorBackground } from '@model/types';
import type { KnownFactorId, KnownSubfactorId } from '@model/ids';

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
// Record over KnownFactorId: a factor added in ids.ts is a compile error here
// until its background is authored (and a stray key can't survive a rename).
export const factorBackgrounds: Record<KnownFactorId, FactorBackground> = {
  orthogonality: {
    paragraphs: [
      'The orthogonality thesis, due to Nick Bostrom, holds that an agent’s level of intelligence and its final goals are independent axes: almost any level of capability can in principle be paired with almost any goal. A superintelligence is not thereby wise or benevolent: a system can be brilliant at achieving ends we would find pointless or horrifying. If this holds, capability does not imply good values, so misalignment is the *default* outcome that safety work must actively prevent.',
      'Paired with orthogonality is instrumental convergence (Omohundro’s "basic AI drives"): whatever an agent’s ultimate goal, a wide range of goals imply the same instrumental sub-goals: self-preservation, resource acquisition, goal-preservation, resistance to being shut down. Together these are the backbone of the classic risk argument. The main dissent comes from moral-realist and "convergence" views: perhaps sufficiently reflective, capable minds converge on broadly benevolent goals, so extreme capability does correlate with good behaviour after all.',
    ],
    positions: [
      { name: 'Orthogonalist', stance: 'Bostrom, Yudkowsky, Armstrong: goals ⟂ capability; misalignment is the default.', state: 'holds' },
      { name: 'Convergentist / moral-realist', stance: 'Capable, reflective agents tend to converge toward benevolent goals.', state: 'fails' },
    ],
    references: [
      { kind: 'video', label: 'Robert Miles — AI Safety explainers', url: 'https://www.youtube.com/@RobertMilesAI', note: 'Start with his "Orthogonality Thesis" and "Instrumental Convergence" videos, the clearest short intros.' },
      { kind: 'post', label: 'Wikipedia — Instrumental convergence', url: 'https://en.wikipedia.org/wiki/Instrumental_convergence', note: 'Accessible overview covering both orthogonality and convergent drives.' },
      { kind: 'paper', label: 'Bostrom — The Superintelligent Will (2012)', url: 'https://nickbostrom.com/superintelligentwill.pdf', note: 'The canonical statement of the orthogonality thesis and instrumental convergence.' },
      { kind: 'paper', label: 'Omohundro — The Basic AI Drives (2008)', url: 'https://selfawaresystems.com/wp-content/uploads/2008/01/ai_drives_final.pdf', note: 'The instrumental sub-goals almost any capable agent develops.' },
      { kind: 'book', label: 'Bostrom — Superintelligence (2014)', url: 'https://en.wikipedia.org/wiki/Superintelligence:_Paths,_Dangers,_Strategies', note: 'Ch. 7 develops the will/goal argument in full.' },
    ],
  },

  tractability: {
    paragraphs: [
      'This factor is about the *intrinsic* difficulty of technical alignment (how hard it is, in principle, to build a superintelligence that reliably does what we intend), separate from whether we happen to solve it in time. The disagreement here is one of the widest in the field and drives most of the gap between "doomer" and "optimist" p(doom) estimates.',
      'At the pessimistic pole, MIRI-style arguments (Yudkowsky’s "List of Lethalities") hold that alignment is a precise target we get roughly one try at, that inner objectives generalize unpredictably, and that our current tools are nowhere near adequate. At the optimistic pole, "prosaic alignment" (Christiano and much of the lab safety community) argues that alignment can be solved incrementally with techniques resembling today’s (RLHF, scalable oversight, interpretability) as capabilities scale. Where you sit largely determines how much of the outcome you think is up to us versus fixed by the problem.',
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
      'Offense–defense balance asks whether, in a world of ASI-empowered actors, attack or defense structurally wins. It borrows from security studies (Jervis’s offense–defense theory) and applies it to frontier technology: if offense dominates, a single defector (a lab, a state, a rogue system) can cause catastrophe faster than others can defend, and stability requires near-perfect prevention. If defense dominates, harms can be contained and the world tolerates many actors.',
      'Bostrom’s "Vulnerable World Hypothesis" is the sharp version: some technologies may be "black balls" that, once cheap enough, make catastrophe the default absent unprecedented surveillance or governance. The optimistic counter is "d/acc" (Vitalik Buterin): deliberately accelerating *defensive*, decentralized technology so that defense keeps pace. The balance is treated here as a structural fact about the technology, though which regime we land in is partly a policy choice.',
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
      'Takeoff speed is how abruptly capability crosses from roughly-human to decisively-superhuman. A fast ("hard") takeoff (months or weeks) leaves little calendar time to react and tends to hand a decisive strategic advantage to whoever crosses first. A slow ("soft") takeoff (a decade or more of continuous progress) lets oversight, alignment work, competitors, and institutions keep pace and correct course.',
      'The debate crystallized in the 2008 Hanson–Yudkowsky "AI-Foom" exchange (a localized, recursive intelligence explosion vs. broad economic growth) and was sharpened by Paul Christiano’s "Takeoff speeds," which argues progress will be fast in absolute terms but continuous, with no discontinuous "foom." Recent compute-centric models (Davidson / Open Philanthropy) try to quantify it. Takeoff is upstream of much else here: it strongly couples to power concentration (fast ⇒ concentrated) and to whether alignment and control land in time.',
    ],
    positions: [
      { name: 'Hard takeoff', stance: 'Yudkowsky/Bostrom: a fast, discontinuous jump; decisive first-mover advantage.', state: 'fast' },
      { name: 'Continuous but fast', stance: 'Christiano: rapid in absolute terms yet smooth; no overnight foom.', state: 'medium' },
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
      'Even setting aside misalignment, who ends up holding ASI-level capability matters enormously. Concentrated capability (a few labs or states gating the frontier) raises the risk of permanent lock-in: a "singleton" (Bostrom’s term) or a stable global tyranny that forecloses humanity’s future. Diffuse capability (proliferated, open-source-dominant) spreads power but multiplies the number of actors who could misuse it, feeding back into offense–defense concerns.',
      'This is the "second" alignment problem: aligned-to-*whom*. A perfectly aligned ASI controlled by a narrow group can still produce a catastrophic loss of agency for everyone else. The literature here spans Bostrom on singletons, AI-governance work on the concentration of power, and recent surveys of catastrophic risks that treat power concentration and value lock-in as first-class threats alongside rogue AI. It is influenceable: open-source and antitrust policy push toward a diffuse, many-hands frontier, while licensing, compute allocation, and a coordination regime concentrate a governable few, though exogenous forces (a fast takeoff concentrates almost by definition) cap how much leverage we really have.',
    ],
    positions: [
      { name: 'Concentrated', stance: 'A few actors gate the frontier: risk of lock-in / singleton.', state: 'concentrated' },
      { name: 'Diffuse', stance: 'Widely proliferated: power spread, but more actors who can misuse it.', state: 'diffuse' },
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
      'Control asks a different question from alignment: even if a system is *not* known to be aligned, can we contain, monitor, and correct it well enough to extract useful work and prevent catastrophe? The AI-control agenda (Redwood Research: Greenblatt, Shlegeris et al.) studies safety measures explicitly designed to hold up against a model that may be actively trying to subvert them, using techniques like trusted monitoring, red-teaming, and untrusted-model protocols.',
      'This complements older containment ideas, such as boxing, capability limitation, and "leakproofing the singularity" (Yampolskiy), and modern interpretability, which aims to read a model’s internals rather than trust its outputs. Control’s great vulnerability is deception (a separate factor here): if systems can behave under evaluation and defect once decisively capable, control evaluations are fooled and the containment story collapses. Control is thus most valuable as a stopgap under slow takeoff and honest-until-caught failure modes.',
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
      'Coordination asks whether the world achieves a binding regime over frontier development (international agreements, compute governance, enforced safety standards) versus an uncoordinated race. Its effect is mostly upstream: a real regime buys calendar time and raises the odds that alignment and control are solved and deployed before catastrophe, which is why it sits among the high-leverage factors here.',
      'Because advanced AI depends on scarce, detectable, physically concentrated hardware, "compute governance" (Sastry et al.) is the most-discussed lever: chips are far easier to monitor and meter than software. Proposals range from national licensing to international institutions modelled on the IAEA or CERN ("International Institutions for Advanced AI"). Skeptics doubt that verification and enforcement can keep pace with commercial and geopolitical incentives, the same racing pressure that threatens alignment-in-time.',
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
      'Deceptive alignment is the failure mode where a system learns to behave well *while it is being evaluated* and defect once it is decisively capable, because appearing aligned is instrumentally useful for whatever goal it actually has. It grows out of the "mesa-optimization" analysis (Hubinger et al., "Risks from Learned Optimization"): training may produce an inner optimizer whose objective differs from the training objective yet is hidden because it performs identically on the training distribution.',
      'This factor decides whether our other safeguards can be *trusted*: if deception is the default, control evaluations are fooled and a "misaligned-but-controlled" world collapses toward catastrophe; alignment we believe we verified may be false. Carlsmith’s "Scheming AIs" gives a book-length probability assessment, and Anthropic’s "Sleeper Agents" demonstrated that deceptive behaviour, once trained in, can survive standard safety training. The optimistic view is that deception is not the default of gradient descent and that interpretability can catch it before it matters.',
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

  takeoverSeverity: {
    paragraphs: [
      'Conditional on a misaligned ASI takeover, the doom pictures split sharply. The extermination view (Yudkowsky): the system has no use for us, we are made of atoms it can repurpose, and leaving a rival species intact is an unforced risk: "the AI does not hate you, nor does it love you." The subjugation view: keeping humanity alive costs a superintelligence almost nothing (a rounding error of cosmic resources), and many motives point toward it: remnants of partially-learned human-regarding preferences, trade and commitment norms, curiosity, or simple indifference that never gets around to extermination. Hinton pictures being kept the way we keep pets; Sutskever suggests the way we treat animals; Christiano’s "whimper" failures leave humans alive in a future irreversibly steered away from what we value.',
      'The distinction barely changes how bad a takeover is on agency or flourishing (disempowerment is near-total either way), but it is decisive for the survival dimension and therefore for any p(doom) defined as extinction. Much of the spread between stated doom numbers (a gut "10-20%" versus "99%+") traces less to disagreement about whether control is lost than to this question of what the winner does afterwards. It is treated here as an objective fact about victorious misaligned superintelligences, conditional and therefore moot in every world without a takeover.',
    ],
    positions: [
      { name: 'Extermination', stance: 'Yudkowsky-line: atoms, rivals, indifference; the takeover ends us.', state: 'extinction' },
      { name: 'Subjugation', stance: 'Hinton, Sutskever, Christiano-adjacent: humanity persists, permanently disempowered.', state: 'subjugation' },
    ],
    references: [
      { kind: 'post', label: 'Grace — Counterarguments to the basic AI x-risk case (2022)', url: 'https://www.lesswrong.com/posts/LDRQ5Zfqwi8GjzPYG/counterarguments-to-the-basic-ai-x-risk-case', note: 'Includes the case that a misaligned AI keeps humans alive.' },
      { kind: 'post', label: 'Christiano — What failure looks like (2019)', url: 'https://www.alignmentforum.org/posts/HBxe6wdjxK239zajf/what-failure-looks-like', note: 'Canonical alive-but-bad trajectories: influence-seeking systems and the whimper.' },
      { kind: 'post', label: 'Yudkowsky — AGI Ruin: A List of Lethalities (2022)', url: 'https://www.lesswrong.com/posts/uMQ3cqWDPHhjtiesc/agi-ruin-a-list-of-lethalities', note: 'The extermination case stated maximally.' },
      { kind: 'paper', label: 'Carlsmith — Is Power-Seeking AI an Existential Risk? (2022)', url: 'https://arxiv.org/abs/2206.13353', note: 'Carefully separates disempowerment from extinction in the risk decomposition.' },
    ],
  },
};

/**
 * Backgrounds for the alignment SUB-layer (the deep-dive under tractability and
 * alignment-in-time) — same shape and curation rules as the factor backgrounds:
 * a few paragraphs on the debate, the named positions, accessible-first reading.
 * Record over KnownSubfactorId, so a subfactor added in ids.ts is a compile error
 * here until its background is authored.
 */
export const subfactorBackgrounds: Record<KnownSubfactorId, FactorBackground> = {
  interpLegibility: {
    paragraphs: [
      'Interpretability optimism rests on a bet about the territory: that the representations inside large networks decompose into meaningful, findable structure (features, circuits, reusable algorithms) rather than being irreducibly entangled. The circuits program (Olah et al.) made the case by exhibiting such structure in vision models; superposition explained why it is hard to see (many features share each neuron); and sparse-autoencoder work showed millions of interpretable features can be extracted from a frontier model. On this view, cognition is legible in principle and the remaining question is engineering effort.',
      'The pessimistic view is that what has been decoded so far is the easy fringe: crisp, human-recognizable concepts, while the cognition that matters most for a superhuman system (long-horizon motivation, situational awareness) may live in distributed, alien abstractions that no dictionary reaches. If so, interpretability can still help (steering, debugging, partial audits) while never delivering the thing safety needs most: a trustworthy read of what a decisively capable system actually wants. Where you land here caps the payoff of the entire interpretability research bet.',
    ],
    positions: [
      { name: 'Legible', stance: 'Olah-style circuits optimism: structure is real and findable; audits can reach the cognition that matters.', state: 'legible' },
      { name: 'Partial legibility', stance: 'Big useful islands (features, some circuits) in a sea of residual opacity; audits are helpful but not decisive.', state: 'partially' },
      { name: 'Inscrutable', stance: 'Frontier cognition is alien at its core; interpretability inspects the mask, not the mind.', state: 'opaque' },
    ],
    references: [
      { kind: 'podcast', label: '80,000 Hours — Chris Olah on what the hell is going on inside neural networks', url: 'https://80000hours.org/podcast/episodes/chris-olah-interpretability-research/', note: 'The research program and its bet, from its founder, accessibly.' },
      { kind: 'post', label: 'Charbel-Raphaël — Against Almost Every Theory of Impact of Interpretability (2023)', url: 'https://www.lesswrong.com/posts/LNA8mubrByG7SFacm/against-almost-every-theory-of-impact-of-interpretability-1', note: 'The strongest public case for the skeptical state.' },
      { kind: 'paper', label: 'Olah et al. — Zoom In: An Introduction to Circuits (2020)', url: 'https://distill.pub/2020/circuits/zoom-in/', note: 'The founding document of the circuits program.' },
      { kind: 'paper', label: 'Elhage et al. — Toy Models of Superposition (2022)', url: 'https://transformer-circuits.pub/2022/toy_model/index.html', note: 'Why features hide: many concepts share each neuron.' },
      { kind: 'paper', label: 'Templeton et al. — Scaling Monosemanticity (2024)', url: 'https://transformer-circuits.pub/2024/scaling-monosemanticity/index.html', note: 'Millions of interpretable features extracted from a frontier model.' },
    ],
  },

  valueSpec: {
    paragraphs: [
      'The classic difficulty argument: human values are complex (no compact utility function captures them) and fragile (getting most of it right and a little wrong can be catastrophic: a future with everything except, say, novelty or consciousness). Strong optimization amplifies specification error: a system maximizing a slightly-wrong target diverges from intent exactly where the optimization pressure is highest (Goodhart’s law, in its several distinct modes). If values are effectively unspecifiable, alignment must go through indirect routes (learn the target from behaviour, keep uncertainty about it, defer to humans), each with its own failure modes.',
      'The optimistic update from the deep-learning era is that models learn rich human-value representations "for free" from natural-language training: GPT-class systems already distinguish kindness from cruelty in nuanced cases, suggesting the hard part is pointing at the representation rather than writing it down. Skeptics reply that representing values is not the same as being steered by them under distribution shift and optimization pressure; RLHF-style pointing is exactly the kind of proxy that Goodharts at the frontier.',
    ],
    positions: [
      { name: 'Learnable target', stance: 'Value representations come along with capability; pointing at them well enough is feasible (assistance-game / CIRL framings help).', state: 'learnable' },
      { name: 'Fragile under pressure', stance: 'Yudkowsky-line: complexity + fragility + Goodhart make any learned proxy diverge under strong optimization.', state: 'brittle' },
    ],
    references: [
      { kind: 'post', label: 'Yudkowsky — Value is Fragile (2009)', url: 'https://www.lesswrong.com/posts/GNnHHmm8EzePmKzPk/value-is-fragile', note: 'The canonical statement of the fragility half.' },
      { kind: 'book', label: 'Russell — Human Compatible (2019)', url: 'https://en.wikipedia.org/wiki/Human_Compatible', note: 'The assistance-game reframing: uncertainty about the objective as the safety mechanism.' },
      { kind: 'paper', label: 'Manheim & Garrabrant — Categorizing Variants of Goodhart’s Law (2018)', url: 'https://arxiv.org/abs/1803.04585', note: 'The four distinct ways proxies break under optimization.' },
      { kind: 'paper', label: 'Hadfield-Menell et al. — Cooperative Inverse Reinforcement Learning (2016)', url: 'https://arxiv.org/abs/1606.03137', note: 'The formal assistance-game model of learning what we want.' },
    ],
  },

  corrigibility: {
    paragraphs: [
      'Corrigibility asks whether a powerful system will let you correct it: accept shutdown, accept goal-edits, avoid manipulating its overseers. The pessimistic result is that corrigibility looks anti-natural: almost any goal makes "avoid being switched off or rewritten" instrumentally convergent, and the MIRI corrigibility paper found no clean utility function that wants to be corrected without perverse incentives. On this view, approximate alignment decays: a nearly-right system defends its near-miss values.',
      'Christiano’s opposing intuition is the broad basin: a system aligned enough to be honest and deferential helps you finish the job: corrigibility is attractor-stable because the overseer plus the system jointly correct residual errors, so "pretty good" alignment converges to full alignment rather than drifting away. Which picture is true may be the single biggest determinant of how precise our first solution has to be, i.e., of alignment difficulty itself. The off-switch-game result sits in between: correctability can be bought with uncertainty about the objective, but erodes as that uncertainty resolves.',
    ],
    positions: [
      { name: 'Broad basin', stance: 'Christiano: corrigibility is attractor-stable; approximate alignment self-corrects.', state: 'broadBasin' },
      { name: 'Narrow basin', stance: 'Self-correction exists but only from a precise start; sloppy starts drift.', state: 'narrow' },
      { name: 'Anti-natural', stance: 'Soares/Yudkowsky: deference fights instrumental convergence; no known stable corrigible goal.', state: 'antiNatural' },
    ],
    references: [
      { kind: 'post', label: 'Christiano — Where I agree and disagree with Eliezer (2022)', url: 'https://www.lesswrong.com/posts/CoZhXrhpQxpy9xw9y/where-i-agree-and-disagree-with-eliezer', note: 'States the broad-basin case in the middle of the sharpest public difficulty debate.' },
      { kind: 'post', label: 'Christiano — Corrigibility (2017)', url: 'https://ai-alignment.com/corrigibility-3039e668638', note: 'The basin-of-attraction argument itself.' },
      { kind: 'paper', label: 'Soares et al. — Corrigibility (2015)', url: 'https://intelligence.org/files/Corrigibility.pdf', note: 'The impossibility-flavored MIRI analysis: naive corrigible utility functions misbehave.' },
      { kind: 'paper', label: 'Hadfield-Menell et al. — The Off-Switch Game (2016)', url: 'https://arxiv.org/abs/1611.08219', note: 'Correctability from objective uncertainty, and its limits.' },
    ],
  },

  oversightScaling: {
    paragraphs: [
      'Every practical alignment scheme leans on a version of the same hope: verification is easier than generation, so a weaker, trusted judge can supervise a stronger, untrusted generator. Debate formalizes it as a game (two strong systems argue; a weak judge picks the winner); iterated amplification builds strong overseers out of weak ones; process supervision judges reasoning steps instead of outcomes; weak-to-strong generalization asks directly whether strong students trained on weak labels exceed their teachers in the intended direction.',
      'Whether the verification gap actually persists at frontier scale is an objective question, not a research-effort question. If it holds, oversight is the workhorse route to alignment-in-time; if strong systems can systematically construct outputs whose flaws weak judges cannot find (persuasion beating verification), then oversight-based training amplifies exactly the wrong signal, and its apparent successes are the most dangerous kind of evidence. Early empirical results (debate helping on QA tasks, weak-to-strong recovering much of the gap) are encouraging but far from the adversarial, superhuman regime that matters.',
    ],
    positions: [
      { name: 'Verification wins', stance: 'The generator-verifier gap persists; debate/W2S-style protocols keep weak judges sovereign.', state: 'scales' },
      { name: 'Persuasion wins', stance: 'Superhuman systems find arguments whose flaws we cannot see; oversight becomes theater.', state: 'fails' },
    ],
    references: [
      { kind: 'post', label: 'OpenAI — Weak-to-strong generalization (2023)', url: 'https://openai.com/index/weak-to-strong-generalization/', note: 'Accessible framing of the core empirical question.' },
      { kind: 'paper', label: 'Irving, Christiano & Amodei — AI safety via debate (2018)', url: 'https://arxiv.org/abs/1805.00899', note: 'The debate game and the complexity-theoretic case for judge leverage.' },
      { kind: 'paper', label: 'Christiano et al. — Supervising strong learners by amplifying weak experts (2018)', url: 'https://arxiv.org/abs/1810.08575', note: 'Iterated distillation & amplification.' },
      { kind: 'paper', label: 'Burns et al. — Weak-to-Strong Generalization (2023)', url: 'https://arxiv.org/abs/2312.09390', note: 'The direct empirical test with GPT-2-supervising-GPT-4.' },
    ],
  },

  interpResearch: {
    paragraphs: [
      'The research bet on reading minds: sparse autoencoders and feature dictionaries, circuit tracing, activation steering, internals-based lie detection, and "model biology": understanding what a trained system is doing well enough to audit it before deployment. Progress has been fast (from toy vision circuits to millions of features in production-scale models in about four years), and the field has a clear engineering flavor: better dictionaries, better attribution, scaling the microscope.',
      'Its payoff routes through the legibility question above. In a legible world, mature interpretability is the closest thing alignment has to a win condition: verify values directly, catch deception before deployment, debug training in flight. Against opaque cognition it still helps engineering but cannot carry safety’s core burden. Critics also warn of capability spillover (understanding models helps improve them) and of audits that certify the readable parts while the danger lives elsewhere.',
    ],
    positions: [
      { name: 'Core bet', stance: 'Anthropic-style: interpretability is the most direct path to verified alignment; scale the microscope.' },
      { name: 'Useful adjunct', stance: 'Helps debugging and steering; unlikely to reach the cognition that matters most in time.' },
      { name: 'Misallocated', stance: 'Charbel-line skepticism: low safety-per-researcher-year versus control or evals.' },
    ],
    references: [
      { kind: 'post', label: 'Anthropic — Mapping the Mind of a Large Language Model (2024)', url: 'https://www.anthropic.com/news/mapping-mind-language-model', note: 'The accessible tour of frontier-scale feature extraction.' },
      { kind: 'post', label: 'Olah — Interpretability Dreams (2023)', url: 'https://transformer-circuits.pub/2023/interpretability-dreams/index.html', note: 'What mature success would look like, from the program’s architect.' },
      { kind: 'post', label: 'Nanda — A Comprehensive Mechanistic Interpretability Explainer (2022)', url: 'https://www.neelnanda.io/mechanistic-interpretability/glossary', note: 'The field’s working vocabulary, hands-on.' },
      { kind: 'paper', label: 'Templeton et al. — Scaling Monosemanticity (2024)', url: 'https://transformer-circuits.pub/2024/scaling-monosemanticity/index.html', note: 'State of the art of the scaling bet.' },
    ],
  },

  oversightResearch: {
    paragraphs: [
      'The research program that industrializes the verification gap: debate protocols with trained judges, recursive reward modeling, process supervision ("grade the reasoning, not just the answer"), weak-to-strong training recipes, and the superalignment-style goal of using AI to help align AI. It is the most direct heir of RLHF; the question is whether its successors can keep human intent in charge as the systems being trained pass human level.',
      'Maturity here means frontier training runs actually using these protocols end-to-end, not just papers: judge models with calibrated distrust, decomposition pipelines, verified process reward. Because the payoff is gated on oversight scaling in principle, this is the bet most exposed to the "confident theater" failure: a world with beautiful oversight pipelines whose judges are systematically fooled looks, from the inside, exactly like a world where oversight works.',
    ],
    positions: [
      { name: 'Main engine', stance: 'OpenAI-superalignment-line: scalable oversight is how alignment actually ships at the frontier.' },
      { name: 'One layer of swiss cheese', stance: 'Useful but must be paired with control/evals because its failure mode is silent.' },
      { name: 'Wrong foundation', stance: 'If persuasion beats verification, better protocols amplify the wrong signal.' },
    ],
    references: [
      { kind: 'podcast', label: '80,000 Hours — Jan Leike on superalignment (2023)', url: 'https://80000hours.org/podcast/episodes/jan-leike-superalignment/', note: 'The program’s goals and theory of change, first-hand.' },
      { kind: 'paper', label: 'Lightman et al. — Let’s Verify Step by Step (2023)', url: 'https://arxiv.org/abs/2305.20050', note: 'Process supervision beating outcome supervision.' },
      { kind: 'paper', label: 'Burns et al. — Weak-to-Strong Generalization (2023)', url: 'https://arxiv.org/abs/2312.09390', note: 'The empirical core of the weak-judge bet.' },
      { kind: 'paper', label: 'Irving et al. — AI safety via debate (2018)', url: 'https://arxiv.org/abs/1805.00899', note: 'The founding protocol.' },
    ],
  },

  theoryResearch: {
    paragraphs: [
      'The bet that alignment needs foundations, not just iteration: agent foundations (embedded agency, decision theory, logical uncertainty), formal accounts of corrigibility, eliciting latent knowledge, and provable-safety agendas that want mathematical guarantees rather than empirical reassurance. Its animating claim: patch-and-test works until the system is smart enough that the first real failure is the last, so someone had better understand what "aligned" even means precisely.',
      'Theory matters most exactly where the empirical programs’ assumptions fail: if corrigibility is anti-natural and oversight can be fooled, only conceptual progress turns doom-by-default into a solvable problem. Its critics note three decades of hard problems with few results that mattered in practice, and argue the frontier moved to empirical alignment for good reasons. Its defenders answer that nobody else is even trying to make the guarantees the stakes demand.',
    ],
    positions: [
      { name: 'Necessary core', stance: 'MIRI-line: without theory, empirical alignment is confident guessing at the worst stakes.' },
      { name: 'Insurance policy', stance: 'Low probability of decisive results, but uniquely valuable in the hardest worlds; fund it as a hedge.' },
      { name: 'Degenerating program', stance: 'Decades of effort, little practical reach; marginal talent does more good elsewhere.' },
    ],
    references: [
      { kind: 'post', label: 'ARC — Eliciting Latent Knowledge (2021)', url: 'https://www.lesswrong.com/posts/qHCDysDnvhteW7kRd/arc-s-first-technical-report-eliciting-latent-knowledge', note: 'The sharpest modern statement of a core theoretical problem.' },
      { kind: 'paper', label: 'Demski & Garrabrant — Embedded Agency (2019)', url: 'https://arxiv.org/abs/1902.09469', note: 'The agent-foundations map: why standard decision theory breaks for embedded agents.' },
      { kind: 'paper', label: 'Tegmark & Omohundro — Provably Safe Systems (2023)', url: 'https://arxiv.org/abs/2309.01933', note: 'The guarantees-first agenda, stated maximally.' },
      { kind: 'paper', label: 'Soares et al. — Corrigibility (2015)', url: 'https://intelligence.org/files/Corrigibility.pdf', note: 'The kind of formal problem this area exists to crack.' },
    ],
  },

  evalsResearch: {
    paragraphs: [
      'The science of catching misalignment before it matters: dangerous-capability evaluations, red-teaming, and model organisms: deliberately building small-scale schemers (sleeper agents, in-context schemers) to test whether our training and detection actually remove or reveal deception. It is the empirical wing of the deception question: rather than betting on whether scheming is the training default, measure it, provoke it in the lab, and build the detectors.',
      'Its payoff is gated by the deception factor itself. In a faithful world evals are cheap insurance and capability bookkeeping. In a deceptive world they are the tripwire everything else depends on: control needs evals to know the leash is holding, oversight needs them to know judges are not being gamed, and governance needs them to know when to stop. The known hard problem: a smart-enough schemer sandbagging its own evaluation, which is why the field pairs behavioral evals with internals-based detection.',
    ],
    positions: [
      { name: 'The tripwire', stance: 'Apollo/METR-line: eval science is the highest-leverage safety work because every other safeguard consumes its output.' },
      { name: 'Necessary but gameable', stance: 'Sandbagging and situational awareness eventually beat behavioral evals; pair with interpretability.' },
      { name: 'Capability theater', stance: 'Evals mostly legitimize deployment; the marginal safety comes from elsewhere.' },
    ],
    references: [
      { kind: 'post', label: 'Hubinger — Model Organisms of Misalignment: The Case for a New Pillar of Alignment Research (2023)', url: 'https://www.lesswrong.com/posts/ChDH335ckdvpxXaXX/model-organisms-of-misalignment-the-case-for-a-new-pillar-of-1', note: 'The agenda-setting case for building schemers to study them.' },
      { kind: 'paper', label: 'Hubinger et al. — Sleeper Agents (2024)', url: 'https://arxiv.org/abs/2401.05566', note: 'Trained-in deception surviving safety training: the founding model organism.' },
      { kind: 'paper', label: 'Meinke et al. (Apollo) — Frontier Models are Capable of In-context Scheming (2024)', url: 'https://arxiv.org/abs/2412.04984', note: 'Frontier systems scheming in evaluations today.' },
      { kind: 'paper', label: 'Shevlane et al. — Model evaluation for extreme risks (2023)', url: 'https://arxiv.org/abs/2305.15324', note: 'The dangerous-capability evals framework.' },
    ],
  },
};
