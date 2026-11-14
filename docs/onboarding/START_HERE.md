# Start here — no GitHub experience needed

Hi! Scott has invited you to explore the **SplitIQ squat tool**, a 3D coaching model of
the high-bar back squat, and to try out your own ideas. You don't need to know GitHub or
how software teams work, and there's no single "right" way to do this. Use whatever
tools, AI models and habits suit you. This page suggests an easy route.

You can't break anything. You only have **read access**, so nothing you do can change
Scott's project.

---

## Step 1: get access (5 minutes)

1. **Make a GitHub account.** GitHub is the website where the project's code lives, a
   bit like Google Drive for code. Sign up free at <https://github.com/signup>, then
   **send Scott your username**.
2. **Accept the invitation.** Scott adds you, and GitHub emails you an invitation: click
   **Accept**. If the email doesn't arrive, open
   <https://github.com/skizzy1986/SplitIQ/invitations> while you're logged in.
3. **Have a play.** The tool is live at <https://erg-dashboard-eight.vercel.app/squat>.
   Drag the depth slider, spin the model and open the guide.

## Step 2: pick how you'd like to work

| | **Chat** (start here) | **Claude Code** (when you're ready) |
|---|---|---|
| What it is | Claude in your browser or the Claude app, as you already use it | Claude working directly on your computer: it runs the project, edits code and handles GitHub for you |
| Good for | Understanding how it works, talking through ideas, sketching new movements, drafting posts for Scott | Running the tool on your own machine, building prototypes, sharing code |
| Setup | Nothing to install | About 20 minutes, and Claude does most of it |

### Working in chat
1. In Claude, create a **Project** (for example "SplitIQ squat"). Paste the **Project
   instructions** from [`PROMPTS.md`](PROMPTS.md#chat) into its instructions. That
   gives every chat in the project the background and Scott's ground rules.
2. Give the project the code, so Claude can read it. Either connect the GitHub
   repository with Claude's GitHub integration (`skizzy1986/SplitIQ`), or copy
   the files you're curious about from GitHub into the chat. Start with
   `docs/onboarding/README.md`.
3. Chat. There are starter prompts in [`PROMPTS.md`](PROMPTS.md#chat): a tour, "how
   does this work?", "I've had an idea", and "sketch a new movement".
4. When you have something to share, ask Claude to draft it as a post and paste it into
   **Discussions** (see below).

### Trying Claude Code (whenever you fancy it)
Chat can read and explain the code, but it can't run the tool on your computer or change
it. When you want to build something and see it working, Claude Code is the easy next
step: it installs what's needed, downloads the project and starts it for you. Install it
from <https://claude.ai/download> (it needs a Claude plan that includes Claude Code),
open it in an empty folder, and paste the **setup prompt** from
[`PROMPTS.md`](PROMPTS.md#claude-code). Afterwards, type **`/collaborate`** inside the
project folder, and Claude will pick up the project's ground rules for you.

## How you and Scott talk

Discussions live at <https://github.com/skizzy1986/SplitIQ/discussions>. Post
there in your browser, or have Claude Code post for you.

| You want to… | Where |
|---|---|
| Suggest an idea, however rough | **💡 Ideas** (there's a form) |
| Show something you built | **🙌 Show and tell** |
| Ask a question | **🙏 Q&A** |
| Get your code into the real product | a **pull request** from your own copy (only if you and Scott both want it) |

## Words you'll hear (and what they mean)

| Word | Plain meaning |
|---|---|
| **Repository (repo)** | The project folder, with its full history, on GitHub. |
| **Clone** | Download a copy of the repo to your computer. |
| **Branch** | A separate line of changes, so you can experiment without touching the main version. |
| **Commit** | A saved snapshot of changes, with a note saying what changed. |
| **Fork** | Your own online copy of the repo, under your account. |
| **Pull request (PR)** | A proposal: "here are my changes, would you like them?" Scott reviews and decides. |
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
- The numbers in the model are **modelled estimates**, not measurements. Keep that
  label on anything you build.
- Don't repost anything personal about Scott, for example from the docs under
  `coach/`.

Welcome aboard, and have fun!
