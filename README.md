# mahipat303.github.io

A portfolio. As a video game. Because apparently a bullet-pointed PDF was too
relaxing for everyone involved.

🎮 **Play it:** [mahipat303.github.io](https://mahipat303.github.io)

---

## What is this

This is a side-scrolling pixel platformer where the protagonist is, regrettably,
me. You run right, jump on things, bump question-mark blocks, collect coins,
and — incidentally — learn what I do for a living.

It is not endorsed by Nintendo. They have not called. I am at peace with this.

## Controls

| Key | What it does | Recruiter translation |
|---|---|---|
| `←` / `→` (or `A` / `D`) | Move | "Mobility" |
| `Space` (or `W`) | Jump | "Vertical agility" |
| `↓` (or `S`) on a pipe | Enter section | "Multi-channel navigation" |
| `P` | Pause | "Work-life balance" |
| `M` | Mute the chip-tune | "Conflict resolution" |
| `Esc` | Close a panel | "Setting boundaries" |

Mobile: tap the chunky on-screen buttons. Yes they're big on purpose. No I will
not apologise for that.

## How to read this portfolio

1. Bump every `?` block. Each one is a section: About, Skills, Projects,
   Experience, Education, Achievements, Contact.
2. Collect coins. Each coin reveals one skill. There are 38 of them, which is
   either impressive or concerning depending on your worldview.
3. Reach the flag on the right side of the level. Walk into it. That triggers
   the win screen, where I shamelessly invite you to email me.
4. If you die, please do not take it personally. The pit was visible.

## What's actually in here

```
.
├── index.html          # the whole game UI + the section content (it's all inlined, judge me)
├── game.js             # ~1100 lines of platformer physics, pixel sprites,
│                       # tile rendering, coin/skill toasts, panel handling,
│                       # and a chip-tune synth that runs entirely on the
│                       # WebAudio API because shipping mp3s felt rude
├── face.png            # 32x32 head crop of me. Mirrored when I walk left.
│                       # Yes, the body is still pixel art. Don't think about
│                       # it too hard.
└── README.md           # you are here
```

No build step. No framework. No npm install that downloads 1,400 packages so I
can render a button. Just open `index.html`. Deeply unfashionable. I sleep
fine.

## Tech (a.k.a. the bragging section)

- **HTML5 Canvas** for rendering, because WebGL felt like overkill for a
  character that's literally 14 pixels wide
- **Vanilla JS** — no React, no Vue, no Svelte, no build tooling. Just a
  `<script>` tag and some opinions
- **WebAudio API** for synth SFX (jump beep, coin sparkle, mute toggle) so the
  whole thing is one HTML + one JS file
- **`Press Start 2P` + `VT323`** Google Fonts, the only two fonts permitted
  inside the retro-game cinematic universe
- **`position: fixed` + `env(safe-area-inset-*)`** on the touch controls so
  iPhone notches don't eat the JUMP button
- **A canvas "cover" fit on portrait mobile** so the screen isn't 80% sky
- **Image overlay trick** — the body is a hand-drawn pixel sprite, the head is
  a downscaled photo of me drawn on top each frame. Cursed but charming.

## Sections of my actual career, but lightly disguised as game elements

- **Final Boss**: A two-layer privacy framework that lets enterprises use
  public LLMs (Claude / GPT / Gemini) on proprietary code without leaking it.
  Layer 1 masks file reads with consistent pseudonyms. Layer 2 is an
  independent mitmproxy guardrail that fail-closes if anything slips. 74 Java
  files tested, 4,062 replacements, 0 leaks. Vault is reversible locally only.
- **Quest 1**: Tricentis Tosca connector for Roche (flagship FY23-24).
- **Quest 2**: ~6× faster Mastercard sync via DB query optimization.
- **Quest 3**: Rally API caching, 1,200 calls per cycle → 1.
- **Side quests**: SDK extensions, Jira/ADO/Jama integrations, a same-day DNG
  hotfix that unblocked a customer call.

Full details inside the game. Bump the blocks.

## Why a game

Because a portfolio that nobody finishes reading is just a Word doc you didn't
print. A game that takes 90 seconds gets played, gets remembered, and gets
talked about. Worst case, you bounce after the title screen and we both move
on with our lives.

Also it was fun to build. I will not be apologising for that either.

## Backup

The previous, more reasonable, fully-respectable portfolio still exists on the
`backup/old-portfolio` branch and the `v1-old-portfolio` tag. If you'd like to
see what this site looked like before I decided to do a bit, that is where it
lives.

## Contact

- Email: memahipat303@gmail.com
- LinkedIn: [linkedin.com/in/mahipatparmar-a10765213](https://www.linkedin.com/in/mahipatparmar-a10765213)
- Portfolio: [mahipat303.github.io](https://mahipat303.github.io)
- Phone: +91 70698 29127

If you're a recruiter and you played all the way to the end flag, I owe you a
coffee and a non-sarcastic conversation. Promise.
