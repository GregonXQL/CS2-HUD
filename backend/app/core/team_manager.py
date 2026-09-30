from app.core.normalizer import obj
from app.models.teams import TeamSettings


class TeamManager:
    def __init__(self, settings: TeamSettings):
        self.settings = settings
        self.rosters = {'A': set(), 'B': set()}
        self.last_sides = {}

    def reset(self):
        self.rosters = {'A': set(), 'B': set()}
        self.last_sides = {}

    def swap(self):
        self.settings = self.settings.model_copy(update={'a_side': 'T' if self.settings.a_side == 'CT' else 'CT'})
        # Retain manual correction until an actual roster side transition occurs.

    def update(self, raw):
        players = obj(raw.get('allplayers'))
        sides = {sid: p.get('team') for sid, p in players.items() if isinstance(p, dict) and p.get('team') in ('CT', 'T')}
        if not sides or obj(raw.get('map')).get('phase') != 'live':
            return
        if not self.rosters['A'] and not self.rosters['B']:
            self.settings = self.settings.model_copy(update={'a_side': 'CT'})
            self.rosters = {slot: {sid for sid, side in sides.items() if side == target}
                            for slot, target in [('A', 'CT'), ('B', 'T')]}
        elif self.settings.auto_swap and sides != self.last_sides:
            counts = {side: sum(sides.get(sid) == side for sid in self.rosters['A']) for side in ('CT', 'T')}
            for side, count in counts.items():
                if count >= 3:
                    self.settings = self.settings.model_copy(update={'a_side': side})
                    break
        known = self.rosters['A'] | self.rosters['B']
        for sid, side in sides.items():
            if sid not in known:
                self.rosters['A' if side == self.settings.a_side else 'B'].add(sid)
        self.last_sides = sides

    def counts(self):
        return {key: len(value) for key, value in self.rosters.items()}
