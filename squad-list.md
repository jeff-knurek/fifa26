
## Desired UI

Using the json file in ../fifa-extra/worldcup.json/2026/worldcup.squads.json and ../fifa-extra/worldcup.json/2026/worldcup.groups.json and ../fifa-extra/worldcup.json/2026/worldcup.json

I'd like to build a simple web page using SvelteKit to show the data.

The page should have a list of groups A-L (with name of group, i.e. "Group A"), (expandable). Inside each group, it should show the teams in that group as cards in a row (4 teams per row, sort by "points" desc, then goal diff {for minus against}) (see below for example, but use the actual data from the json files).
wins | loss | tie | goals for | against | points

Expand team (show players in a table format (sort by number, asc):
number | pos | name | club.country | club.name

For club.country, try to show the teams flag_icon using the worldcup.teams.json file and mapping fifa_code to club.country. If not found, use the club.country value.

For wins/loss/tie and goals for/against, you can use the data from worldcup.json (match data).

### Example match data from worldcup.json:
```json
{
   "matches": [
      {
        "team1": "QAT",
        "team2": "ECU",
        "score": {"ft": [0, 2]},
        "date": "2026-06-21 19:00"
      },
      {
        "team1": "ENG",
        "team2": "IRN",
        "score": {"ft": [2, 2]},
        "date": "2026-06-21 22:00"
      },
      {
        "team1": "USA",
        "team2": "SEN",
        "date": "2026-06-24 22:00"
      },
      ...
   ]
}
```
Where ECU gets Win (3), QAT gets loss (0)
Goals For: ECU (2), QAT (0)
Goals Against: ECU (0), QAT (2)
ENG and IRN gets Tie (1)
Goals For: ENG (2), IRN (2)
Goals Against: ENG (2), IRN (2)
USA/SEN haven't played yet so no stats to increment.
For teams that haven't played yet, their stats should be 0. It should be sorted based on points desc, then goal diff {for minus against}, then team name asc.

## Data Mapping

Groups: worldcup.groups.json
Teams: worldcup.squads.json
Players: worldcup.squads.json
Teams Info: worldcup.teams.json
Match data: worldcup.json


## TODO

- review for any boilerplate
make sure that when using sv create, the web/vite.config.js has the right build config for a hobby project in vercel.
- Fix the JSON data path if needed
Current local dev resolve('../../../fifa-extra/worldcup.json/2026'). These instead need to point to: https://github.com/openfootball/worldcup.json/tree/master/2026 as the source of truth. It can be something that they poll on page load, or it can be something that runs once a data and updates (re-use the cron from vercel.json). Preference is pull on demand if possible.
- deployment config
The web/ subdirectory needs to be included in the root vercel.json. Alternative is using two separate Vercel projects, one for the web/ and one for the cron job. Preference: put everything in the web/ project if possible.
- warning in code:
export function load() {
	const dataDir = resolve('../../fifa-extra/worldcup.json/2026');
- add a different section for the matches after group
Once the group matches are done, a tournament style UI would be nice to display
