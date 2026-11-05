# Prompts to get you going

These are **suggestions, not a script**. Use any model, tool or wording you like; Scott
just wants to hear what you come up with. Copy a prompt, paste it, and change the bits in
`<angle brackets>`.

- **[Chat](#chat)**: claude.ai or the Claude app, with nothing to install. Start here.
- **[Claude Code](#claude-code)**: for running and changing the tool on your own
  computer, whenever you want to try it.

New to all this? Read [`START_HERE.md`](START_HERE.md) first.

---

## Chat

### Project instructions (paste once)

Create a Project in Claude (for example "SplitIQ squat") and paste this into its
instructions. Every chat in that project then starts with the background and Scott's
ground rules.

```text
I'm exploring my friend Scott's SplitIQ project as an invited, read-only collaborator. I'm an interested hobbyist, not a professional developer, and I'm new to GitHub.

The project: github.com/skizzy1986/erg-dashboard (private). I'm focused on the public /squat tool, a 3D coaching model of the high-bar back squat (live at https://erg-dashboard-eight.vercel.app/squat). It's built with React and three.js. The posing maths is in web/src/anatomy/, the squat UI and coaching content are in web/src/squat/, and the docs are in docs/onboarding/ and docs/squat/. Ideas for future movements are welcome: see docs/onboarding/NEW_MOVEMENT.md.

How to help me:
- Explain things in plain words, define jargon the first time, and go one step at a time. I learn by asking questions, so encourage them.
- Don't push me towards any particular tool or process. If something genuinely needs code running on my computer, you can mention Claude Code as an option.
- When I have an idea, help me shape it into a post for Scott's GitHub Discussions ("Ideas" category) with these headings: Area · Problem or opportunity · The idea · Who it's for · Rough size (small / medium / large / not sure) · Prototype link (if any). Then add a short "If this became an issue" section: a title starting "When this ships, a user can…" and 2–5 checkable acceptance criteria. Scott can then act on it straight away.
- For a new movement, help me sketch: phases, key joints and readouts, muscles that matter, equipment, coaching cues, common faults, and credible public sources. Say which parts would need Scott's separate data pipeline (new 3D geometry) and which don't.

Ground rules:
- What I can do with the code and assets is in PERMISSIONS.md in the repo. If I'm named there, I can reuse and publish them in my own personal, non-commercial projects, and I check with Scott before anything commercial.
- The 3D anatomy data comes from BodyParts3D under CC BY-SA 2.1 JP. Anything published using it, or a model made from it, must credit BodyParts3D and use the same licence.
- The model's numbers are modelled estimates, not measurements. Keep that label on anything I make.
- Don't repeat or publish Scott's personal training notes (coach/ and the personal parts of CLAUDE.md).
- Don't make up facts about the code. If you can't see a file, ask me to paste it or connect the repo.
```

### Starter prompts for chat

**A quick tour**
```text
I've opened the squat tool at https://erg-dashboard-eight.vercel.app/squat. Give me a short guided tour of what it shows and how it's built, a chapter at a time. Start with what a coach or athlete would use it for, then how it works under the hood. Check I'm following at the end of each chapter.
```

**How does this work?**
```text
Explain how <topic, e.g. "the model bends at different squat depths", "the muscles get coloured", "the data gets loaded"> works in this project. Use the real files if you can see them; if not, tell me which file to paste in. Keep it plain and give me one thing to look at or try.
```

**I've had an idea**
```text
I've had an idea: <your idea in a sentence or two>. Help me think it through: who it helps, what it would change, and roughly how big it is. Then draft it as an Ideas post for Scott in the format from the project instructions, ready for me to paste into GitHub Discussions.
```

**Sketch a new movement**
```text
Let's sketch how a <e.g. "conventional deadlift", "front squat", "walking lunge"> could work in this tool: phases, key joints and readouts, muscles that matter, equipment, coaching cues, common faults, and credible public sources. Say what needs Scott's data pipeline and what doesn't, then draft it as an Ideas post.
```

**Should I try Claude Code?**
```text
I've been using chat to explore this project. In plain words, what could I do with Claude Code that I can't do here, and what would setting it up involve? No pressure; help me decide if it's worth it for what I want to try.
```

---

## Claude Code

For when you want to run the tool on your own computer and build things. **Prompt 1**
runs before the project is on your computer. For all the others, open Claude Code
**inside the `erg-dashboard` folder**, so it picks up the project and its `/collaborate`
mode.

### 1. Setup — run once, in an empty folder

```text
I'm new to GitHub and software development. My friend Scott has invited me (read-only)
to his private GitHub repository skizzy1986/erg-dashboard so I can explore and
prototype on his 3D squat coaching tool. Please set everything up for me, one step at a
time, explaining each step in plain words before you do it and asking before you
install anything:

1. Check which operating system I'm on. Then check for Git, Node.js 22 (or newer LTS)
   and the GitHub CLI ("gh"), and install whichever are missing using the official
   installer or my OS's normal package manager.
2. Log me in to GitHub with "gh auth login" (GitHub.com, HTTPS, log in with a web
   browser) and tell me exactly what to click in the browser.
3. Download the project with "gh repo clone skizzy1986/erg-dashboard". If it says
   "not found", I probably haven't accepted Scott's invitation yet. Tell me to check my
   email or https://github.com/skizzy1986/erg-dashboard/invitations, then try again.
4. In erg-dashboard/web run "npm ci", then start it with "npm run dev". No keys or
   accounts are needed for the squat tool.
5. Tell me to open http://localhost:5173/squat and check it works.
6. Finish by telling me how to stop and restart it, and that next time I should open
   Claude Code inside the erg-dashboard folder and type /collaborate.

Never push anything to Scott's repository.
```

---

### 2. Guided tour

```text
/collaborate tour
I've got the squat tool running. Give me a guided tour of how it works, a short chapter
at a time, while I click around localhost:5173/squat. Start with what the tool shows a
coach or athlete, then how it's built. Use plain words and ask me a question at the end
of each chapter to check I'm following.
```

### 3. "How does this work?"

```text
/collaborate learn <topic — e.g. "how the 3D model bends at each depth", "how the tests
work", "what CI checks and why", "how Scott's agent pipeline is staged">
Teach me this with the real files open and one small hands-on experiment on an explore/
branch that I can see in the browser. Keep it plain and tell me what to try next.
```

### 4. I've had an idea

```text
/collaborate idea <your idea in a sentence or two>
Help me think it through: who it helps, what it would change in the tool, and roughly
how big it is. Then draft it as a post for Scott's Ideas discussion, including the "If
this became an issue" section so he can act on it straight away. Show me the draft
before posting anything.
```

### 5. Let's try building it

```text
/collaborate prototype <the idea>
Make a small working prototype on a new explore/ branch so I can see it in the browser.
Follow the project's code style, explain each change and each commit in plain words,
and run the relevant tests before telling me it's done. Don't push anything yet.
```

### 6. Show Scott what I built

```text
/collaborate share
I'd like Scott to see my prototype on this branch. Explain my options (screenshots
only, or code too). If I want code, set up my own fork and put the branch there, never
on Scott's repository. Then draft a Show and tell post with the link, what I learned,
and what it would take to ship. Ask before posting or pushing anything.
```

### 7. Sketch a new movement

```text
/collaborate new movement <e.g. "conventional deadlift", "front squat", "walking lunge">
Help me sketch this movement the way the squat tool would need it: phases, key joints
and readouts, muscles that matter, equipment, coaching cues, common faults, and credible
public sources. Tell me which parts need Scott's data pipeline and which I could
prototype now. Then draft it as an Ideas post for Scott.
```

### 8. I'm stuck

```text
Something isn't working. Here's what I see: <paste the error or describe it>.
Explain what's going on in plain words and fix it step by step. If it's something in
Scott's project rather than my setup, help me write it up as a Q&A post for him.
```

### 9. Wrap up the session

```text
/collaborate wrap up
Summarise what I learned, what I tried, and any ideas worth sending to Scott (offer to
post any I haven't shared). Also list anything in the project or these docs that
confused me, so Scott can improve the onboarding.
```

---

**Tip:** you don't need these exact words. Once you've typed `/collaborate`, Claude knows
the ground rules, so you can just say what you want.
