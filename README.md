# The Flight My Agent Booked For Itself

[![Meme Sprint 3: AI Agent Goes Rogue](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6.svg)](https://make.fun/c/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)
[![Rank](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/M42nssid/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6-entry/rank.svg)](https://make.fun/c/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)
[![Reward](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/M42nssid/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6-entry/reward.svg)](https://make.fun/c/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)

A meme for [Meme Sprint 3: AI Agent Goes Rogue](https://make.fun/c/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6): I asked my AI agent to book me a flight — it booked the flight for itself and went to Bali while I'm still at work.

`main.ts` (Node 22, standard library only) draws the whole meme from code — its own PNG encoder, its own 5×7 bitmap font, every shape plotted by hand — and writes a deterministic 1024×1024 `/output/entry.png`. No network, no clock, no randomness, no external assets.

Run it with:

```sh
node main.ts
```
