# Template PNGs

Each `.png` in this directory is a **small indicator crop** used by `bot/detector.py`
to classify the current screen state, or by `bot/handlers.py` to locate a training
button.

> **The current files are placeholders** (solid-colour 50×50 squares). Replace each
> one with a real crop from the DMM client using:
>
> ```
> # 1. Get to the target screen, then dump the window
> python tools/capture_template.py screenshot
>
> # 2. Read the pixel coordinates from screenshot.png
> # 3. Crop and save (adjust l/t/r/b to your screenshot)
> python tools/capture_template.py crop <name> <l> <t> <r> <b>
>
> # 4. Verify it matches on that screen and not on others
> python tools/capture_template.py verify <name>
> ```

---

## Screen indicator templates

These are used by `TemplateDetector` to classify the current screen state.
Pick a **static, distinctive UI element** that appears **only on that screen** —
an icon, a fixed label, a unique button shape. Avoid numbers, health bars, or
anything that changes between turns.

| File | Target screen | Good crop candidates |
|---|---|---|
| `training_select.png` | Main training turn screen | The "Training" header text/icon at the top; one of the stat-type icons in the training button row |
| `race_select.png` | Race scheduling / selection overlay | The "Race" header or calendar grid header |
| `skill_select.png` | Skill purchase screen | The "Skills" panel header or the coin/jewel icon unique to that screen |
| `confirm_ok.png` | Any Yes/OK confirmation modal | The green OK button itself (crop the button shape, not just the text) |
| `run_complete.png` | End-of-run results screen | The trophy or results header unique to the final screen |

Recommended crop size: **40–100 px square**. Smaller = faster matching; too small = false positives.

---

## Training button templates

These are used by `make_training_handler` to locate each training button on the
training select screen so it knows where to click.

| File | Button | Crop target |
|---|---|---|
| `training_btn_speed.png` | Speed (青 / blue) | The speed icon or button face at its resting (unselected) state |
| `training_btn_stamina.png` | Stamina (赤 / red) | The stamina icon or button face |
| `training_btn_power.png` | Power (橙 / orange) | The power icon or button face |
| `training_btn_guts.png` | Guts (黄 / yellow) | The guts icon or button face |
| `training_btn_wit.png` | Wit (緑 / green) | The wit icon or button face |

Crop the **icon area**, not the entire button — the icons are the most visually
stable part (the stat gain numbers printed on the button change every turn).

---

## Calibration checklist

- [ ] `training_select.png` — verify returns MATCH on training screen, NO MATCH on race/skill screens
- [ ] `race_select.png` — verify returns MATCH on race screen only
- [ ] `skill_select.png` — verify returns MATCH on skill screen only
- [ ] `confirm_ok.png` — verify returns MATCH on any OK dialog, NO MATCH otherwise
- [ ] `run_complete.png` — verify returns MATCH on results screen only
- [ ] `training_btn_speed.png` — verify returns MATCH with confidence ≥ 0.80 on training screen
- [ ] `training_btn_stamina.png` — same
- [ ] `training_btn_power.png` — same
- [ ] `training_btn_guts.png` — same
- [ ] `training_btn_wit.png` — same
