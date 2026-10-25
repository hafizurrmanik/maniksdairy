# My Life OS — core build

Local-only personal manager in plain HTML, CSS and vanilla JavaScript. Records live in your browser's IndexedDB; nothing is sent anywhere and no library is loaded from the internet.

## Run

```
cd my-life-os
python3 -m http.server 8000
```
Then open http://localhost:8000. Always use the same address, because browser storage is tied to it. Opening `index.html` directly may also work, but storage behaviour differs between browsers.

## Included

- Dashboard: today / week / month hours, month expenses, estimated earnings, weekly-limit status
- Work hours: workplaces with hourly wage, shifts (overnight, unpaid breaks, manual hour override, cancelled and absent excluded, overlap warning), Monday-start weekly view with previous/next, configurable weekly limit (default 28 h)
- Expenses: monthly list, category totals, delete
- English and বাংলা interface, light and dark theme
- Backup to a JSON file and all-or-nothing restore
- Print / Save as PDF through the browser (uses system fonts, so Bengali prints correctly)

## Not built yet

Salary, debts, diary, study and career, documents, reminders, goals and habits, memories, attachments, editing existing records, wage history by date, archiving workplaces, budgets and savings, built-in PDF export, ZIP backup with attachments, global search.

## Limits

- Browser storage is not encrypted. Turn on FileVault and keep a separate copy of your backups.
- Estimated earnings are hours × wage only. They are not salary, payroll or tax figures and are never added to income.
- The weekly-limit panel is informational, not a legal determination. Check immigration rules and school vacation conditions separately.
- This build has not been run in a browser yet, so none of it is verified by testing.
