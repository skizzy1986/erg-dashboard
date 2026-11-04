# Prompts for your Claude Code sessions

Copy a prompt, paste it into Claude Code, and adjust the bits in `<angle brackets>`.
**Prompt 1** runs before the project is on your computer. For all the others, open
Claude Code **inside the `erg-dashboard` folder** so it can see the project and Scott's
ground rules.

New to all this? Read [`START_HERE.md`](START_HERE.md) first.

---

## 1. Setup — run once, in an empty folder

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

## 2. Guided tour

```text
/collaborate tour
I've got the squat tool running. Give me a guided tour of how it works, a short chapter
at a time, while I click around localhost:5173/squat. Start with what the tool shows a
coach or athlete, then how it's built. Use plain words and ask me a question at the end
of each chapter to check I'm following.
```

## 3. "How does this work?"

```text
/collaborate learn <topic — e.g. "how the 3D model bends at each depth", "how the tests
work", "what CI checks and why", "how Scott's agent pipeline is staged">
Teach me this with the real files open and one small hands-on experiment on an explore/
branch that I can see in the browser. Keep it plain and tell me what to try next.
```

## 4. I've had an idea

```text
/collaborate idea <your idea in a sentence or two>
Help me think it through: who it helps, what it would change in the tool, and roughly
how big it is. Then draft it as a post for Scott's Ideas discussion, including the "If
this became an issue" section so he can act on it straight away. Show me the draft
before posting anything.
```

## 5. Let's try building it

```text
/collaborate prototype <the idea>
Make a small working prototype on a new explore/ branch so I can see it in the browser.
Follow the project's code style, explain each change and each commit in plain words,
and run the relevant tests before telling me it's done. Don't push anything yet.
```

## 6. Show Scott what I built

```text
/collaborate share
I'd like Scott to see my prototype on this branch. Explain my options (screenshots
only, or code too). If I want code, set up my own fork and put the branch there, never
on Scott's repository. Then draft a Show and tell post with the link, what I learned,
and what it would take to ship. Ask before posting or pushing anything.
```

## 7. Sketch a new movement

```text
/collaborate new movement <e.g. "conventional deadlift", "front squat", "walking lunge">
Help me sketch this movement the way the squat tool would need it: phases, key joints
and readouts, muscles that matter, equipment, coaching cues, common faults, and credible
public sources. Tell me which parts need Scott's data pipeline and which I could
prototype now. Then draft it as an Ideas post for Scott.
```

## 8. I'm stuck

```text
Something isn't working. Here's what I see: <paste the error or describe it>.
Explain what's going on in plain words and fix it step by step. If it's something in
Scott's project rather than my setup, help me write it up as a Q&A post for him.
```

## 9. Wrap up the session

```text
/collaborate wrap up
Summarise what I learned, what I tried, and any ideas worth sending to Scott (offer to
post any I haven't shared). Also list anything in the project or these docs that
confused me, so Scott can improve the onboarding.
```

---

**Tip:** you don't need these exact words. Once you've typed `/collaborate`, Claude knows
the ground rules, so you can just say what you want.
