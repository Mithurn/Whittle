import Link from "next/link";
import { EmberDemo } from "./EmberDemo";
import { EmberGif } from "./EmberGif";
import { LessonTabs } from "./LessonTabs";
import { PileToPath } from "./PileToPath";
import { Reveal } from "./Reveal";
import { APP_ROUTE } from "./landing-config";
import styles from "./landing.module.css";

const ARROW = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M3 9h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CURL = (
  <path d="M20 180C20 90 80 20 170 20c0 60-40 100-90 100-30 0-45-20-30-40 12-16 40-10 40 8" stroke="currentColor" strokeWidth="14" strokeLinecap="round" />
);

const ROADMAP_ROWS = [
  { state: "done", label: "Grip and ready position", note: "Mastered", dot: "✓" },
  { state: "now", label: "The serve", note: "Up next, 5 slides", dot: "2" },
  { state: "", label: "Dinking at the kitchen line", dot: "3" },
  { state: "skipped", label: "Third shot drop", note: "Skipped, bring it back anytime", dot: "4" },
  { state: "", label: "Stacking and court sense", dot: "5" },
  { state: "", label: "Attack and counter", dot: "6" },
] as const;

const HOW_STEPS = [
  {
    title: "Pick one hobby",
    body: "Chess, pickleball, bouldering, sourdough. Tell us your level, your goal, and how much time you really have.",
    picks: [
      { label: "Pickleball", on: true },
      { label: "Beginner", on: true },
      { label: "3 hrs a week", on: false },
    ],
  },
  {
    title: "Get your roadmap",
    body: "5 to 8 techniques, ordered from foundational to advanced, built from real videos, articles and podcasts we searched for you.",
  },
  {
    title: "Learn one at a time",
    body: "Each technique is 5 short slides. Master it, or skip it and bring it back whenever you like. No guilt either way.",
  },
] as const;

const NOS = [
  { word: "Streaks", note: "Miss a day, lose nothing." },
  { word: "Points", note: "Skill is the only score." },
  { word: "Accounts", note: "Progress is saved on your device." },
] as const;

export function LandingPage() {
  return (
    <div className={styles.page} id="top">
      <a className={styles.skip} href="#start">
        Skip to content
      </a>

      <header className={`${styles.wrap} ${styles.nav}`}>
        <a className={styles.logo} href="#top" aria-label="Whittle home">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <path d="M4 22C4 11 11 4 22 4c0 11-7 18-18 18Z" fill="#EB8928" />
            <path d="M4 22 16 10" stroke="#FFF7D9" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          Whittle
        </a>
        <Link className={`${styles.btn} ${styles.small}`} href={APP_ROUTE}>
          Start your roadmap
        </Link>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={`${styles.wrap} ${styles.heroGrid}`}>
            <div>
              <p className={styles.eyebrow}>One hobby. One roadmap.</p>
              <h1>
                Stop watching. Start <em>getting good.</em>
              </h1>
              <p className={styles.lede}>
                Pick the hobby you keep meaning to try. Whittle shaves the internet down to 5 to 8 techniques, in the right order, so you know what to practice next.
              </p>
              <div className={styles.ctaRow}>
                <Link className={styles.btn} id="start" href={APP_ROUTE}>
                  Start your roadmap {ARROW}
                </Link>
                <a className={`${styles.btn} ${styles.ghost}`} href="#pile">
                  See how it works
                </a>
              </div>
              <p className={styles.fine}>Free. No account. Your progress stays on your device.</p>
            </div>

            <div className={styles.heroVisual}>
              <article className={styles.road} aria-label="Example roadmap for Pickleball">
                <div className={styles.roadHead}>
                  <h3>Pickleball</h3>
                  <span className={styles.tag}>Beginner</span>
                </div>
                <p className={styles.roadSub}>6 techniques, foundational to advanced</p>
                <ol className={styles.steps}>
                  {ROADMAP_ROWS.map((row) => (
                    <li key={row.label} className={`${styles.step} ${row.state ? styles[row.state] : ""}`}>
                      <span className={styles.dot} aria-hidden="true">
                        {row.dot}
                      </span>
                      <div>
                        {row.label}
                        {"note" in row && <small>{row.note}</small>}
                      </div>
                    </li>
                  ))}
                </ol>
              </article>
              <EmberGif width={104} className={styles.emberHero} alt="Ember, the Whittle mascot, a small flame" />
              <p className={styles.bubble}>You&apos;re 5 steps away from mastering Pickleball!</p>
            </div>
          </div>
        </section>

        <section className={`${styles.problem} ${styles.sec}`} id="pile" aria-labelledby="pile-heading">
          <div className={styles.wrap}>
            <div className={styles.problemHead}>
              <div>
                <p className={styles.eyebrow}>The problem</p>
                <h2 id="pile-heading">Too much to watch is the same as nothing to follow.</h2>
              </div>
              <p className={styles.lede}>
                Forty tabs, nine tutorials, one afternoon gone. Whittling is cutting away everything that is not the shape. Drag it, or just keep scrolling, and watch the pile become a path.
              </p>
            </div>
            <PileToPath />
          </div>
        </section>

        <section className={styles.sec} aria-labelledby="how-heading">
          <div className={styles.wrap}>
            <p className={styles.eyebrow}>How it works</p>
            <h2 id="how-heading">Three steps. About two minutes.</h2>
            <div className={styles.howGrid}>
              {HOW_STEPS.map((step, i) => (
                <Reveal as="article" key={step.title} className={styles.howItem} index={i}>
                  <span className={styles.num} aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  {"picks" in step && (
                    <ul className={styles.picks} aria-label="Example answers">
                      {step.picks.map((pick) => (
                        <li key={pick.label} className={pick.on ? styles.on : ""}>
                          {pick.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.lesson} ${styles.sec}`} aria-labelledby="lesson-heading">
          <LessonTabs />
        </section>

        <section className={styles.sec} aria-labelledby="ember-heading">
          <div className={`${styles.wrap} ${styles.emberGrid}`}>
            <Reveal className={styles.demo} index={3}>
              <EmberDemo />
            </Reveal>
            <div>
              <p className={styles.eyebrow}>Meet Ember</p>
              <h2 id="ember-heading">A small flame that knows exactly where you are.</h2>
              <p className={styles.lede}>
                Ember reacts to your real progress, not a made up score. Master a technique and it cheers. Skip one and it shrugs. Go quiet for a week and nothing breaks.
              </p>
              <ul className={styles.nos}>
                {NOS.map((no) => (
                  <li key={no.word}>
                    <s>{no.word}</s>
                    <span>{no.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.final}>
          <svg className={`${styles.curl} ${styles.curlA}`} viewBox="0 0 200 200" fill="none" aria-hidden="true">
            {CURL}
          </svg>
          <svg className={`${styles.curl} ${styles.curlB}`} viewBox="0 0 200 200" fill="none" aria-hidden="true">
            {CURL}
          </svg>
          <div className={styles.wrap}>
            <h2>Pick one hobby. Start today.</h2>
            <p>Your roadmap is ready in about 20 seconds. Ember will be waiting.</p>
            <Link className={styles.btn} href={APP_ROUTE}>
              Start your roadmap {ARROW}
            </Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <span>
            <strong className={styles.footerBrand}>Whittle</strong> &nbsp;Learn one thing well.
          </span>
          <Link href={APP_ROUTE}>Try the live demo</Link>
        </div>
      </footer>
    </div>
  );
}
