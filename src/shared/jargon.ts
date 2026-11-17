// SHARED MODULE: the same file is in the Plain Language Lab and the Protocol Builder
// (src/shared/jargon.ts); a test in each repo fails if the copies differ.
//
// Words a lay reader may not know, with plainer words. Written for these apps from common
// plain-language practice for patient documents; not taken from any published word list.
// Format of each line: term | plain alternative | when the term may stay (optional).
// A term is matched as a whole word (a trailing * matches any ending); all-capital terms match
// case-sensitively. "keep" notes say when the technical word should stay, explained.

const RAW = `
abdomen|belly or tummy
abdominal|in the belly
abnormal|not normal or not as expected
absorption|how the body takes in the medicine
acute|sudden or short-term
adverse event*|a health problem that happens during the study, whether or not caused by the medicine
adverse reaction*|a side effect
administer*|give
administration of|giving
aetiology|cause
etiology|cause
alleviate|ease
allocat*|put into a group
ambulatory|able to walk; or as an outpatient
amendment|a change to the study plan
analgesic*|painkiller
anaemia|low red blood cell count
anemia|low red blood cell count
anaphyla*|a sudden, severe allergic reaction
anticoagulant*|a medicine that stops blood clotting (a blood thinner)
antiemetic*|a medicine against feeling sick
antihypertensive*|a blood pressure medicine
antipyretic*|a medicine that lowers fever
arrhythmia*|an uneven or abnormal heartbeat
arm|treatment group|keep in diagrams only, explained
ascertain|find out
assay*|test
asymptomatic|without symptoms
attenuat*|weaken or lessen
auxiliary medicinal product*|another medicine used in the study
baseline|the start of the study
benign|not cancer or not harmful
bilateral|on both sides
bioavailability|how much of the medicine reaches the blood
biomarker*|a measurable sign in the body, such as a substance in the blood
biopsy|taking a small piece of tissue to look at
blinded|not told which treatment|keep with an explanation
blinding|keeping the treatment secret
bolus|a single dose given at once
bradycardia|slow heartbeat
carcinogenic*|could cause cancer
cardiac|heart
cardiovascular|heart and blood vessel
catheter*|a thin tube
cessation|stopping
chronic|long-lasting
clinically significant|important for your health
clinician*|doctor or nurse
co-administration|taking together
cognitive|thinking and memory
cohort*|group
commence*|start
comorbidit*|other health conditions
compliance|taking the medicine as told
concomitant medication*|other medicines you take
concomitant|at the same time
confidence interval*|the range the true result probably lies in
consent form|this form
contraception|birth control
contraindicat*|reasons not to use
crossover|swapping treatments partway through
cumulative|added up over time
cutaneous|of the skin
data monitoring committee|an independent group of experts who check the study's safety
debilitat*|weakening
deleterious|harmful
dermal|of the skin
dermatitis|skin inflammation (eczema)
diagnos*|find out what illness you have
dialysis|treatment that cleans the blood when the kidneys do not work
discontinu*|stop
distension|swelling
diuretic*|a water tablet
dosage|dose
dose-dependent|depending on how much is taken
double-blind|neither you nor the study team know which treatment you get
double blind|neither you nor the study team know which treatment you get
dyspepsia|indigestion
dysphagia|difficulty swallowing
dyspnoea|shortness of breath
dyspnea|shortness of breath
efficacious|works
efficacy|how well it works
elevated|higher than normal
eligib*|able to take part
embryo-fetal|to an unborn baby
emesis|vomiting
endpoint*|what the study measures
enrol*|join
enroll*|join
epidemiolog*|how common a disease is and who gets it
erythema|redness of the skin
estimand*|the exact question the study answers
etiolog*|cause
exacerbat*|make worse
excipient*|other ingredients in the medicine
exclusion criteria|who cannot take part
expedite|speed up
experimental|being tested
facilitate|help
fasting|without eating
febrile|with a fever
fetal|of an unborn baby
fetus|unborn baby
foetus|unborn baby
follow-up|later check-ups
formulation|form of the medicine
gastrointestinal|stomach and gut
gastric|stomach
genotoxic*|could damage genes
haematolog*|blood
hematolog*|blood
haemorrhage|bleeding
hemorrhage|bleeding
half-life|how long it takes for half the medicine to leave the body
hepatic|liver
hepatitis|liver inflammation
hepatotoxic*|harmful to the liver
hospitali*ation|a stay in hospital
hypersensitivity|allergy
hypertension|high blood pressure
hypoglycaemia|low blood sugar
hypoglycemia|low blood sugar
hypotension|low blood pressure
idiopathic|of unknown cause
immunocompromised|with a weak immune system
immunosuppress*|weakening the immune system
impaired|not working well
in accordance with|following
incidence|how often something happens
inclusion criteria|who can take part
indication|what the medicine is used for
infusion|a drip into a vein
inhibit*|block
initiat*|start
injection site reaction*|redness, swelling or pain where the needle went in
insomnia|trouble sleeping
intercurrent event*|something that happens during the study, such as stopping treatment
interim analys*|a check of the results partway through
intramuscular*|into a muscle
intravenous*|into a vein
investigational medicinal product*|the study medicine
investigational product*|the study medicine
investigator|study doctor
IRB|ethics committee|keep in US forms, explained once
ischaemi*|lack of blood flow
ischemi*|lack of blood flow
lactat*|breastfeeding
lesion*|sore, wound or patch of damaged skin
lethargy|tiredness
malaise|feeling generally unwell
malignan*|cancer
maximum tolerated dose|the highest dose people can take without serious side effects
mean|average
median|middle value
metaboli*|how the body breaks down
metastas*|cancer that has spread
mitigat*|reduce
modality|method
monotherapy|using one medicine on its own
morbidity|illness
mortality|death
musculoskeletal|muscles and bones
myalgia|muscle pain
nausea|feeling sick
neoplasm*|tumour
nephrotoxic*|harmful to the kidneys
neurolog*|nerves and brain
non-inferior*|no worse than
noninferior*|no worse than
nonclinical|in the laboratory or in animals
objective*|aim
observational|watching without giving a treatment
occlusion|blockage
oedema|swelling
edema|swelling
onset|start
open-label|everyone knows which treatment is given
oral|by mouth|keep on dosing instructions with "by mouth"
orally|by mouth
palliative|to relieve symptoms
parameter*|measurement
participant*|person taking part|keep when the form has explained it
pathogen*|germ
pathology|the study of disease; or disease
peak|highest
per protocol|as the study plan says
percutaneous|through the skin
pharmacodynamic*|what the medicine does to the body
pharmacokinetic*|how the body handles the medicine
pharmacovigilance|checking medicines for side effects
phase 1|an early study, usually in a small number of people
phase 2|a study in a few hundred people with the condition
phase 3|a large study to confirm the medicine works and is safe
placebo|a dummy treatment with no medicine in it|keep with an explanation
placebo-controlled|compared with a dummy treatment
post-dose|after the dose
postoperative|after the operation
pre-existing|that you already have
prevalence|how many people have a condition
primary endpoint|main thing the study measures
primary objective|main aim
prior to|before
prognosis|how an illness is likely to go
prophyla*|prevention
prospective|looking forward from now
protocol|the study plan
pruritus|itching
pulmonary|lung
qualitative|by description rather than numbers
quantitative|by numbers
randomi*ation|putting people into groups by chance
randomi*ed|put into a group by chance
randomly assigned|put into a group by chance
rash|red or spotty skin|keep: plain already
recruit*|ask to join
regimen|treatment plan
remission|when signs of the disease go away
renal|kidney
resolution|going away
respiratory|breathing
retrospective|looking back at past records
rheumat*|joint and muscle disease
rescue medication|extra medicine if your symptoms get worse
risk-benefit|the balance of risks and possible benefits
sedation|medicine that makes you sleepy and calm
sequelae|after-effects
serious adverse event*|a serious health problem, such as one that needs a hospital stay
serum|the liquid part of blood
somnolence|sleepiness
sponsor|the company running the study|keep with an explanation
statistically significant|unlikely to be due to chance
stratifi*|grouping by a feature before random assignment
subcutaneous*|under the skin
subject*|participant (prefer "person taking part")
subsequent*|later
sufficient|enough
superiority|better than
susceptib*|more likely to get
symptomatic|with symptoms
syncope|fainting
systemic|affecting the whole body
tachycardia|fast heartbeat
teratogenic*|could harm an unborn baby
terminat*|end
therapeutic|treatment
thrombo*|blood clot
titrat*|adjust the dose step by step
tolerabilit*|how well the medicine is put up with
topical|on the skin
toxicit*|harm or poisoning
transient|short-lived
trial|study|keep: both are plain
ULN|the upper limit of normal
ALT|a liver blood test
AST|a liver blood test
HbA1c|a blood test of average blood sugar over 2 to 3 months
eGFR|a measure of how well the kidneys work
ECG|a heart tracing (electrocardiogram)
MRI|a body scan using magnets
CT scan|a body scan using X-rays
utili*|use
venepuncture|taking blood from a vein
venipuncture|taking blood from a vein
vertigo|dizziness
viable|able to live or work
vital signs|blood pressure, pulse, breathing and temperature
withdraw* consent|stop taking part
women of childbearing potential|women who could become pregnant
WOCBP|women who could become pregnant
commencement|start
approximately|about
additionally|also
demonstrate*|show
endeavour|try
endeavor|try
in the event that|if
in order to|to
notwithstanding|despite
pertaining to|about
subsequently|later
terminate|end
whereas|while
whilst|while
`
export interface JargonTerm { term: string; plain: string; keep?: string; re: RegExp }
export const JARGON_TERMS: JargonTerm[] = RAW.trim().split('\n').map((line) => {
  const [term, plain, keep] = line.split('|').map((x) => x.trim())
  const body = term.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '\\w*').replace(/ /g, '[\\s-]+')
  const caps = /^[A-Z][A-Z0-9]+$/.test(term)
  return { term: term.replace(/\*/g, ''), plain, keep, re: new RegExp(`(?<![\\w-])${body}(?![\\w-])`, caps ? '' : 'i') }
})
export interface JargonHit { word: string; plain: string; keep?: string; index: number }
/** Every jargon word in the text, first occurrence of each term, in order of appearance. */
export function findJargon(text: string): JargonHit[] {
  const out: JargonHit[] = []
  for (const t of JARGON_TERMS) { const m = t.re.exec(text); if (m) out.push({ word: m[0], plain: t.plain, keep: t.keep, index: m.index }) }
  return out.sort((a, b) => a.index - b.index)
}
