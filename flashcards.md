# Flashcards

Plain-markdown flashcards. The course assistant appends each lesson's cards here when the lesson is generated; you do not copy anything. The weekly recall warm-up (Day 1, 10 minutes) uses 5 cards from lessons 1, 2 and 4 weeks earlier; you (or the Cursor agent, on request: "quiz me from flashcards.md, lessons X-Y") pick them.

Format: one card = two lines.

```
Q: <question>
A: <answer, one or two sentences>
```

Rules:
- Answer from memory before you look.
- Mark cards you got wrong with `[ ]` in front of `Q:`; remove the mark when you get them right twice.
- Do not rewrite cards to make them easier; split them instead.

What a card must be:
- A question an interviewer for an SDET role could ask, or something you need in daily work without looking it up. Phrase it the way it would be asked: "What is the difference...", "Why...", "When would you...", "Your test fails with X. What is the cause?".
- The answer is what you would say aloud: the core fact plus the reason, in one or two sentences.
- One question per card. No facts about this course or repo, no lookup trivia, nothing that ruff or the formatter fixes for you.

---

## Module 0

### 0.0 Module 0 briefing

```
Q: Two python3 executables are installed. How does the shell decide which one runs?
A: It searches the folders in PATH from left to right and runs the first match; `which -a python3` lists all candidates in that order.
Q: A test passes on your laptop but fails in CI with an import or version error. What do you check first?
A: The environment, not the code: which interpreter and tool versions ran in CI and whether they were installed from the same lockfile.
```

### 0.1 Terminal fundamentals in iTerm2 + zsh (gap-filling)

```
Q: How does a CI job know that a command failed?
A: From its exit code: 0 means success, anything else is a failure. In the shell the last exit code is in $?.
Q: What is the difference between stdout and stderr?
A: stdout carries normal output, stderr carries errors and diagnostics. They are separate streams, so `cmd > out.log` still prints errors to the terminal.
Q: You run `cmd 2>&1 > out.log` and errors still appear on the screen. Why?
A: Redirections apply left to right: stderr was pointed at the terminal before stdout moved to the file. Write `cmd > out.log 2>&1`.
Q: Why does `cmd | grep error` miss some error messages?
A: A pipe passes only stdout; messages on stderr bypass it. Use `cmd 2>&1 | grep error`.
Q: What is the difference between `VAR=1 cmd` and `export VAR=1`?
A: The first sets VAR only for that one command; export sets it for the current shell and every process started from it later.
Q: pytest exits with code 5 in CI. What happened?
A: No tests were collected: a wrong path, wrong file names or a filter that matched nothing. It is a configuration problem, not a failing test.
```

### 0.2 zsh startup files and PATH

```
Q: In which order does zsh read its startup files when you open a new terminal tab?
A: .zshenv -> .zprofile -> .zshrc -> .zlogin (interactive login shell); at each step the system file in /etc runs before yours.
Q: Where do PATH additions belong on macOS, and why not earlier?
A: In ~/.zprofile, because /etc/zprofile runs path_helper first, which rebuilds PATH with system folders in front.
Q: A tool works in your terminal but a script says "command not found". What is a likely cause?
A: The PATH change or alias is in ~/.zshrc, which only interactive shells read; non-interactive scripts read only .zshenv.
Q: Why can `source ~/.zshrc` leave duplicates in PATH, and what is the clean way to reload?
A: It re-runs the file in the same shell, so every PATH prepend runs again. `exec zsh` starts a fresh shell; `typeset -U path` keeps PATH unique.
```

### 0.3 Oh My Zsh

```
Q: Why must scripts and CI jobs not use aliases like gst or gp?
A: Aliases come from ~/.zshrc, which non-interactive shells do not read, and other machines do not have them. Scripts use full commands such as git push.
```

### 0.4 Xcode Command Line Tools, Homebrew and Brewfile

```
Q: What is the difference between a Homebrew formula and a cask?
A: A formula is a command-line package (git, gh); a cask installs a macOS app bundle (iTerm2, Docker Desktop).
Q: What is the difference between brew update and brew upgrade?
A: update refreshes Homebrew's package index; upgrade installs newer versions of the packages you have.
Q: Why should project virtual environments not be built from Homebrew's python3?
A: Homebrew's Python is a dependency of other formulas, so brew upgrade can replace it and break every venv created from it. Projects use a pinned interpreter per project (uv).
Q: How do you make your developer tool set reproducible on a new Mac?
A: Keep a Brewfile: brew bundle dump --file=~/Brewfile writes it, brew bundle install --file=~/Brewfile installs from it on the new machine.
```

### 0.5 git for daily PR work

```
Q: Merge or rebase: which do you use and when?
A: I rebase my own branch onto main for a linear history and squash fix-ups before review; I merge shared branches, because rebase rewrites commits that others already have.
Q: What does rebase actually do to your commits?
A: It re-applies them one by one on top of the new base, so they become new commits with new SHAs.
Q: What does --force-with-lease protect against?
A: Overwriting someone else's push: it refuses to push if the remote branch moved since your last fetch, unlike --force.
Q: A rebase went wrong and your commits seem lost. How do you get them back?
A: git reflog lists every position HEAD had; find the entry from before the rebase and reset the branch to it.
Q: Squash merge vs rebase merge on GitHub?
A: Squash merge makes one commit per PR (simplest history); rebase merge puts your cleaned-up commits on main one by one.
Q: How do you fix a mistake in an earlier commit of your PR without adding a "fix typo" commit?
A: git commit --fixup <sha>, then git rebase -i --autosquash <base>; the fix is folded into the original commit.
Q: What does a Conventional Commits message look like?
A: type(scope): imperative subject, for example "fix(api): retry on 503"; one logical change per commit.
Q: Where do .DS_Store and .idea/ belong in ignore rules?
A: In your global ignore file (core.excludesFile), because they come from your machine and editor, not from the project.
```

### 0.6 The learning repo

```
Q: Why does git not track an empty folder?
A: Git stores files, not directories; add a placeholder such as .gitkeep if the folder must exist.
Q: Why commit .env.example but never .env, and how does .gitignore express it?
A: .env holds real secrets for one machine; .env.example documents the variables with fake values. Ignore .env and .env.*, then re-include the template with !.env.example.
```

### 0.7 Python on macOS with uv

```
Q: Why not use the system /usr/bin/python3 for project work?
A: It is Apple's stub for the Command Line Tools Python: an old version that you do not control and that a CLT update can change.
Q: What does the "externally-managed-environment" error from pip mean?
A: PEP 668: this interpreter belongs to the OS or a package manager, so pip refuses to install into it. Create a virtual environment for the project.
Q: How do you pin the Python version of a project with uv?
A: uv python pin 3.14 writes .python-version; uv run, uv sync and new venvs then use that version.
Q: How do you prove which interpreter ran a script or a test?
A: Print sys.executable from inside it; `which python` only shows what your shell would run.
Q: How do you choose the Python version for a new project?
A: The newest stable release that your key libraries ship wheels for and your CI image supports; a .0 release that is days old usually fails that test.
```

### 0.8 venv

```
Q: What is a virtual environment and what problem does it solve?
A: A folder with its own site-packages linked to a base interpreter, so each project has its own dependency versions without touching the system Python.
Q: What does `source .venv/bin/activate` actually change?
A: Only your current shell: it prepends .venv/bin to PATH, sets VIRTUAL_ENV and changes the prompt. Nothing is installed.
Q: After a Python upgrade, your venv fails because bin/python no longer exists. Why?
A: bin/python is a symlink to the base interpreter, which was removed or replaced. Delete the venv and recreate it.
Q: Can you copy a venv to another folder or machine?
A: No: paths inside it are absolute and it is tied to one base interpreter. Recreate it from the project files instead.
```

### 0.9 pip in depth

```
Q: What is the difference between pip freeze and pip list?
A: freeze prints every installed package as pkg==version for files; list is a readable table (with --outdated it shows available updates).
Q: What does the version specifier ~=2.32 allow?
A: >=2.32 and <3.0: the last given part may increase (compatible release).
Q: What does pip install -e . do and when do you use it?
A: It installs your project in editable mode, linked to the source folder, so code changes apply without reinstalling. You use it while developing a package together with its tests.
Q: What is the difference between a constraints file (-c) and a requirements file (-r)?
A: -r says "install these"; -c only limits versions of packages that get installed for another reason.
Q: How do you check that installed packages are consistent with each other?
A: pip check: it verifies the declared dependencies and exits non-zero on conflicts, for example after installing packages in separate commands.
Q: Why is pip freeze not a real lockfile?
A: It is a snapshot of one machine taken after installing: no hashes, no markers for other platforms, and direct and transitive dependencies are mixed.
```

### 0.10 Lab

```
Q: Walk me through how you debug a failure.
A: Reproduce -> isolate -> one hypothesis -> check one thing -> fix -> regression test -> a 3-line RCA.
Q: What are the three lines of a short RCA?
A: Symptom (what was observed), root cause (the mechanism), fix (what changed plus the regression test). The cause must explain the symptom, not repeat it.
Q: pip fails with ResolutionImpossible. What does it mean?
A: No set of versions satisfies all requirements together; pip names the conflicting packages and installs nothing.
Q: Why do scripts and CI call .venv/bin/python directly instead of activating the venv?
A: It does not depend on shell state, so it works the same in CI, in cron and for anyone who clones the repo.
```

### 0.11 uv projects

```
Q: How do you keep local and CI environments identical in a Python project?
A: Declare dependencies in pyproject.toml, commit the lockfile and install in CI with uv sync --locked; upgrades happen on purpose, never implicitly.
Q: What is a lockfile and should it be committed?
A: A generated file with exact versions and hashes of all dependencies, including transitive ones, for every platform. Yes, commit it and never edit it by hand.
Q: What happens in CI when uv.lock is stale, and is that good?
A: uv sync --locked fails. That is the point: CI must not resolve different versions than the ones you reviewed.
Q: What is the difference between uv sync --locked and --frozen?
A: --locked fails if the lock no longer matches pyproject.toml; --frozen installs from the lock as it is, without checking.
Q: What is the difference between uv add and uv pip install?
A: uv add updates pyproject.toml, the lock and the venv; uv pip install only changes the venv, and the next uv sync removes it.
Q: Where do runtime and developer dependencies go in pyproject.toml?
A: Runtime ones in [project].dependencies; tools only developers and CI need (pytest, ruff, mypy) in [dependency-groups] dev.
Q: A transitive dependency has a security fix. How do you take it in?
A: uv lock --upgrade-package <pkg>, review the uv.lock diff, uv sync, run the tests.
Q: What should CI cache in a uv project?
A: The folder printed by uv cache dir, so packages are not downloaded on every run.
```

### 0.12 Poetry at reading level; pip vs uv vs Poetry side by side

```
Q: Why would you choose uv over Poetry for a new framework?
A: uv also installs and pins the Python interpreter, and it is one fast binary that works the same on the laptop, in CI and in Docker with uv sync --locked.
Q: What does ^0.28 mean in a Poetry project?
A: >=0.28,<0.29: the caret allows updates up to the next significant version. It is Poetry syntax, not PEP 440.
Q: In a Poetry project, what are the lockfile and the command to run tools?
A: poetry.lock and poetry run <cmd>.
```

### 0.13 Module 0 wrap-up

```
Q: Which files make a Python project reproducible, and what does each pin?
A: .python-version (interpreter), pyproject.toml (declared dependencies and ranges), uv.lock (exact resolved versions for every platform).
Q: What is a quality gate, and what do pytest, ruff and mypy each check?
A: One command that must pass before merging: pytest checks behaviour, ruff style and lint, mypy types. CI runs the same command on every push.
```

## Module 1

### 1.0 Module 1 briefing

```
Q: What belongs in a shared helper package and what stays in the project's test suite?
A: Generic helpers (URL building, retry, logging, config) go to the package; code for one application (its endpoints, its test data) stays in the project.
```

### 1.1 First module, first pytest test

```
Q: What does `if __name__ == "__main__":` do?
A: The block runs only when the file is executed directly, not when it is imported, so a module can be both a library and a script.
Q: How does pytest find tests by default?
A: Files test_*.py or *_test.py, functions starting with test_, and Test* classes without __init__.
Q: Your new test does not run. What is your first step?
A: pytest --collect-only -q: it shows what pytest discovers and exposes wrong names, paths or import errors.
Q: Why can you use a plain assert in pytest and still get a useful failure message?
A: pytest rewrites assert statements and shows the values on both sides of the comparison.
Q: Why does `assert (x == 1, "msg")` never fail?
A: It asserts a non-empty tuple, which is always truthy.
Q: Tests fail with ModuleNotFoundError for code in src/. What is one fix?
A: Add pythonpath = ["src"] to [tool.pytest.ini_options], or install the project in editable mode.
```

### 1.2 Numbers, strings and f-strings

```
Q: Why does `name.strip()` on its own line change nothing?
A: Strings are immutable; strip() returns a new string that you must assign or use.
Q: What is the difference between "a  b".split() and "a  b".split(" ")?
A: split() splits on any run of whitespace and drops empty parts -> ['a', 'b']; split(" ") splits on every single space -> ['a', '', 'b'].
Q: How should a test compare two floats?
A: With a tolerance (math.isclose or pytest.approx), never ==, because floats are binary approximations: 0.1 + 0.2 != 0.3.
Q: What does round(2.5) return, and why?
A: 2: Python rounds halves to the nearest even number (banker's rounding).
Q: Why use {x!r} in log and assertion messages?
A: It inserts repr(x) with quotes and escapes, so you can tell None from "None" and see trailing spaces.
Q: How do you format a number right-aligned in 8 characters with one decimal?
A: f"{value:>8.1f}"
Q: Does "abcdef"[:100] raise IndexError?
A: No: slices are clipped to the sequence bounds, so it returns "abcdef". Only indexing (s[100]) raises.
```

### 1.3 Collections: list, tuple, dict, set

```
Q: What does b = a do when a is a list?
A: It binds a second name to the same object; a change made through b is visible through a.
Q: Does Python pass arguments by value or by reference?
A: Neither: it passes references to objects. A function can mutate a mutable argument, but rebinding the parameter does not affect the caller.
Q: What is the difference between a shallow and a deep copy?
A: A shallow copy (list(a), dict(d), a[:]) copies the container but shares nested objects; copy.deepcopy copies everything recursively.
Q: What is the difference between is and ==?
A: == compares values; is compares identity (the same object). Use is for None, True, False.
Q: Why is a tuple hashable and a list not?
A: A dict key's hash must never change; a list can change, a tuple of immutable items cannot.
Q: Why does += change a list in place but create a new tuple?
A: Lists implement in-place addition; tuples are immutable, so += builds a new tuple and rebinds the name.
Q: A fixture returns a dict, one test mutates it, and the next test fails. What is the root cause and the fix?
A: Aliasing: the tests share one object. Fix: build a fresh object per test (function scope), return a deep copy, or make the data immutable.
Q: What does lst.sort() return?
A: None, because it sorts in place; sorted(lst) returns a new list.
Q: How do you write an empty set?
A: set(); {} is an empty dict.
Q: What does dict.setdefault(k, []) do?
A: Returns d[k] if it exists; otherwise inserts [] under k and returns it. Typical use: grouping items into lists.
```

### 1.4 Control flow and comprehensions

```
Q: Which values are falsy in Python?
A: False, None, zero of any number type (0, 0.0) and empty strings or containers ("", [], (), {}, set()). Everything else is truthy, including "False" and [0].
Q: When is `if not count:` a bug?
A: When 0 is a valid value; use `count is None` to check for absence.
Q: What is the pitfall of `value = x or default`?
A: It returns default for every falsy x, so legal values like "" or 0 are replaced.
Q: When does the else block of a for loop run?
A: Only when the loop ended without break.
Q: What does zip do with lists of different lengths?
A: It stops at the shortest one without any error; zip(a, b, strict=True) raises ValueError instead.
Q: When should a comprehension be a normal loop?
A: When it has side effects, or more than one for plus one if, so you have to read it twice.
Q: Why prefer `for item in items` over `for i in range(len(items))`?
A: It states the intent and cannot go out of range; use range or enumerate only when you need the index.
```

### 1.5 Functions I

```
Q: Why is `def f(items=[])` a bug?
A: The default list is created once, when the function is defined, and shared by every call that omits the argument, so state leaks between calls.
Q: How do you fix a mutable default argument?
A: Use items=None in the signature and `if items is None: items = []` in the body.
Q: Why `is None` and not `not items` in that fix?
A: An empty list passed on purpose is falsy too; `is None` only triggers when the argument was omitted.
Q: Is there a legitimate use of a mutable default?
A: A deliberate cache shared between calls; it is rare and must be documented.
Q: What does LEGB mean?
A: The name lookup order: Local -> Enclosing -> Global -> Built-ins. An assignment inside a function makes the name local.
Q: `count = 0` at module level and `def bump(): count += 1`. What happens on bump()?
A: UnboundLocalError: += makes count local to the whole function, and it is read before it is assigned.
Q: Why pass boolean and optional arguments by keyword?
A: build_url(b, p, None, True) is unreadable; keywords document intent and survive parameter reordering.
```

### 1.6 PEP 8 in practice

```
Q: Why avoid `from module import *`?
A: The reader cannot see where names come from, names can silently shadow each other, and linters cannot detect unused ones.
Q: What is the default maximum line length in PEP 8 and in ruff?
A: PEP 8: 79 (72 for docstrings and comments); ruff and Black: 88. The team sets one value in pyproject.toml.
Q: What is the idiomatic way to check that a list is not empty?
A: `if items:`, because empty containers are falsy; not `if len(items) > 0:`.
Q: What should a code comment explain?
A: Why the code does something; the code itself already says what it does.
```

### 1.7 Docstrings, readability, ruff rule groups

```
Q: What does a good one-line docstring look like (PEP 257)?
A: Triple double quotes and one imperative sentence ending with a period, for example """Return the full URL.""".
Q: What belongs in a docstring beyond the first line?
A: Only what the signature cannot say: edge cases (what None means), side effects or their absence, and decisions with their reasons.
Q: Which ruff rule group finds real bugs rather than style issues?
A: F (Pyflakes): unused imports and variables, undefined names, import *.
Q: What do the ruff groups E/W, I, N and D check?
A: E/W layout (pycodestyle), I import order (isort), N naming (pep8-naming), D docstrings (pydocstyle).
```

### 1.8 Functions II

```
Q: What are *args and **kwargs in a function definition?
A: args collects extra positional arguments into a tuple; kwargs collects extra keyword arguments into a dict. The names are a convention, the stars do the work.
Q: What do * and ** do in a function call?
A: They unpack a sequence into positional arguments and a mapping into keyword arguments.
Q: How do you force callers to pass arguments by keyword?
A: Put a bare * in the parameter list; every parameter after it is keyword-only.
Q: When is a lambda appropriate?
A: For one expression used once inline, for example key= in sorted; never assigned to a name (use def; ruff E731).
Q: What does a closure capture?
A: References to variables of the enclosing scope, not copies of their values; the values are looked up when the inner function runs.
Q: Why do lambdas created in a loop all return the same value, and how do you fix it?
A: Late binding: they all reference the loop variable, which holds its last value when they run. Bind it as a default: lambda x, n=n: ...
Q: What is nonlocal for?
A: To assign to a variable of the enclosing function from an inner function, for example a counter kept in a closure.
Q: Why do wrapper functions use (*args, **kwargs)?
A: To accept any signature and forward it unchanged; decorators and retry helpers are built this way.
Q: When do you use a closure and when a class with state?
A: A closure for one behaviour with captured configuration; a class when you need several methods or state that others must inspect.
```

### 1.9 Type hints I

```
Q: Does Python check type hints at runtime?
A: No: hints are stored in __annotations__ and ignored when the code runs; mypy and the IDE check them, and they do not slow the code down.
Q: Why use type hints in test code?
A: Fixtures and helpers document themselves, `X | None` return types force callers to handle missing data, and CI catches signature drift when the client code changes.
Q: What is the difference between Optional[str] and str | None?
A: None in meaning; str | None is the modern syntax, just as list[str] replaces List[str].
Q: What is the difference between an optional parameter and an Optional type?
A: An optional parameter has a default (n: int = 0); an Optional type allows None as a value (n: int | None).
Q: How do you annotate *parts so that every part must be a str?
A: *parts: str; the tuple is implied.
Q: Why prefer object to Any for "any value"?
A: object keeps type checking on, so you cannot call unknown methods on it; Any switches checking off.
Q: Can you pass an int where a float is annotated?
A: Yes, type checkers treat int as compatible with float; a float does not satisfy an int parameter.
```

### 1.10 Exceptions

```
Q: When do you raise an exception and when do you return None?
A: Raise for invalid input and unrecoverable conditions, with the bad value in the message; return None only for a legitimate "nothing found".
Q: What is the else block in try/except for?
A: Code that runs only when no exception was raised; keeping it out of the try means its own errors are not caught by mistake.
Q: Does finally run after a return inside try?
A: Yes: finally always runs, after success, a handled or unhandled exception, or a return.
Q: Why is a bare `except:` wrong?
A: It catches everything, including KeyboardInterrupt, and hides real bugs like TypeError; catch specific types (ruff E722).
Q: When is `except Exception` acceptable?
A: Only at a top-level boundary such as a CLI main or a test runner: log the full traceback, then re-raise or exit non-zero.
Q: What does `raise NewError(...) from exc` do?
A: It records exc as the cause, so the traceback shows both errors and the root cause is not lost.
Q: How do you read a Python traceback?
A: Bottom-up: the last line gives the type and message, the frame above it the line that raised; go up until you reach your own code.
Q: Why make a custom exception inherit from both your package's base error and a built-in like ValueError?
A: Callers can catch it as your package's error, and existing code that catches ValueError keeps working.
Q: What is the difference between EAFP and LBYL?
A: EAFP tries the operation and handles the exception; LBYL checks conditions first. Python prefers EAFP for files, network and parsing, because the check can be outdated by the time you act.
Q: How do you test that a function raises an exception?
A: with pytest.raises(ValueError, match="..."): call it inside the block; match also checks the message.
```

### 1.11 Debugging I

```
Q: Why do you not see your print output when running pytest?
A: pytest captures stdout and shows it only for failing tests, or for all tests with -s.
Q: What does breakpoint() do?
A: It pauses the program at that line and opens pdb, the standard debugger, in the terminal.
Q: In pdb, how do you print a variable called n?
A: p n; typing n alone runs the "next" command.
Q: What do the pdb commands n, s, r and c do?
A: n runs the next line, s steps into a call, r runs until the current function returns, c continues to the next breakpoint.
Q: When do you use a conditional breakpoint?
A: When the bug appears only for some data, for example status == 503 in a loop over many responses, so the debugger stops only there.
Q: How do you disable all breakpoint() calls for one run?
A: PYTHONBREAKPOINT=0 uv run pytest
Q: Why use logging instead of print in library code?
A: print always writes and pollutes the caller's output; logging has levels, source and timestamps, and stays silent until someone enables it.
Q: How do you debug where there is no IDE, for example in a container?
A: Run the failing case interactively with breakpoint() and pdb, or enable debug logging; no code change should be needed to get more output.
```

### 1.12 Files, pathlib and context managers

```
Q: How should tests find their data files?
A: Relative to the test file, Path(__file__).parent / "data", not to the current working directory, which depends on where pytest was started.
Q: Why pass encoding="utf-8" when opening files?
A: The default depends on the OS and locale, so non-ASCII data fails only on some machines, often in CI.
Q: What does a `with` statement guarantee?
A: The cleanup (__exit__) always runs, after success, an exception or a return.
Q: Does `with` swallow exceptions?
A: No; the exception propagates after cleanup unless __exit__ returns True.
Q: How is `with` related to pytest fixtures with yield?
A: Same idea: setup before yield, cleanup after it, and the cleanup runs even if the test fails.
Q: How do you write your own context manager with @contextmanager?
A: Setup, then `try: yield value` and cleanup in `finally:`; code before yield is the enter part, after it the exit part.
Q: Why is open(path, "w") risky if the program crashes while writing?
A: "w" truncates the file on open, so a crash leaves it empty or half-written.
Q: How do you replace a file atomically?
A: Write to a temp file in the same directory, then os.replace(temp, target).
Q: Why must that temp file be in the target's directory?
A: os.replace is atomic only within one filesystem, and /tmp may be a different one.
Q: What does Path("a") / "/b" return?
A: Path("/b"): an absolute right-hand part replaces everything on the left.
Q: What is the return type of a @contextmanager function that yields a Path?
A: Iterator[Path], from collections.abc.
```

### 1.13 JSON and API payloads

```
Q: What is the difference between json.loads and json.load?
A: loads parses a string ("s" for string); load reads from an open file object. dumps and dump work the same way.
Q: What do JSON null, true and {} become in Python?
A: None, True and a dict with str keys.
Q: How do you tell {"a": null} from {} in a response, and why does it matter?
A: "a" in payload is True only for the first; .get("a") returns None for both. In a PATCH, null often means "clear the field" and absent means "do not change it".
Q: How do you compare two JSON responses while ignoring key order?
A: Parse both and compare the dicts, because dict equality ignores order; for files, dump both with sort_keys=True.
Q: How do you store API response fixtures in a repo?
A: As committed JSON files, one per scenario, written with sort_keys=True and indent=2, so equal data always gives identical, diffable text.
Q: Which common types make json.dumps raise TypeError?
A: datetime, set, Path, Decimal and custom objects.
Q: How do you serialise a datetime, set or Path with json.dumps?
A: Convert first (dt.isoformat(), sorted(items), str(path)) or pass a default= function.
Q: Why is str(payload) not JSON?
A: It is Python's repr: single quotes and True/None instead of true/null. Only json.dumps produces valid JSON.
Q: What is json.JSONDecodeError a subclass of?
A: ValueError; it also carries msg, lineno and colno pointing at the invalid character.
Q: When is Any acceptable in typed code?
A: For JSON values of unknown shape at the boundary, with a comment saying why, until you add a model (TypedDict or Pydantic).
```

(1.14 onwards: headings are added when each lesson is generated)
