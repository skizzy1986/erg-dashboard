# Start here — no GitHub experience needed

Hi! Scott has invited you to explore the **SplitIQ squat tool**: a 3D coaching model of
the high-bar back squat. You don't need to know GitHub or how software teams work. An AI
agent (**Claude Code**) does the technical steps for you and explains them as it goes.
This page gets you from nothing to the tool running on your computer.

You can't break anything. You only have **read access**: nothing you do on your computer
can change Scott's project. Everything you try happens on your own copy.

---

## The five steps

### 1. Make a GitHub account (5 min)
GitHub is the website where the project's code lives, a bit like Google Drive for code.
Sign up free at <https://github.com/signup>, then **send Scott your username**.

### 2. Accept Scott's invitation (1 min)
Scott adds you to the project, and GitHub emails you an invitation. Click **Accept**.
If the email doesn't arrive, open
<https://github.com/skizzy1986/erg-dashboard/invitations> while you're logged in.

### 3. Install Claude Code (10 min)
Claude Code is Claude working directly on your computer: it can run commands, read and
edit files, and use GitHub for you. It needs a Claude subscription that includes Claude
Code. Install it from <https://claude.ai/download> (it's in the Claude desktop app), or
follow the guide at <https://code.claude.com/docs>.

### 4. Paste the setup prompt (15–20 min, mostly waiting)
Open Claude Code in an empty folder where you want the project to live, for example
`Documents/splitiq`. Paste **Prompt 1** from [`PROMPTS.md`](PROMPTS.md). Claude will:
1. install a few free tools (Git, Node.js, and the GitHub command-line tool) if you
   don't have them;
2. log you in to GitHub (a browser window opens; click **Authorize**);
3. download the project and start the squat tool.

Approve each step when Claude asks. If anything fails, tell Claude what you see, and it
will sort it out.

### 5. Open the tool
Claude will tell you when it's running. Open <http://localhost:5173/squat> in your
browser, drag the depth slider, and spin the model around.

---

## After that

Open Claude Code **inside the project folder** (`erg-dashboard`) and type
**`/collaborate`**. That switches Claude into *collaborator mode*: it knows the project,
Scott's ground rules, and how to share your ideas with him in a form he can use straight
away. Then try the prompts in [`PROMPTS.md`](PROMPTS.md): a guided tour, "how does this
work?", turning an idea into a post for Scott, building a prototype, and sketching a new
movement.

You have your own way of doing things, so use as much or as little of this as you like.

## How you and Scott talk

| You want to… | Where | Claude can… |
|---|---|---|
| Suggest an idea, however rough | **Discussions → 💡 Ideas** | draft it and post it with your OK |
| Show something you built | **Discussions → 🙌 Show and tell** | put your code online in your own copy (a "fork") and post the link |
| Ask a question | **Discussions → 🙏 Q&A** | write it up |
| Get your code into the real product | a **pull request** from your fork | prepare it (only if you and Scott both want it) |

Discussions live at <https://github.com/skizzy1986/erg-dashboard/discussions>.

## Words you'll hear (and what they mean)

| Word | Plain meaning |
|---|---|
| **Repository (repo)** | The project folder, with its full history, on GitHub. |
| **Clone** | Download a copy of the repo to your computer. |
| **Branch** | A separate line of changes, so you can experiment without touching the main version. Yours will be called `explore/something`. |
| **Commit** | A saved snapshot of your changes, with a note saying what changed. |
| **Fork** | Your own online copy of the repo, under your account. It's where your experiments go when you want to show them. |
| **Pull request (PR)** | A proposal: "here are my changes, would you like them in the real project?" Scott reviews and decides. |
| **CI** | Automatic checks (tests, style, build) that run on every proposal. |
| **Discussion** | A forum thread on GitHub. It's where ideas and questions go. |
| **`main`** | The official version of the project. You never change it directly. |

## Ground rules (short version)

- **What you can do with it** is written down in [`PERMISSIONS.md`](../../PERMISSIONS.md).
  If Scott has named you there, you can reuse the code and assets in your own projects
  and publish them, as long as they're personal and non-commercial. Ask Scott before
  making money from anything. If you're not named there, explore and prototype freely,
  but ask before publishing.
- The 3D anatomy data comes from BodyParts3D under a "share-alike" licence. If you
  publish it, or a 3D model made from it, credit BodyParts3D and use the same licence.
  Claude knows the details.
- The numbers in the model are **modelled estimates**, not measurements. Keep that label
  on anything you build.
- If you're unsure, ask in Q&A, or just ask Claude.

Welcome aboard, and have fun!
