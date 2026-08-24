# UI Before the `material-ui` Redesign

Captured from `main` immediately before merging the `material-ui` branch, for
reference. This is what the app looked like before the header/map/boarding-pass
rework, the neutral-teal theme pass, and the superadmin user-delete feature.

## Login

Google / Guest / Demo Mode / Super User Login. No corner superadmin shield
entry point yet — that was added on `material-ui`.

![Login](ui-before-redesign/01-login.png)

## Trips Home — Empty State

![Trips home, empty](ui-before-redesign/02-trips-home-empty.png)

## Trips Home — With a Trip

![Trips home, populated](ui-before-redesign/02-trips-home-populated.png)

## App Settings

Flat list, no superadmin gating on Database Backups / Seed Demo Data / Clear
All Data — any signed-in user could see and use them here. `material-ui`
restricts those three to superadmin.

![Settings](ui-before-redesign/03-settings.png)

## Trip Dashboard — Expenses / Balances

Plain list layout: search bar, category/member filter chips, day-grouped
expense list, Suggested Settlements, Member & Group Balances. No live map
backdrop, no draggable sheet, no boarding-pass balance card — those are all
`material-ui` additions.

![Expenses and balances](ui-before-redesign/04-trip-expenses-balances.png)

## Members & Groups

![Members and groups](ui-before-redesign/05-members-groups.png)

## Analytics

![Analytics](ui-before-redesign/06-analytics.png)
